import { Context } from 'hono'
import { z } from 'zod'
import { AdminService } from '../../service/admin/admin.service'
import { NotificationService } from '../../service/notification/notification.service'

// Validation schemas
export const updateUserRoleSchema = z.object({
  role: z.enum(['super_admin', 'moderator', 'user'])
})

export const updateUserStatusSchema = z.object({
  isActive: z.boolean()
})

export const assignContributorSchema = z.object({
  userId: z.number(),
  categoryId: z.number(),
  canCreateQuestions: z.boolean().optional(),
  canEditQuestions: z.boolean().optional(),
  canDeleteQuestions: z.boolean().optional(),
  canCreateExams: z.boolean().optional(),
  notes: z.string().optional()
})

export class AdminController {
  /**
   * Get all users
   * GET /api/admin/users
   */
  static async getUsers(c: Context) {
    try {
      const filters = {
        role: c.req.query('role'),
        isActive: c.req.query('isActive') ? c.req.query('isActive') === 'true' : undefined,
        search: c.req.query('search'),
        page: c.req.query('page') ? parseInt(c.req.query('page')!) : 1,
        limit: c.req.query('limit') ? parseInt(c.req.query('limit')!) : 20
      }

      const result = await AdminService.getUsers(filters)

      return c.json({
        success: true,
        ...result
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to fetch users'
        },
        500
      )
    }
  }

  /**
   * Update user role
   * PUT /api/admin/users/:id/role
   */
  static async updateUserRole(c: Context) {
    try {
      const user = c.get('user')
      const userId = parseInt(c.req.param('id'))
      const body = await c.req.json()
      const validatedData = updateUserRoleSchema.parse(body)

      // Prevent self-demotion
      if (userId === user.id && validatedData.role !== 'super_admin') {
        return c.json(
          {
            success: false,
            message: 'You cannot change your own role'
          },
          403
        )
      }

      const updated = await AdminService.updateUserRole({
        userId,
        role: validatedData.role,
        updatedBy: user.id
      })

      return c.json({
        success: true,
        message: 'User role updated successfully',
        data: updated
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
          message: error.message || 'Failed to update user role'
        },
        500
      )
    }
  }

  /**
   * Update user status (activate/deactivate)
   * PUT /api/admin/users/:id/status
   */
  static async updateUserStatus(c: Context) {
    try {
      const user = c.get('user')
      const userId = parseInt(c.req.param('id'))
      const body = await c.req.json()
      const validatedData = updateUserStatusSchema.parse(body)

      // Prevent self-deactivation
      if (userId === user.id && !validatedData.isActive) {
        return c.json(
          {
            success: false,
            message: 'You cannot deactivate your own account'
          },
          403
        )
      }

      const updated = await AdminService.updateUserStatus(userId, validatedData.isActive)

      return c.json({
        success: true,
        message: `User ${validatedData.isActive ? 'activated' : 'deactivated'} successfully`,
        data: updated
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
          message: error.message || 'Failed to update user status'
        },
        500
      )
    }
  }

  /**
   * Assign contributor to category
   * POST /api/admin/contributors
   */
  static async assignContributor(c: Context) {
    try {
      const user = c.get('user')
      const body = await c.req.json()
      const validatedData = assignContributorSchema.parse(body)

      const assignment = await AdminService.assignContributor({
        ...validatedData,
        assignedBy: user.id
      })

      return c.json(
        {
          success: true,
          message: 'Contributor assigned successfully',
          data: assignment
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
          message: error.message || 'Failed to assign contributor'
        },
        500
      )
    }
  }

  /**
   * Remove contributor assignment
   * DELETE /api/admin/contributors/:userId/categories/:categoryId
   */
  static async removeContributor(c: Context) {
    try {
      const userId = parseInt(c.req.param('userId'))
      const categoryId = parseInt(c.req.param('categoryId'))

      await AdminService.removeContributor(userId, categoryId)

      return c.json({
        success: true,
        message: 'Contributor assignment removed successfully'
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to remove contributor'
        },
        500
      )
    }
  }

  /**
   * Get contributors for a category
   * GET /api/admin/categories/:id/contributors
   */
  static async getCategoryContributors(c: Context) {
    try {
      const categoryId = parseInt(c.req.param('id'))
      const contributors = await AdminService.getCategoryContributors(categoryId)

      return c.json({
        success: true,
        data: contributors
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to fetch contributors'
        },
        500
      )
    }
  }

  /**
   * Get user's contributor assignments
   * GET /api/admin/users/:id/contributions
   */
  static async getUserContributions(c: Context) {
    try {
      const userId = parseInt(c.req.param('id'))
      const contributions = await AdminService.getUserContributions(userId)

      return c.json({
        success: true,
        data: contributions
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to fetch contributions'
        },
        500
      )
    }
  }

  /**
   * Get new registrations count
   * GET /api/admin/notifications/count
   */
  static async getNotificationsCount(c: Context) {
    try {
      const since = c.req.query('since')
      const sinceDate = since ? new Date(since) : undefined

      const count = await NotificationService.getNewRegistrationsCount(sinceDate)

      return c.json({
        success: true,
        data: { count }
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to fetch notification count'
        },
        500
      )
    }
  }

  /**
   * Get recent registrations
   * GET /api/admin/notifications/recent
   */
  static async getRecentRegistrations(c: Context) {
    try {
      const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 10

      const users = await NotificationService.getRecentRegistrations(limit)

      return c.json({
        success: true,
        data: users
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to fetch recent registrations'
        },
        500
      )
    }
  }
}
