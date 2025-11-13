import { db } from '../../db/client'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
)

const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-refresh-secret-key'
)

export interface RegisterInput {
  name: string
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface JWTPayload {
  userId: number
  email: string
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(input: RegisterInput) {
    const { name, email, password } = input

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1)

    if (existingUser.length > 0) {
      throw new Error('User with this email already exists')
    }

    // Hash password using Bun's built-in password hashing
    const hashedPassword = await Bun.password.hash(password, {
      algorithm: 'bcrypt',
      cost: 10
    })

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt
      })

    // Generate JWT tokens
    const token = await this.generateToken({
      userId: newUser.id,
      email: newUser.email
    })

    const refreshToken = await this.generateRefreshToken({
      userId: newUser.id,
      email: newUser.email
    })

    // Store refresh token in database
    await db.update(users).set({ refreshToken }).where(eq(users.id, newUser.id))

    return {
      user: newUser,
      token,
      refreshToken
    }
  }

  /**
   * Login user
   */
  static async login(input: LoginInput) {
    const { email, password } = input

    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Verify password using Bun's built-in password verification
    const isPasswordValid = await Bun.password.verify(password, user.password)

    if (!isPasswordValid) {
      throw new Error('Invalid credentials')
    }

    // Generate JWT tokens
    const token = await this.generateToken({
      userId: user.id,
      email: user.email
    })

    const refreshToken = await this.generateRefreshToken({
      userId: user.id,
      email: user.email
    })

    // Store refresh token in database
    await db.update(users).set({ refreshToken }).where(eq(users.id, user.id))

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      token,
      refreshToken
    }
  }

  /**
   * Generate JWT token
   */
  static async generateToken(payload: JWTPayload): Promise<string> {
    const token = await new SignJWT(payload as any)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET)

    return token
  }

  /**
   * Verify JWT token
   */
  static async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET)
      return payload as unknown as JWTPayload
    } catch (error) {
      throw new Error('Invalid or expired token')
    }
  }

  /**
   * Generate refresh token (longer expiration)
   */
  static async generateRefreshToken(payload: JWTPayload): Promise<string> {
    const token = await new SignJWT(payload as any)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d') // Refresh token valid for 30 days
      .sign(JWT_REFRESH_SECRET)

    return token
  }

  /**
   * Verify refresh token and issue new access token
   */
  static async refreshAccessToken(refreshToken: string) {
    try {
      // Verify refresh token
      const { payload } = await jwtVerify(refreshToken, JWT_REFRESH_SECRET)
      const jwtPayload = payload as unknown as JWTPayload

      // Find user and verify refresh token matches stored one
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, jwtPayload.userId))
        .limit(1)

      if (!user || user.refreshToken !== refreshToken) {
        throw new Error('Invalid refresh token')
      }

      // Generate new access token
      const newToken = await this.generateToken({
        userId: user.id,
        email: user.email
      })

      return {
        token: newToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      }
    } catch (error) {
      throw new Error('Invalid or expired refresh token')
    }
  }

  /**
   * Revoke refresh token (logout)
   */
  static async revokeRefreshToken(userId: number) {
    await db.update(users).set({ refreshToken: null }).where(eq(users.id, userId))
  }
}
