import { Context } from 'hono'
import { z } from 'zod'
import { ReviewService } from '../../service/review/review.service'

// Validation schemas
export const reviewQuestionSchema = z.object({
  notes: z.string().optional()
})

export const rejectQuestionSchema = z.object({
  notes: z.string().min(10, 'Rejection notes must be at least 10 characters')
})

export const bulkApproveSchema = z.object({
  questionIds: z.array(z.number()).min(1, 'Must provide at least one question ID'),
  notes: z.string().optional()
})

export const bulkRejectSchema = z.object({
  questionIds: z.array(z.number()).min(1, 'Must provide at least one question ID'),
  notes: z.string().min(10, 'Rejection notes must be at least 10 characters')
})

export class ReviewController {
  /**
   * Submit question for review
   * PUT /api/questions/:id/submit-review
   */
  static async submitForReview(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const questionId = parseInt(c.req.param('id'))

      const question = await ReviewService.submitForReview({
        questionId,
        userId: user.id
      })

      return c.json({
        success: true,
        message: 'Question submitted for review successfully',
        data: question
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to submit question for review'
        },
        500
      )
    }
  }

  /**
   * Approve a question
   * PUT /api/questions/:id/approve
   */
  static async approveQuestion(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const questionId = parseInt(c.req.param('id'))
      const body = await c.req.json()
      const validatedData = reviewQuestionSchema.parse(body)

      const question = await ReviewService.approveQuestion({
        questionId,
        reviewerId: user.id,
        status: 'approved',
        notes: validatedData.notes
      })

      return c.json({
        success: true,
        message: 'Question approved successfully',
        data: question
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
          message: error.message || 'Failed to approve question'
        },
        500
      )
    }
  }

  /**
   * Reject a question
   * PUT /api/questions/:id/reject
   */
  static async rejectQuestion(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const questionId = parseInt(c.req.param('id'))
      const body = await c.req.json()
      const validatedData = rejectQuestionSchema.parse(body)

      const question = await ReviewService.rejectQuestion({
        questionId,
        reviewerId: user.id,
        status: 'rejected',
        notes: validatedData.notes
      })

      return c.json({
        success: true,
        message: 'Question rejected successfully',
        data: question
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
          message: error.message || 'Failed to reject question'
        },
        500
      )
    }
  }

  /**
   * Bulk approve questions
   * POST /api/questions/bulk-approve
   */
  static async bulkApprove(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const body = await c.req.json()
      const validatedData = bulkApproveSchema.parse(body)

      const questions = await ReviewService.bulkApprove(
        validatedData.questionIds,
        user.id,
        validatedData.notes
      )

      return c.json({
        success: true,
        message: `${questions.length} question(s) approved successfully`,
        data: questions
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
          message: error.message || 'Failed to bulk approve questions'
        },
        500
      )
    }
  }

  /**
   * Bulk reject questions
   * POST /api/questions/bulk-reject
   */
  static async bulkReject(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const body = await c.req.json()
      const validatedData = bulkRejectSchema.parse(body)

      const questions = await ReviewService.bulkReject(
        validatedData.questionIds,
        user.id,
        validatedData.notes
      )

      return c.json({
        success: true,
        message: `${questions.length} question(s) rejected successfully`,
        data: questions
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
          message: error.message || 'Failed to bulk reject questions'
        },
        500
      )
    }
  }

  /**
   * Get pending review queue
   * GET /api/questions/pending-review
   */
  static async getPendingReview(c: Context) {
    try {
      const filters = {
        categoryId: c.req.query('categoryId') ? parseInt(c.req.query('categoryId')!) : undefined,
        createdBy: c.req.query('createdBy') ? parseInt(c.req.query('createdBy')!) : undefined,
        page: c.req.query('page') ? parseInt(c.req.query('page')!) : 1,
        limit: c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20
      }

      const result = await ReviewService.getPendingReviewQueue(filters)

      return c.json({
        success: true,
        ...result
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to fetch pending review queue'
        },
        500
      )
    }
  }

  /**
   * Get questions by status
   * GET /api/questions/by-status/:status
   */
  static async getByStatus(c: Context) {
    try {
      const status = c.req.param('status')
      const validStatuses = ['draft', 'pending_review', 'approved', 'rejected']

      if (!validStatuses.includes(status)) {
        return c.json(
          {
            success: false,
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
          },
          400
        )
      }

      const filters = {
        categoryId: c.req.query('categoryId') ? parseInt(c.req.query('categoryId')!) : undefined,
        createdBy: c.req.query('createdBy') ? parseInt(c.req.query('createdBy')!) : undefined,
        page: c.req.query('page') ? parseInt(c.req.query('page')!) : 1,
        limit: c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20
      }

      const result = await ReviewService.getQuestionsByStatus(status, filters)

      return c.json({
        success: true,
        ...result
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to fetch questions'
        },
        500
      )
    }
  }

  /**
   * Get review statistics
   * GET /api/questions/review-stats
   */
  static async getReviewStats(c: Context) {
    try {
      const user = c.get('user')
      const userId = c.req.query('userId') ? parseInt(c.req.query('userId')!) : undefined

      // Regular users can only see their own stats
      // Moderators can see anyone's stats
      let statsUserId = undefined
      if (user.role === 'user') {
        statsUserId = user.id
      } else if (userId) {
        statsUserId = userId
      }

      const stats = await ReviewService.getReviewStats(statsUserId)

      return c.json({
        success: true,
        data: stats
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to fetch review statistics'
        },
        500
      )
    }
  }
}
