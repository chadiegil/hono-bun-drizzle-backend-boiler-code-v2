# Testing Guide

## Table of Contents
1. [Testing Setup](#testing-setup)
2. [Test Structure](#test-structure)
3. [Writing Tests](#writing-tests)
4. [Testing Patterns](#testing-patterns)
5. [Examples](#examples)
6. [Best Practices](#best-practices)

---

## Testing Setup

### Running Tests

```bash
# Run all tests in Docker
bun run test

# Run tests in watch mode
bun run test:watch

# Run specific test file
docker compose exec -T backend bun test src/service/auth/auth.service.test.ts

# Run tests with verbose output
docker compose exec -T backend bun test --verbose
```

### Test File Structure

```
src/
├── service/
│   └── auth/
│       ├── auth.service.ts
│       └── auth.service.test.ts       # Tests for service
├── controller/
│   └── auth/
│       ├── auth.controller.ts
│       └── auth.controller.test.ts    # Tests for controller
└── middleware/
    ├── auth.middleware.ts
    └── auth.middleware.test.ts        # Tests for middleware
```

**Naming Convention:** `{filename}.test.ts`

---

## Test Structure

### Basic Test Template

```typescript
import { describe, test, expect, beforeAll, afterAll } from 'bun:test'

describe('ComponentName', () => {
  // Setup before all tests
  beforeAll(async () => {
    // Initialize resources
  })

  // Cleanup after all tests
  afterAll(async () => {
    // Clean up resources
  })

  describe('functionName', () => {
    test('should do something', async () => {
      // Arrange
      const input = 'test'

      // Act
      const result = await someFunction(input)

      // Assert
      expect(result).toBe('expected')
    })

    test('should handle errors', async () => {
      // Arrange & Act & Assert
      expect(async () => {
        await someFunction('invalid')
      }).toThrow('Error message')
    })
  })
})
```

---

## Writing Tests

### 1. Service Tests

Testing business logic and data operations.

**File:** `src/service/auth/auth.service.test.ts`

```typescript
import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { AuthService } from './auth.service'
import { db } from '../../db/client'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

describe('AuthService', () => {
  // Clean up test data after all tests
  afterAll(async () => {
    await db.delete(users).where(eq(users.email, 'test@example.com'))
  })

  describe('register', () => {
    test('should register a new user successfully', async () => {
      // Arrange
      const input = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      }

      // Act
      const result = await AuthService.register(input)

      // Assert
      expect(result.user).toBeDefined()
      expect(result.user.email).toBe(input.email)
      expect(result.user.name).toBe(input.name)
      expect(result.token).toBeDefined()
      expect(result.refreshToken).toBeDefined()
    })

    test('should not allow duplicate email registration', async () => {
      // Arrange
      const input = {
        name: 'Test User',
        email: 'test@example.com', // Same email as above
        password: 'password123'
      }

      // Act & Assert
      expect(async () => {
        await AuthService.register(input)
      }).toThrow('User with this email already exists')
    })

    test('should hash the password', async () => {
      // Arrange
      const email = 'hash-test@example.com'
      const password = 'mypassword'

      await AuthService.register({
        name: 'Hash Test',
        email,
        password
      })

      // Act
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))

      // Assert
      expect(user.password).not.toBe(password)
      expect(user.password).toContain('$2') // bcrypt hash prefix

      // Cleanup
      await db.delete(users).where(eq(users.email, email))
    })
  })

  describe('login', () => {
    test('should login successfully with correct credentials', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      }

      // Act
      const result = await AuthService.login(credentials)

      // Assert
      expect(result.user).toBeDefined()
      expect(result.user.email).toBe(credentials.email)
      expect(result.token).toBeDefined()
      expect(result.refreshToken).toBeDefined()
    })

    test('should fail login with incorrect password', async () => {
      // Arrange
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      }

      // Act & Assert
      expect(async () => {
        await AuthService.login(credentials)
      }).toThrow('Invalid credentials')
    })

    test('should fail login with non-existent email', async () => {
      // Arrange
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'password123'
      }

      // Act & Assert
      expect(async () => {
        await AuthService.login(credentials)
      }).toThrow('Invalid credentials')
    })
  })

  describe('generateToken', () => {
    test('should generate a valid JWT token', async () => {
      // Arrange
      const payload = { userId: 1, email: 'test@example.com' }

      // Act
      const token = await AuthService.generateToken(payload)

      // Assert
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })
  })

  describe('verifyToken', () => {
    test('should verify a valid token', async () => {
      // Arrange
      const payload = { userId: 1, email: 'test@example.com' }
      const token = await AuthService.generateToken(payload)

      // Act
      const verified = await AuthService.verifyToken(token)

      // Assert
      expect(verified.userId).toBe(payload.userId)
      expect(verified.email).toBe(payload.email)
    })

    test('should reject an invalid token', async () => {
      // Arrange
      const invalidToken = 'invalid.token.here'

      // Act & Assert
      expect(async () => {
        await AuthService.verifyToken(invalidToken)
      }).toThrow('Invalid or expired token')
    })
  })
})
```

---

### 2. Controller Tests

Testing HTTP request/response handling.

**File:** `src/controller/auth/auth.controller.test.ts`

```typescript
import { describe, test, expect, afterAll } from 'bun:test'
import app from '../../index'
import { db } from '../../db/client'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

describe('AuthController', () => {
  const testEmail = 'controller-test@example.com'

  // Cleanup after all tests
  afterAll(async () => {
    await db.delete(users).where(eq(users.email, testEmail))
  })

  describe('register', () => {
    test('should register a user with valid data', async () => {
      // Arrange
      const requestBody = {
        name: 'Controller Test',
        email: testEmail,
        password: 'password123'
      }

      // Act
      const response = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = (await response.json()) as any

      // Assert
      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.user.email).toBe(testEmail)
      expect(data.data.token).toBeDefined()
      expect(data.data.refreshToken).toBeDefined()
    })

    test('should reject registration with invalid email', async () => {
      // Arrange
      const requestBody = {
        name: 'Test User',
        email: 'invalid-email', // Invalid email
        password: 'password123'
      }

      // Act
      const response = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = (await response.json()) as any

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('Validation error')
    })

    test('should reject registration with short password', async () => {
      // Arrange
      const requestBody = {
        name: 'Test User',
        email: 'test@example.com',
        password: '12345' // Too short (min 6 chars)
      }

      // Act
      const response = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = (await response.json()) as any

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    test('should reject duplicate email registration', async () => {
      // Arrange
      const requestBody = {
        name: 'Duplicate User',
        email: testEmail, // Already registered
        password: 'password123'
      }

      // Act
      const response = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = (await response.json()) as any

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toContain('already exists')
    })
  })

  describe('login', () => {
    test('should login with correct credentials', async () => {
      // Arrange
      const requestBody = {
        email: testEmail,
        password: 'password123'
      }

      // Act
      const response = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = (await response.json()) as any

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.user.email).toBe(testEmail)
      expect(data.data.token).toBeDefined()
    })

    test('should reject login with wrong password', async () => {
      // Arrange
      const requestBody = {
        email: testEmail,
        password: 'wrongpassword'
      }

      // Act
      const response = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = (await response.json()) as any

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    test('should reject login with non-existent user', async () => {
      // Arrange
      const requestBody = {
        email: 'nonexistent@example.com',
        password: 'password123'
      }

      // Act
      const response = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = (await response.json()) as any

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('getProfile', () => {
    test('should return user profile when authenticated', async () => {
      // Arrange - Login to get token
      const loginResponse = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'password123'
        })
      })
      const loginData = (await loginResponse.json()) as any
      const token = loginData.data.token

      // Act - Get profile
      const response = await app.request('/api/auth/profile', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = (await response.json()) as any

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.email).toBe(testEmail)
    })

    test('should reject request without token', async () => {
      // Act
      const response = await app.request('/api/auth/profile', {
        method: 'GET'
      })

      const data = (await response.json()) as any

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })
})
```

---

### 3. Middleware Tests

Testing middleware functionality.

**File:** `src/middleware/auth.middleware.test.ts`

```typescript
import { describe, test, expect } from 'bun:test'
import { Hono } from 'hono'
import { authMiddleware } from './auth.middleware'
import { AuthService } from '../service/auth/auth.service'

describe('authMiddleware', () => {
  const app = new Hono()

  // Test route with auth middleware
  app.get('/protected', authMiddleware, (c) => {
    return c.json({ success: true, user: c.get('user') })
  })

  test('should reject request without Authorization header', async () => {
    // Act
    const response = await app.request('/protected', {
      method: 'GET'
    })

    const data = (await response.json()) as any

    // Assert
    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.message).toContain('Authorization header')
  })

  test('should reject request with invalid Authorization format', async () => {
    // Act
    const response = await app.request('/protected', {
      method: 'GET',
      headers: { Authorization: 'InvalidFormat' }
    })

    const data = (await response.json()) as any

    // Assert
    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  test('should reject request with invalid token', async () => {
    // Act
    const response = await app.request('/protected', {
      method: 'GET',
      headers: { Authorization: 'Bearer invalid.token.here' }
    })

    const data = (await response.json()) as any

    // Assert
    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  test('should allow request with valid token', async () => {
    // Arrange - Generate valid token
    const token = await AuthService.generateToken({
      userId: 1,
      email: 'test@example.com'
    })

    // Act
    const response = await app.request('/protected', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    })

    const data = (await response.json()) as any

    // Assert
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.user).toBeDefined()
  })
})
```

---

## Testing Patterns

### AAA Pattern (Arrange-Act-Assert)

```typescript
test('should do something', async () => {
  // Arrange - Set up test data
  const input = 'test input'
  const expected = 'expected output'

  // Act - Execute the function
  const result = await functionUnderTest(input)

  // Assert - Verify the result
  expect(result).toBe(expected)
})
```

### Testing Async Functions

```typescript
test('should handle async operations', async () => {
  const result = await asyncFunction()
  expect(result).toBeDefined()
})
```

### Testing Errors

```typescript
test('should throw error', async () => {
  expect(async () => {
    await functionThatThrows()
  }).toThrow('Expected error message')
})
```

### Testing HTTP Responses

```typescript
test('should return 200 status', async () => {
  const response = await app.request('/api/endpoint', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })

  expect(response.status).toBe(200)

  const data = (await response.json()) as any
  expect(data.success).toBe(true)
})
```

---

## Examples

### Testing with Database

```typescript
import { db } from '../../db/client'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'

describe('Database Operations', () => {
  const testEmail = 'db-test@example.com'

  // Cleanup before tests
  beforeAll(async () => {
    await db.delete(users).where(eq(users.email, testEmail))
  })

  // Cleanup after tests
  afterAll(async () => {
    await db.delete(users).where(eq(users.email, testEmail))
  })

  test('should create user in database', async () => {
    // Arrange
    const userData = {
      name: 'DB Test',
      email: testEmail,
      password: 'hashed_password'
    }

    // Act
    const [newUser] = await db.insert(users).values(userData).returning()

    // Assert
    expect(newUser).toBeDefined()
    expect(newUser.email).toBe(testEmail)
  })
})
```

### Testing with Mock Data

```typescript
describe('User Service', () => {
  test('should format user data', () => {
    // Arrange
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Act
    const formatted = formatUser(mockUser)

    // Assert
    expect(formatted).not.toHaveProperty('password')
    expect(formatted.email).toBe(mockUser.email)
  })
})
```

### Testing Protected Routes

```typescript
describe('Protected Endpoints', () => {
  let authToken: string

  beforeAll(async () => {
    // Get auth token for tests
    const response = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    })
    const data = (await response.json()) as any
    authToken = data.data.token
  })

  test('should access protected route', async () => {
    const response = await app.request('/api/protected', {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` }
    })

    expect(response.status).toBe(200)
  })
})
```

---

## Best Practices

### 1. Test Organization

```typescript
// ✅ Good - Grouped by feature/function
describe('AuthService', () => {
  describe('register', () => {
    test('should register user')
    test('should reject duplicate email')
  })

  describe('login', () => {
    test('should login with valid credentials')
    test('should reject invalid credentials')
  })
})

// ❌ Bad - Flat structure
describe('AuthService', () => {
  test('register user')
  test('reject duplicate email')
  test('login valid')
  test('reject invalid')
})
```

### 2. Test Naming

```typescript
// ✅ Good - Descriptive test names
test('should register a new user successfully')
test('should reject registration with invalid email format')
test('should hash password before storing in database')

// ❌ Bad - Vague test names
test('register works')
test('email validation')
test('password')
```

### 3. Cleanup

```typescript
// ✅ Good - Clean up test data
describe('UserTests', () => {
  afterAll(async () => {
    await db.delete(users).where(eq(users.email, 'test@example.com'))
  })
})

// ❌ Bad - No cleanup (pollutes database)
describe('UserTests', () => {
  test('creates user', async () => {
    await createUser('test@example.com')
    // No cleanup
  })
})
```

### 4. Avoid Test Interdependence

```typescript
// ✅ Good - Independent tests
test('test A', () => {
  const data = createTestData()
  expect(data).toBeDefined()
})

test('test B', () => {
  const data = createTestData()
  expect(data).toBeDefined()
})

// ❌ Bad - Tests depend on each other
let sharedData: any

test('test A', () => {
  sharedData = createTestData()
})

test('test B', () => {
  // Fails if test A doesn't run first
  expect(sharedData).toBeDefined()
})
```

### 5. Use Type Assertions for JSON Responses

```typescript
// ✅ Good - Type assertion to avoid linter errors
const response = await app.request('/api/auth/login', { ... })
const data = (await response.json()) as any
expect(data.success).toBe(true)

// ❌ Bad - Direct access causes linter errors
const response = await app.request('/api/auth/login', { ... })
const data = await response.json()
expect(data.success).toBe(true) // Linter error: Property 'success' does not exist
```

### 6. Test Edge Cases

```typescript
describe('calculateDiscount', () => {
  test('should handle normal case')
  test('should handle zero amount')
  test('should handle negative amount')
  test('should handle very large numbers')
  test('should handle null/undefined')
  test('should handle boundary values')
})
```

### 7. Keep Tests Simple

```typescript
// ✅ Good - One assertion per test
test('should return user email', () => {
  expect(user.email).toBe('test@example.com')
})

test('should return user name', () => {
  expect(user.name).toBe('Test User')
})

// ⚠️ Acceptable - Related assertions
test('should return complete user data', () => {
  expect(user.email).toBe('test@example.com')
  expect(user.name).toBe('Test User')
  expect(user.id).toBeDefined()
})

// ❌ Bad - Too many unrelated assertions
test('user operations', () => {
  expect(user.email).toBe('test@example.com')
  expect(canLogin).toBe(true)
  expect(permissions).toContain('read')
  expect(settings.theme).toBe('dark')
  // ... too much in one test
})
```

---

## Common Test Scenarios

### Testing Validation

```typescript
test('should validate email format', async () => {
  const invalidEmails = ['invalid', 'test@', '@example.com', 'test..@example.com']

  for (const email of invalidEmails) {
    const response = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email, password: 'password123' })
    })

    expect(response.status).toBe(400)
  }
})
```

### Testing Rate Limiting

```typescript
test('should enforce rate limit', async () => {
  const requests = []

  // Make 10 requests (limit is 5)
  for (let i = 0; i < 10; i++) {
    requests.push(
      app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com', password: 'pass' })
      })
    )
  }

  const responses = await Promise.all(requests)
  const rateLimited = responses.filter((r) => r.status === 429)

  expect(rateLimited.length).toBeGreaterThan(0)
})
```

### Testing Token Refresh

```typescript
test('should refresh access token', async () => {
  // Login to get tokens
  const loginRes = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
  })
  const { refreshToken } = ((await loginRes.json()) as any).data

  // Refresh token
  const refreshRes = await app.request('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  })
  const refreshData = (await refreshRes.json()) as any

  expect(refreshRes.status).toBe(200)
  expect(refreshData.data.token).toBeDefined()
})
```

---

## Running Tests

```bash
# Run all tests
bun run test

# Run specific test file
docker compose exec -T backend bun test src/service/auth/auth.service.test.ts

# Run tests in watch mode
bun run test:watch

# Run tests with coverage (if configured)
docker compose exec -T backend bun test --coverage
```

---

## Debugging Tests

```typescript
// Add console.log for debugging
test('debug test', async () => {
  const result = await someFunction()
  console.log('Result:', result) // Will show in test output
  expect(result).toBeDefined()
})

// Use test.only to run single test
test.only('focused test', () => {
  // Only this test will run
})

// Skip tests temporarily
test.skip('skipped test', () => {
  // This test won't run
})
```
