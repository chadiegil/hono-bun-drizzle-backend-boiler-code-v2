import { Context, Next } from 'hono'
import { AuthService } from '../service/auth/auth.service'
import { db } from '../db/client'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

/**
 * Middleware to verify JWT token and attach user to context
 */
export async function authMiddleware(c: Context, next: Next) {
  try {
    // Get token from Authorization header
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(
        {
          success: false,
          message: 'No token provided'
        },
        401
      )
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify token
    const payload = await AuthService.verifyToken(token)

    // Get user from database
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1)

    if (!user) {
      return c.json(
        {
          success: false,
          message: 'User not found'
        },
        401
      )
    }

    // Attach user to context
    c.set('user', user)

    await next()
  } catch (error: any) {
    return c.json(
      {
        success: false,
        message: error.message || 'Authentication failed'
      },
      401
    )
  }
}
