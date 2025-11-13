import { describe, test, expect } from 'bun:test'
import { authMiddleware } from './auth.middleware'
import { AuthService } from '../service/auth/auth.service'
import '../test/setup'

describe('authMiddleware', () => {
  test('should reject request without Authorization header', async () => {
    const mockContext = {
      req: {
        header: (key: string) => undefined
      },
      json: (data: any, status?: number) => ({
        data,
        status: status || 200
      })
    } as any

    const mockNext = async () => {}

    const response = await authMiddleware(mockContext, mockNext) as any

    expect(response.status).toBe(401)
    expect(response.data.success).toBe(false)
    expect(response.data.message).toBe('No token provided')
  })

  test('should reject request with invalid Authorization format', async () => {
    const mockContext = {
      req: {
        header: (key: string) => {
          if (key === 'Authorization') return 'InvalidFormat token'
          return undefined
        }
      },
      json: (data: any, status?: number) => ({
        data,
        status: status || 200
      })
    } as any

    const mockNext = async () => {}

    const response = await authMiddleware(mockContext, mockNext) as any

    expect(response.status).toBe(401)
    expect(response.data.success).toBe(false)
    expect(response.data.message).toBe('No token provided')
  })

  test('should reject request with invalid token', async () => {
    const mockContext = {
      req: {
        header: (key: string) => {
          if (key === 'Authorization') return 'Bearer invalid.token.here'
          return undefined
        }
      },
      json: (data: any, status?: number) => ({
        data,
        status: status || 200
      })
    } as any

    const mockNext = async () => {}

    const response = await authMiddleware(mockContext, mockNext) as any

    expect(response.status).toBe(401)
    expect(response.data.success).toBe(false)
    expect(response.data.message).toContain('Invalid or expired token')
  })

  test('should allow request with valid token', async () => {
    // First, create a test user to get a real user ID
    const uniqueEmail = `middleware-test-${Date.now()}@example.com`
    const registerResult = await AuthService.register({
      name: 'Middleware Test',
      email: uniqueEmail,
      password: 'password123'
    })

    const token = registerResult.token
    const contextStore = new Map()
    let nextCalled = false

    const mockContext = {
      req: {
        header: (key: string) => {
          if (key === 'Authorization') return `Bearer ${token}`
          return undefined
        }
      },
      json: (data: any, status?: number) => ({
        data,
        status: status || 200
      }),
      set: (key: string, value: any) => {
        contextStore.set(key, value)
      },
      get: (key: string) => contextStore.get(key)
    } as any

    const mockNext = async () => {
      nextCalled = true
    }

    await authMiddleware(mockContext, mockNext)

    expect(nextCalled).toBe(true)
    expect(contextStore.get('user')).toBeDefined()
    expect(contextStore.get('user').email).toBe(uniqueEmail)
  })

  test('should reject token for non-existent user', async () => {
    // Create a token with a non-existent user ID
    const fakeToken = await AuthService.generateToken({
      userId: 999999,
      email: 'fake@example.com'
    })

    const mockContext = {
      req: {
        header: (key: string) => {
          if (key === 'Authorization') return `Bearer ${fakeToken}`
          return undefined
        }
      },
      json: (data: any, status?: number) => ({
        data,
        status: status || 200
      }),
      set: (key: string, value: any) => {}
    } as any

    const mockNext = async () => {}

    const response = await authMiddleware(mockContext, mockNext) as any

    expect(response.status).toBe(401)
    expect(response.data.success).toBe(false)
    expect(response.data.message).toBe('User not found')
  })
})
