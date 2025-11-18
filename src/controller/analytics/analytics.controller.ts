import { Context } from 'hono'
import { AnalyticsService } from '../../service/analytics/analytics.service'
import { z } from 'zod'

export class AnalyticsController {
  /**
   * Get user performance metrics
   * GET /api/analytics/user/performance
   * Query params: dateFrom, dateTo (optional)
   */
  static async getUserPerformance(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const dateFrom = c.req.query('dateFrom')
      const dateTo = c.req.query('dateTo')

      const metrics = await AnalyticsService.getUserPerformance(
        user.id,
        dateFrom ? new Date(dateFrom) : undefined,
        dateTo ? new Date(dateTo) : undefined
      )

      return c.json({
        success: true,
        message: 'User performance metrics retrieved successfully',
        data: metrics
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to retrieve user performance metrics'
        },
        500
      )
    }
  }

  /**
   * Get category performance for user
   * GET /api/analytics/user/categories
   */
  static async getCategoryPerformance(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const categoryPerformance = await AnalyticsService.getCategoryPerformance(user.id)

      return c.json({
        success: true,
        message: 'Category performance retrieved successfully',
        data: categoryPerformance
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to retrieve category performance'
        },
        500
      )
    }
  }

  /**
   * Get weakest topics for user
   * GET /api/analytics/user/weakest-topics
   */
  static async getWeakestTopics(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const limit = parseInt(c.req.query('limit') || '5')

      const weakestTopics = await AnalyticsService.getWeakestTopics(user.id, limit)

      return c.json({
        success: true,
        message: 'Weakest topics retrieved successfully',
        data: weakestTopics
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to retrieve weakest topics'
        },
        500
      )
    }
  }

  /**
   * Get strongest topics for user
   * GET /api/analytics/user/strongest-topics
   */
  static async getStrongestTopics(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const limit = parseInt(c.req.query('limit') || '5')

      const strongestTopics = await AnalyticsService.getStrongestTopics(user.id, limit)

      return c.json({
        success: true,
        message: 'Strongest topics retrieved successfully',
        data: strongestTopics
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to retrieve strongest topics'
        },
        500
      )
    }
  }

  /**
   * Get user progress over time
   * GET /api/analytics/user/progress
   * Query params: period (day|week|month, default: week)
   */
  static async getProgressOverTime(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const periodType = c.req.query('period') as 'day' | 'week' | 'month' || 'week'

      if (!['day', 'week', 'month'].includes(periodType)) {
        return c.json(
          {
            success: false,
            message: 'Invalid period type. Must be day, week, or month'
          },
          400
        )
      }

      const progress = await AnalyticsService.getProgressOverTime(user.id, periodType)

      return c.json({
        success: true,
        message: 'Progress over time retrieved successfully',
        data: progress
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to retrieve progress over time'
        },
        500
      )
    }
  }

  /**
   * Get question analytics (moderators only)
   * GET /api/analytics/questions
   * Query params: questionId, categoryId, limit (optional)
   */
  static async getQuestionAnalytics(c: Context) {
    try {
      const user = c.get('user')
      if (!user || (user.role !== 'moderator' && user.role !== 'super_admin')) {
        return c.json(
          {
            success: false,
            message: 'Forbidden: Only moderators and admins can access question analytics'
          },
          403
        )
      }

      const questionId = c.req.query('questionId')
      const categoryId = c.req.query('categoryId')
      const limit = parseInt(c.req.query('limit') || '50')

      const analytics = await AnalyticsService.getQuestionAnalytics(
        questionId ? parseInt(questionId) : undefined,
        categoryId ? parseInt(categoryId) : undefined,
        limit
      )

      return c.json({
        success: true,
        message: 'Question analytics retrieved successfully',
        data: analytics
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to retrieve question analytics'
        },
        500
      )
    }
  }

  /**
   * Get overall statistics (moderators only)
   * GET /api/analytics/overall
   */
  static async getOverallStats(c: Context) {
    try {
      const user = c.get('user')
      if (!user || (user.role !== 'moderator' && user.role !== 'super_admin')) {
        return c.json(
          {
            success: false,
            message: 'Forbidden: Only moderators and admins can access overall statistics'
          },
          403
        )
      }

      const stats = await AnalyticsService.getOverallStats()

      return c.json({
        success: true,
        message: 'Overall statistics retrieved successfully',
        data: stats
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to retrieve overall statistics'
        },
        500
      )
    }
  }

  /**
   * Get daily activity (moderators only)
   * GET /api/analytics/daily-activity
   * Query params: dateFrom, dateTo (required)
   */
  static async getDailyActivity(c: Context) {
    try {
      const user = c.get('user')
      if (!user || (user.role !== 'moderator' && user.role !== 'super_admin')) {
        return c.json(
          {
            success: false,
            message: 'Forbidden: Only moderators and admins can access daily activity'
          },
          403
        )
      }

      const dateFrom = c.req.query('dateFrom')
      const dateTo = c.req.query('dateTo')

      if (!dateFrom || !dateTo) {
        return c.json(
          {
            success: false,
            message: 'dateFrom and dateTo query parameters are required'
          },
          400
        )
      }

      const activity = await AnalyticsService.getDailyActivity(
        new Date(dateFrom),
        new Date(dateTo)
      )

      return c.json({
        success: true,
        message: 'Daily activity retrieved successfully',
        data: activity
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to retrieve daily activity'
        },
        500
      )
    }
  }

  /**
   * Get specific user performance (moderators only)
   * GET /api/analytics/users/:userId/performance
   * Query params: dateFrom, dateTo (optional)
   */
  static async getSpecificUserPerformance(c: Context) {
    try {
      const user = c.get('user')
      if (!user || (user.role !== 'moderator' && user.role !== 'super_admin')) {
        return c.json(
          {
            success: false,
            message: 'Forbidden: Only moderators and admins can access other users\' performance'
          },
          403
        )
      }

      const userId = parseInt(c.req.param('userId'))
      if (isNaN(userId)) {
        return c.json(
          {
            success: false,
            message: 'Invalid user ID'
          },
          400
        )
      }

      const dateFrom = c.req.query('dateFrom')
      const dateTo = c.req.query('dateTo')

      const metrics = await AnalyticsService.getUserPerformance(
        userId,
        dateFrom ? new Date(dateFrom) : undefined,
        dateTo ? new Date(dateTo) : undefined
      )

      return c.json({
        success: true,
        message: 'User performance metrics retrieved successfully',
        data: metrics
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to retrieve user performance metrics'
        },
        500
      )
    }
  }
}
