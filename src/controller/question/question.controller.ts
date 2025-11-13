import { Context } from 'hono'
import { z } from 'zod'
import { QuestionService } from '../../service/question/question.service'
import {
  canCreateQuestion,
  canEditQuestion,
  canDeleteQuestion
} from '../../middleware/rbac.middleware'

const questionOptionSchema = z.object({
  optionText: z.string().min(1),
  isCorrect: z.boolean(),
  order: z.number(),
  explanation: z.string().optional(),
  imageUrl: z.string().url().optional()
})

export const createQuestionSchema = z.object({
  questionText: z.string().min(1),
  questionType: z.enum(['multiple_choice', 'true_false', 'essay', 'fill_blank', 'multiple_answer']),
  categoryId: z.number().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'mixed']),
  points: z.number().default(1),
  explanation: z.string().optional(),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().default(false),
  options: z.array(questionOptionSchema)
})

export const updateQuestionSchema = createQuestionSchema.partial()

export class QuestionController {
  static async create(c: Context) {
    try {
      const user = c.get('user')
      const body = await c.req.json()
      const validatedData = createQuestionSchema.parse(body)

      // Check permissions
      const hasPermission = await canCreateQuestion(user, validatedData.categoryId)
      if (!hasPermission) {
        return c.json(
          {
            success: false,
            message: 'Forbidden: You do not have permission to create questions in this category'
          },
          403
        )
      }

      const question = await QuestionService.createQuestion({
        ...validatedData,
        createdBy: user.id
      })

      return c.json({ success: true, message: 'Question created successfully', data: question }, 201)
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return c.json({ success: false, message: 'Validation error', errors: error.errors }, 400)
      }
      return c.json({ success: false, message: error.message || 'Failed to create question' }, 500)
    }
  }

  static async getAll(c: Context) {
    try {
      const filters = {
        categoryId: c.req.query('categoryId') ? parseInt(c.req.query('categoryId')!) : undefined,
        difficulty: c.req.query('difficulty'),
        questionType: c.req.query('questionType'),
        isPublic: c.req.query('isPublic') ? c.req.query('isPublic') === 'true' : undefined,
        search: c.req.query('search'),
        page: c.req.query('page') ? parseInt(c.req.query('page')!) : 1,
        limit: c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20
      }

      const result = await QuestionService.getQuestions(filters)
      return c.json({ success: true, ...result })
    } catch (error: any) {
      return c.json({ success: false, message: error.message }, 500)
    }
  }

  static async getById(c: Context) {
    try {
      const id = parseInt(c.req.param('id'))
      const question = await QuestionService.getQuestionById(id)

      if (!question) {
        return c.json({ success: false, message: 'Question not found' }, 404)
      }

      return c.json({ success: true, data: question })
    } catch (error: any) {
      return c.json({ success: false, message: error.message }, 500)
    }
  }

  static async update(c: Context) {
    try {
      const user = c.get('user')
      const id = parseInt(c.req.param('id'))
      const body = await c.req.json()
      const validatedData = updateQuestionSchema.parse(body)

      // Get existing question to check permissions
      const existing = await QuestionService.getQuestionById(id)
      if (!existing) {
        return c.json({ success: false, message: 'Question not found' }, 404)
      }

      // Check permissions
      const hasPermission = await canEditQuestion(user, {
        createdBy: existing.createdBy,
        categoryId: existing.categoryId
      })
      if (!hasPermission) {
        return c.json(
          {
            success: false,
            message: 'Forbidden: You do not have permission to edit this question'
          },
          403
        )
      }

      const question = await QuestionService.updateQuestion(id, validatedData)
      return c.json({ success: true, message: 'Question updated successfully', data: question })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return c.json({ success: false, message: 'Validation error', errors: error.errors }, 400)
      }
      return c.json({ success: false, message: error.message }, 500)
    }
  }

  static async delete(c: Context) {
    try {
      const user = c.get('user')
      const id = parseInt(c.req.param('id'))

      // Get existing question to check permissions
      const existing = await QuestionService.getQuestionById(id)
      if (!existing) {
        return c.json({ success: false, message: 'Question not found' }, 404)
      }

      // Check permissions
      const hasPermission = await canDeleteQuestion(user, {
        createdBy: existing.createdBy,
        categoryId: existing.categoryId
      })
      if (!hasPermission) {
        return c.json(
          {
            success: false,
            message: 'Forbidden: You do not have permission to delete this question'
          },
          403
        )
      }

      await QuestionService.deleteQuestion(id)
      return c.json({ success: true, message: 'Question deleted successfully' })
    } catch (error: any) {
      return c.json({ success: false, message: error.message }, 500)
    }
  }

  static async search(c: Context) {
    try {
      const query = c.req.query('q') || ''
      const limit = parseInt(c.req.query('limit') || '10')
      const results = await QuestionService.searchQuestions(query, limit)
      return c.json({ success: true, data: results })
    } catch (error: any) {
      return c.json({ success: false, message: error.message }, 500)
    }
  }
}
