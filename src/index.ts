import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { etag } from 'hono/etag'
import { prettyJSON } from 'hono/pretty-json'
import { db } from './db/client'
import { users } from './db/schema'
import { authMiddleware } from './middleware/auth.middleware'
import { AuthController } from './controller/auth/auth.controller'
import { requestId } from './middleware/request-id.middleware'
import { rateLimiter, authRateLimiter } from './middleware/rate-limit.middleware'
import { env } from './config/env'

const app = new Hono()

// Global middleware
app.use('*', requestId) // Add request ID for tracing
app.use('*', logger()) // Log all requests
app.use('*', etag()) // Add ETag headers for caching
app.use('*', prettyJSON()) // Pretty print JSON in development
app.use('*', secureHeaders()) // Add security headers
app.use('*', rateLimiter()) // General rate limiting (100 req/15min)

// CORS configuration
app.use(
  '*',
  cors({
    origin: env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173'
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 600,
    credentials: true
  })
)

// Global error handler
app.onError((err, c) => {
  console.error(`Error: ${err.message}`)
  console.error(err.stack)

  // Don't expose internal errors in production
  const isDevelopment = env.NODE_ENV !== 'production'

  return c.json(
    {
      success: false,
      message: isDevelopment ? err.message : 'Internal server error',
      ...(isDevelopment && { stack: err.stack })
    },
    500
  )
})

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      message: 'Route not found',
      path: c.req.path
    },
    404
  )
})

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV
  })
})

// Public routes
app.get('/', (c) => {
  return c.json({
    message: 'Welcome to QuizMock API',
    version: '1.0.0',
    docs: '/api/docs',
    health: '/health'
  })
})

// Auth routes (public) with stricter rate limiting
app.post('/api/auth/register', authRateLimiter(), AuthController.register)
app.post('/api/auth/login', authRateLimiter(), AuthController.login)
app.post('/api/auth/refresh', authRateLimiter(), AuthController.refresh)

// Protected routes (require authentication)
app.get('/api/auth/profile', authMiddleware, AuthController.getProfile)
app.post('/api/auth/logout', authMiddleware, AuthController.logout)

// Test route to get all users (protected)
app.get('/api/users', authMiddleware, async (c) => {
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt
    })
    .from(users)

  return c.json({
    success: true,
    data: allUsers
  })
})

export default app
