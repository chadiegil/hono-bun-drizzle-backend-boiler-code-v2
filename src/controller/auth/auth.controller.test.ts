import { describe, test, expect, beforeAll } from 'bun:test'
import { createMockContext } from '../../test/helpers'
import '../../test/setup'
import { AuthController } from './auth.controller'

describe('AuthController', () => {
  const testEmail = `controller-${Date.now()}@example.com`

  describe('register', () => {
    test('should register a user with valid data', async () => {
      const mockContext = createMockContext({
        body: {
          name: 'Controller Test',
          email: testEmail,
          password: 'password123'
        }
      })

      const response = (await AuthController.register(mockContext)) as any

      expect(response.status).toBe(201)
      expect(response.data.success).toBe(true)
      expect(response.data.message).toBe('User registered successfully')
      expect(response.data.data.user).toBeDefined()
      expect(response.data.data.user.email).toBe(testEmail)
      expect(response.data.data.token).toBeDefined()
    })

    test('should reject registration with invalid email', async () => {
      const mockContext = createMockContext({
        body: {
          name: 'Test User',
          email: 'invalid-email',
          password: 'password123'
        }
      })

      const response = (await AuthController.register(mockContext)) as any

      expect(response.status).toBe(400)
      expect(response.data.success).toBe(false)
      expect(response.data.message).toBe('Validation error')
    })

    test('should reject registration with short password', async () => {
      const mockContext = createMockContext({
        body: {
          name: 'Test User',
          email: 'test@example.com',
          password: '123'
        }
      })

      const response = (await AuthController.register(mockContext)) as any

      expect(response.status).toBe(400)
      expect(response.data.success).toBe(false)
      expect(response.data.message).toBe('Validation error')
    })

    test('should reject registration with short name', async () => {
      const mockContext = createMockContext({
        body: {
          name: 'A',
          email: 'test@example.com',
          password: 'password123'
        }
      })

      const response = (await AuthController.register(mockContext)) as any

      expect(response.status).toBe(400)
      expect(response.data.success).toBe(false)
    })

    test('should reject duplicate email registration', async () => {
      const mockContext = createMockContext({
        body: {
          name: 'Duplicate User',
          email: testEmail,
          password: 'password123'
        }
      })

      const response = (await AuthController.register(mockContext)) as any

      expect(response.status).toBe(400)
      expect(response.data.success).toBe(false)
      expect(response.data.message).toBe('User with this email already exists')
    })
  })

  describe('login', () => {
    test('should login with correct credentials', async () => {
      const mockContext = createMockContext({
        body: {
          email: testEmail,
          password: 'password123'
        }
      })

      const response = (await AuthController.login(mockContext)) as any

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.message).toBe('Login successful')
      expect(response.data.data.user).toBeDefined()
      expect(response.data.data.token).toBeDefined()
    })

    test('should reject login with wrong password', async () => {
      const mockContext = createMockContext({
        body: {
          email: testEmail,
          password: 'wrongpassword'
        }
      })

      const response = (await AuthController.login(mockContext)) as any

      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      expect(response.data.message).toBe('Invalid credentials')
    })

    test('should reject login with invalid email format', async () => {
      const mockContext = createMockContext({
        body: {
          email: 'invalid-email',
          password: 'password123'
        }
      })

      const response = (await AuthController.login(mockContext)) as any

      expect(response.status).toBe(400)
      expect(response.data.success).toBe(false)
      expect(response.data.message).toBe('Validation error')
    })

    test('should reject login with non-existent user', async () => {
      const mockContext = createMockContext({
        body: {
          email: 'nonexistent@example.com',
          password: 'password123'
        }
      })

      const response = (await AuthController.login(mockContext)) as any

      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      expect(response.data.message).toBe('Invalid credentials')
    })
  })

  describe('getProfile', () => {
    test('should return user profile when user is set in context', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date()
      }

      const contextStore = new Map()
      contextStore.set('user', mockUser)

      const mockContext = {
        get: (key: string) => contextStore.get(key),
        json: (data: any, status?: number) => ({
          data,
          status: status || 200
        })
      } as any

      const response = (await AuthController.getProfile(mockContext)) as any

      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data).toEqual(mockUser)
    })
  })
})
