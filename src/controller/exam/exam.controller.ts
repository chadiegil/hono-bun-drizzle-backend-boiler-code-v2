import { Context } from 'hono'
import { z } from 'zod'
import { ExamService } from '../../service/exam/exam.service'
import { canCreateExam, canEditExam, canDeleteExam } from '../../middleware/rbac.middleware'

// Validation schemas
export const createExamSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  slug: z
    .string()
    .min(1)
    .max(500)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  categoryId: z.number().optional(),
  type: z.enum(['practice', 'mock', 'timed', 'adaptive']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'mixed']),
  isPublic: z.boolean().default(false),
  isTemplate: z.boolean().default(false),
  instructions: z.string().optional(),
  passingScore: z.number().min(0).max(100).default(70),
  duration: z.number().min(1).optional(), // minutes
  randomizeQuestions: z.boolean().default(false),
  randomizeOptions: z.boolean().default(false),
  showAnswersAfter: z.enum(['immediately', 'after_submit', 'never']).default('after_submit'),
  allowReview: z.boolean().default(true),
  attemptsAllowed: z.number().min(1).optional(), // null = unlimited
  shuffleQuestionPool: z.boolean().default(false),
  questionPoolSize: z.number().min(1).optional()
})

export const updateExamSchema = createExamSchema.partial()

export const addQuestionsSchema = z.object({
  questionIds: z.array(z.number()).min(1, 'Must provide at least one question ID')
})

export class ExamController {
  /**
   * Create a new exam
   * POST /api/exams
   */
  static async create(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const body = await c.req.json()
      const validatedData = createExamSchema.parse(body)

      // Check permissions
      const hasPermission = await canCreateExam(user, validatedData.categoryId)
      if (!hasPermission) {
        return c.json(
          {
            success: false,
            message: 'Forbidden: You do not have permission to create exams in this category'
          },
          403
        )
      }

      const exam = await ExamService.createExam({
        ...validatedData,
        createdBy: user.id
      })

      return c.json(
        {
          success: true,
          message: 'Exam created successfully',
          data: exam
        },
        201
      )
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return c.json(
          {
            success: false,
            message: 'Validation error',
            errors: error.errors
          },
          400
        )
      }

      // Check for unique constraint violation (slug must be unique)
      if (error.code === '23505') {
        return c.json(
          {
            success: false,
            message: 'Exam slug already exists'
          },
          409
        )
      }

      return c.json(
        {
          success: false,
          message: error.message || 'Failed to create exam'
        },
        500
      )
    }
  }

  /**
   * Get all exams with filters
   * GET /api/exams
   */
  static async getAll(c: Context) {
    try {
      const filters = {
        type: c.req.query('type'),
        difficulty: c.req.query('difficulty'),
        categoryId: c.req.query('categoryId') ? parseInt(c.req.query('categoryId')!) : undefined,
        isPublic: c.req.query('isPublic') ? c.req.query('isPublic') === 'true' : undefined,
        isPublished: c.req.query('isPublished')
          ? c.req.query('isPublished') === 'true'
          : undefined,
        createdBy: c.req.query('createdBy') ? parseInt(c.req.query('createdBy')!) : undefined,
        page: c.req.query('page') ? parseInt(c.req.query('page')!) : 1,
        limit: c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20
      }

      const result = await ExamService.getExams(filters)

      return c.json({
        success: true,
        ...result
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to fetch exams'
        },
        500
      )
    }
  }

  /**
   * Get single exam by ID
   * GET /api/exams/:id
   */
  static async getById(c: Context) {
    try {
      const id = parseInt(c.req.param('id'))

      const exam = await ExamService.getExamById(id)

      if (!exam) {
        return c.json(
          {
            success: false,
            message: 'Exam not found'
          },
          404
        )
      }

      return c.json({
        success: true,
        data: exam
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to fetch exam'
        },
        500
      )
    }
  }

  /**
   * Update exam
   * PUT /api/exams/:id
   */
  static async update(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const id = parseInt(c.req.param('id'))
      const body = await c.req.json()

      // Check if exam exists and user has permission
      const existingExam = await ExamService.getExamById(id)
      if (!existingExam) {
        return c.json({ success: false, message: 'Exam not found' }, 404)
      }

      if (existingExam.createdBy !== user.id) {
        return c.json({ success: false, message: 'Forbidden: You can only edit your own exams' }, 403)
      }

      const validatedData = updateExamSchema.parse(body)

      const exam = await ExamService.updateExam(id, validatedData)

      return c.json({
        success: true,
        message: 'Exam updated successfully',
        data: exam
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return c.json(
          {
            success: false,
            message: 'Validation error',
            errors: error.errors
          },
          400
        )
      }

      return c.json(
        {
          success: false,
          message: error.message || 'Failed to update exam'
        },
        500
      )
    }
  }

  /**
   * Delete exam (soft delete)
   * DELETE /api/exams/:id
   */
  static async delete(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const id = parseInt(c.req.param('id'))

      // Check if exam exists and user has permission
      const existingExam = await ExamService.getExamById(id)
      if (!existingExam) {
        return c.json({ success: false, message: 'Exam not found' }, 404)
      }

      if (existingExam.createdBy !== user.id) {
        return c.json({ success: false, message: 'Forbidden: You can only delete your own exams' }, 403)
      }

      await ExamService.deleteExam(id)

      return c.json({
        success: true,
        message: 'Exam deleted successfully'
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to delete exam'
        },
        500
      )
    }
  }

  /**
   * Publish exam
   * POST /api/exams/:id/publish
   */
  static async publish(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const id = parseInt(c.req.param('id'))

      // Check if exam exists and user has permission
      const existingExam = await ExamService.getExamById(id)
      if (!existingExam) {
        return c.json({ success: false, message: 'Exam not found' }, 404)
      }

      if (existingExam.createdBy !== user.id) {
        return c.json({ success: false, message: 'Forbidden: You can only publish your own exams' }, 403)
      }

      const exam = await ExamService.publishExam(id)

      return c.json({
        success: true,
        message: 'Exam published successfully',
        data: exam
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to publish exam'
        },
        500
      )
    }
  }

  /**
   * Add questions to exam
   * POST /api/exams/:id/questions
   */
  static async addQuestions(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const id = parseInt(c.req.param('id'))
      const body = await c.req.json()

      // Check if exam exists and user has permission
      const existingExam = await ExamService.getExamById(id)
      if (!existingExam) {
        return c.json({ success: false, message: 'Exam not found' }, 404)
      }

      if (existingExam.createdBy !== user.id) {
        return c.json(
          { success: false, message: 'Forbidden: You can only modify your own exams' },
          403
        )
      }

      const validatedData = addQuestionsSchema.parse(body)

      const result = await ExamService.addQuestionsToExam(id, validatedData.questionIds)

      return c.json({
        success: true,
        message: `Added ${result.added} questions to exam`,
        data: result
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return c.json(
          {
            success: false,
            message: 'Validation error',
            errors: error.errors
          },
          400
        )
      }

      return c.json(
        {
          success: false,
          message: error.message || 'Failed to add questions to exam'
        },
        500
      )
    }
  }

  /**
   * Remove question from exam
   * DELETE /api/exams/:id/questions/:questionId
   */
  static async removeQuestion(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const id = parseInt(c.req.param('id'))
      const questionId = parseInt(c.req.param('questionId'))

      // Check if exam exists and user has permission
      const existingExam = await ExamService.getExamById(id)
      if (!existingExam) {
        return c.json({ success: false, message: 'Exam not found' }, 404)
      }

      if (existingExam.createdBy !== user.id) {
        return c.json(
          { success: false, message: 'Forbidden: You can only modify your own exams' },
          403
        )
      }

      await ExamService.removeQuestionFromExam(id, questionId)

      return c.json({
        success: true,
        message: 'Question removed from exam successfully'
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to remove question from exam'
        },
        500
      )
    }
  }

  /**
   * Get exam questions
   * GET /api/exams/:id/questions
   */
  static async getQuestions(c: Context) {
    try {
      const id = parseInt(c.req.param('id'))

      const questions = await ExamService.getExamQuestions(id)

      return c.json({
        success: true,
        data: questions
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to fetch exam questions'
        },
        500
      )
    }
  }

  /**
   * Get exam preview (without questions)
   * GET /api/exams/:id/preview
   */
  static async getPreview(c: Context) {
    try {
      const id = parseInt(c.req.param('id'))

      const preview = await ExamService.getExamPreview(id)

      return c.json({
        success: true,
        data: preview
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to fetch exam preview'
        },
        500
      )
    }
  }
}
