import { Context } from 'hono'
import { DashboardService } from '../../service/dashboard/dashboard.service'

export class DashboardController {
  /**
   * Get user dashboard statistics
   * GET /api/dashboard/stats
   */
  static async getStats(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const stats = await DashboardService.getUserStats(user.id)

      return c.json({
        success: true,
        data: stats
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to fetch dashboard statistics'
        },
        500
      )
    }
  }

  /**
   * Get recent activity for user
   * GET /api/dashboard/recent
   */
  static async getRecentActivity(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 10

      const activity = await DashboardService.getRecentActivity(user.id, limit)

      return c.json({
        success: true,
        data: activity
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to fetch recent activity'
        },
        500
      )
    }
  }
}
