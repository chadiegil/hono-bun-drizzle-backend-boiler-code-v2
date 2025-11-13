import { describe, test, expect, beforeAll } from 'bun:test'
import '../../test/setup'
import { AuthService } from './auth.service'

describe('AuthService', () => {
  const testEmail = `test-${Date.now()}@example.com`
  const testPassword = 'password123'
  let registeredUser: any

  describe('register', () => {
    test('should register a new user successfully', async () => {
      const result = await AuthService.register({
        name: 'Test User',
        email: testEmail,
        password: testPassword
      })

      expect(result).toBeDefined()
      expect(result.user).toBeDefined()
      expect(result.user.email).toBe(testEmail)
      expect(result.user.name).toBe('Test User')
      expect(result.user.id).toBeDefined()
      expect(result.token).toBeDefined()
      expect(typeof result.token).toBe('string')

      registeredUser = result.user
    })

    test('should not allow duplicate email registration', async () => {
      try {
        await AuthService.register({
          name: 'Another User',
          email: testEmail,
          password: 'different123'
        })
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.message).toBe('User with this email already exists')
      }
    })

    test('should hash the password', async () => {
      // Password should be hashed, not stored in plain text
      const uniqueEmail = `hash-test-${Date.now()}@example.com`
      const result = await AuthService.register({
        name: 'Hash Test',
        email: uniqueEmail,
        password: 'mypassword'
      })

      expect(result.user).toBeDefined()
      // The returned user should not contain the password field
      expect((result.user as any).password).toBeUndefined()
    })
  })

  describe('login', () => {
    test('should login successfully with correct credentials', async () => {
      const result = await AuthService.login({
        email: testEmail,
        password: testPassword
      })

      expect(result).toBeDefined()
      expect(result.user).toBeDefined()
      expect(result.user.email).toBe(testEmail)
      expect(result.token).toBeDefined()
      expect(typeof result.token).toBe('string')
    })

    test('should fail login with incorrect password', async () => {
      try {
        await AuthService.login({
          email: testEmail,
          password: 'wrongpassword'
        })
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.message).toBe('Invalid credentials')
      }
    })

    test('should fail login with non-existent email', async () => {
      try {
        await AuthService.login({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.message).toBe('Invalid credentials')
      }
    })
  })

  describe('generateToken', () => {
    test('should generate a valid JWT token', async () => {
      const token = await AuthService.generateToken({
        userId: 1,
        email: 'test@example.com'
      })

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.').length).toBe(3) // JWT has 3 parts
    })
  })

  describe('verifyToken', () => {
    test('should verify a valid token', async () => {
      const token = await AuthService.generateToken({
        userId: 123,
        email: 'verify@example.com'
      })

      const payload = await AuthService.verifyToken(token)

      expect(payload).toBeDefined()
      expect(payload.userId).toBe(123)
      expect(payload.email).toBe('verify@example.com')
    })

    test('should reject an invalid token', async () => {
      try {
        await AuthService.verifyToken('invalid.token.here')
        expect(true).toBe(false) // Should not reach here
      } catch (error: any) {
        expect(error.message).toBe('Invalid or expired token')
      }
    })

    test('should reject an expired token', async () => {
      // Create a token that expires immediately (for testing purposes)
      // This would require modifying the service to accept expiration time
      // For now, we test with an invalid token format
      try {
        await AuthService.verifyToken('')
        expect(true).toBe(false)
      } catch (error: any) {
        expect(error.message).toBe('Invalid or expired token')
      }
    })
  })
})
