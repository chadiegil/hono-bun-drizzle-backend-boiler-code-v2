import { Context } from 'hono'
import { AuthService } from '../../service/auth/auth.service'
import { z } from 'zod'

// Validation schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
})

export class AuthController {
  /**
   * Register a new user
   */
  static async register(c: Context) {
    try {
      const body = await c.req.json()

      // Validate input
      const validatedData = registerSchema.parse(body)

      // Register user
      const result = await AuthService.register(validatedData)

      return c.json(
        {
          success: true,
          message: 'User registered successfully',
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
          message: error.message || 'Registration failed'
        },
        400
      )
    }
  }

  /**
   * Login user
   */
  static async login(c: Context) {
    try {
      const body = await c.req.json()

      // Validate input
      const validatedData = loginSchema.parse(body)

      // Login user
      const result = await AuthService.login(validatedData)

      return c.json(
        {
          success: true,
          message: 'Login successful',
          data: result
        },
        200
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
          message: error.message || 'Login failed'
        },
        401
      )
    }
  }

  /**
   * Get current user profile (protected route)
   */
  static async getProfile(c: Context) {
    try {
      // User info is set by auth middleware
      const user = c.get('user')

      return c.json(
        {
          success: true,
          data: user
        },
        200
      )
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to get profile'
        },
        500
      )
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refresh(c: Context) {
    try {
      const body = await c.req.json()

      // Validate input
      const validatedData = refreshTokenSchema.parse(body)

      // Refresh token
      const result = await AuthService.refreshAccessToken(validatedData.refreshToken)

      return c.json(
        {
          success: true,
          message: 'Token refreshed successfully',
          data: result
        },
        200
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
          message: error.message || 'Token refresh failed'
        },
        401
      )
    }
  }

  /**
   * Logout user (revoke refresh token)
   */
  static async logout(c: Context) {
    try {
      // User info is set by auth middleware
      const user = c.get('user')

      // Revoke refresh token
      await AuthService.revokeRefreshToken(user.id)

      return c.json(
        {
          success: true,
          message: 'Logged out successfully'
        },
        200
      )
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Logout failed'
        },
        500
      )
    }
  }
}
