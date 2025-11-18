import { Context } from 'hono'
import { z } from 'zod'
import { AttemptService } from '../../service/attempt/attempt.service'

// Metadata interface
interface RequestMetadata {
  ipAddress?: string
  userAgent?: string
  [key: string]: any
}

// Validation schemas
export const startAttemptSchema = z.object({
  metadata: z
    .object({
      ipAddress: z.string().optional(),
      userAgent: z.string().optional()
    })
    .passthrough()
    .optional()
})

// Base answer schema with common fields
const baseAnswerSchema = z.object({
  questionId: z.number(),
  timeSpent: z.number().optional(),
  markedForReview: z.boolean().default(false)
})

// Multiple choice / True-False answer (single selection)
const singleChoiceAnswerSchema = baseAnswerSchema.extend({
  selectedOptionId: z.number()
})

// Multiple answer (multiple selections)
const multipleAnswerSchema = baseAnswerSchema.extend({
  selectedOptionIds: z.array(z.number()).min(1, 'Must select at least one option')
})

// Essay / Fill in blank answer
const textAnswerSchema = baseAnswerSchema.extend({
  textAnswer: z.string().min(1, 'Answer cannot be empty')
})

// Union type for all answer types
export const submitAnswerSchema = z.discriminatedUnion('answerType', [
  z.object({
    answerType: z.literal('single_choice'),
    ...singleChoiceAnswerSchema.shape
  }),
  z.object({
    answerType: z.literal('multiple_answer'),
    ...multipleAnswerSchema.shape
  }),
  z.object({
    answerType: z.literal('text'),
    ...textAnswerSchema.shape
  })
])

export class AttemptController {
  /**
   * Start a new exam attempt
   * POST /api/exams/:id/start
   */
  static async startAttempt(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const examId = parseInt(c.req.param('id'))

      // Parse optional metadata
      let metadata: RequestMetadata = {}
      try {
        const body = await c.req.json()
        const validatedData = startAttemptSchema.parse(body)
        metadata = validatedData.metadata || {}
      } catch {
        // Body is optional, use empty metadata if not provided
      }

      // Add request metadata
      const requestMetadata: RequestMetadata = {
        ...metadata,
        ipAddress: metadata.ipAddress || c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
        userAgent: metadata.userAgent || c.req.header('user-agent'),
        startedAt: new Date().toISOString()
      }

      const result = await AttemptService.startAttempt({
        examId,
        userId: user.id,
        metadata: requestMetadata
      })

      return c.json(
        {
          success: true,
          message: 'Exam attempt started successfully',
          data: result
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

      return c.json(
        {
          success: false,
          message: error.message || 'Failed to start exam attempt'
        },
        500
      )
    }
  }

  /**
   * Get attempt details
   * GET /api/attempts/:id
   */
  static async getAttemptById(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const id = parseInt(c.req.param('id'))

      const attempt = await AttemptService.getAttemptById(id)

      if (!attempt) {
        return c.json({ success: false, message: 'Attempt not found' }, 404)
      }

      // Verify user owns this attempt
      if (attempt.userId !== user.id) {
        return c.json(
          { success: false, message: 'Forbidden: You can only view your own attempts' },
          403
        )
      }

      return c.json({
        success: true,
        data: attempt
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to fetch attempt'
        },
        500
      )
    }
  }

  /**
   * Submit answer for a question
   * POST /api/attempts/:id/answer
   */
  static async submitAnswer(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const attemptId = parseInt(c.req.param('id'))

      // Verify attempt exists and user owns it
      const attempt = await AttemptService.getAttemptById(attemptId)
      if (!attempt) {
        return c.json({ success: false, message: 'Attempt not found' }, 404)
      }

      if (attempt.userId !== user.id) {
        return c.json(
          { success: false, message: 'Forbidden: You can only submit answers for your own attempts' },
          403
        )
      }

      const body = await c.req.json()
      const validatedData = submitAnswerSchema.parse(body)

      // Extract answer data based on type
      let answerData: any = {
        attemptId,
        questionId: validatedData.questionId,
        timeSpent: validatedData.timeSpent,
        markedForReview: validatedData.markedForReview
      }

      if (validatedData.answerType === 'single_choice') {
        answerData.selectedOptionId = validatedData.selectedOptionId
      } else if (validatedData.answerType === 'multiple_answer') {
        answerData.selectedOptionIds = validatedData.selectedOptionIds
      } else if (validatedData.answerType === 'text') {
        answerData.textAnswer = validatedData.textAnswer
      }

      const result = await AttemptService.submitAnswer(answerData)

      return c.json({
        success: true,
        message: 'Answer submitted successfully',
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
          message: error.message || 'Failed to submit answer'
        },
        500
      )
    }
  }

  /**
   * Submit exam (complete the attempt)
   * POST /api/attempts/:id/submit
   */
  static async submitExam(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const attemptId = parseInt(c.req.param('id'))

      // Verify attempt exists and user owns it
      const attempt = await AttemptService.getAttemptById(attemptId)
      if (!attempt) {
        return c.json({ success: false, message: 'Attempt not found' }, 404)
      }

      if (attempt.userId !== user.id) {
        return c.json(
          { success: false, message: 'Forbidden: You can only submit your own attempts' },
          403
        )
      }

      const result = await AttemptService.submitExam(attemptId)

      return c.json({
        success: true,
        message: 'Exam submitted successfully',
        data: result
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to submit exam'
        },
        500
      )
    }
  }

  /**
   * Get attempt results
   * GET /api/attempts/:id/results
   */
  static async getResults(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const attemptId = parseInt(c.req.param('id'))

      const results = await AttemptService.getAttemptResults(attemptId, user.id)

      return c.json({
        success: true,
        data: results
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to fetch attempt results'
        },
        500
      )
    }
  }

  /**
   * Get current user's attempts history
   * GET /api/users/me/attempts
   */
  static async getUserAttempts(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const filters = {
        examId: c.req.query('examId') ? parseInt(c.req.query('examId')!) : undefined,
        status: c.req.query('status'),
        page: c.req.query('page') ? parseInt(c.req.query('page')!) : 1,
        limit: c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20
      }

      const result = await AttemptService.getUserAttempts(user.id, filters)

      return c.json({
        success: true,
        ...result
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to fetch user attempts'
        },
        500
      )
    }
  }

  /**
   * Abandon attempt (mark as abandoned when user leaves)
   * POST /api/attempts/:id/abandon
   */
  static async abandonAttempt(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const attemptId = parseInt(c.req.param('id'))

      // Verify attempt exists and user owns it
      const attempt = await AttemptService.getAttemptById(attemptId)
      if (!attempt) {
        return c.json({ success: false, message: 'Attempt not found' }, 404)
      }

      if (attempt.userId !== user.id) {
        return c.json(
          { success: false, message: 'Forbidden: You can only abandon your own attempts' },
          403
        )
      }

      // Only abandon if still in progress
      if (attempt.status === 'in_progress') {
        const result = await AttemptService.abandonAttempt(attemptId)
        return c.json({
          success: true,
          message: 'Attempt abandoned',
          data: result
        })
      }

      return c.json({
        success: true,
        message: 'Attempt already completed or abandoned'
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to abandon attempt'
        },
        500
      )
    }
  }
}
