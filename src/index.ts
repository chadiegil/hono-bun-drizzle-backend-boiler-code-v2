import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { etag } from 'hono/etag'
import { prettyJSON } from 'hono/pretty-json'
import { upgradeWebSocket, websocket } from 'hono/bun'
import { db } from './db/client'
import { users } from './db/schema'
import { authMiddleware } from './middleware/auth.middleware'
import { requireSuperAdmin, requireModerator } from './middleware/rbac.middleware'
import { AuthController } from './controller/auth/auth.controller'
import { CategoryController } from './controller/category/category.controller'
import { QuestionController } from './controller/question/question.controller'
import { ExamController } from './controller/exam/exam.controller'
import { AttemptController } from './controller/attempt/attempt.controller'
import { AdminController } from './controller/admin/admin.controller'
import { ReviewController } from './controller/review/review.controller'
import { ImportExportController } from './controller/import-export/import-export.controller'
import { AnalyticsController } from './controller/analytics/analytics.controller'
import { DashboardController } from './controller/dashboard/dashboard.controller'
import { requestId } from './middleware/request-id.middleware'
import { rateLimiter, authRateLimiter } from './middleware/rate-limit.middleware'
import { env } from './config/env'
import { wsManager } from './websocket/websocket-manager'
import { AuthService } from './service/auth/auth.service'
import { randomUUID } from 'crypto'

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

// ============================================
// CATEGORY ROUTES
// ============================================
app.post('/api/categories', authMiddleware, CategoryController.create)
app.get('/api/categories', CategoryController.getAll)
app.get('/api/categories/tree', CategoryController.getTree)
app.get('/api/categories/:id', CategoryController.getById)
app.get('/api/categories/slug/:slug', CategoryController.getBySlug)
app.put('/api/categories/:id', authMiddleware, CategoryController.update)
app.delete('/api/categories/:id', authMiddleware, CategoryController.delete)

// ============================================
// QUESTION ROUTES
// ============================================
// Note: Specific routes must come before parameterized routes (/:id)

// Import/Export routes (must be before /:id)
app.get('/api/questions/import-template', ImportExportController.downloadTemplate)
app.post('/api/questions/import/preview', authMiddleware, ImportExportController.previewImport)
app.post('/api/questions/import', authMiddleware, ImportExportController.importQuestions)
app.get('/api/questions/export', authMiddleware, ImportExportController.exportQuestions)

// Review routes (must be before /:id)
app.get('/api/questions/pending-review', authMiddleware, requireModerator(), ReviewController.getPendingReview)
app.get('/api/questions/review-stats', authMiddleware, ReviewController.getReviewStats)
app.post('/api/questions/bulk-approve', authMiddleware, requireModerator(), ReviewController.bulkApprove)
app.post('/api/questions/bulk-reject', authMiddleware, requireModerator(), ReviewController.bulkReject)

// Search route (must be before /:id)
app.get('/api/questions/search', QuestionController.search)

// Basic CRUD routes
app.post('/api/questions', authMiddleware, QuestionController.create)
app.get('/api/questions', QuestionController.getAll)
app.get('/api/questions/:id', QuestionController.getById)
app.put('/api/questions/:id', authMiddleware, QuestionController.update)
app.delete('/api/questions/:id', authMiddleware, QuestionController.delete)

// Review routes with :id or :status params
app.get('/api/questions/by-status/:status', authMiddleware, ReviewController.getByStatus)
app.put('/api/questions/:id/submit-review', authMiddleware, ReviewController.submitForReview)
app.put('/api/questions/:id/approve', authMiddleware, requireModerator(), ReviewController.approveQuestion)
app.put('/api/questions/:id/reject', authMiddleware, requireModerator(), ReviewController.rejectQuestion)

// ============================================
// EXAM ROUTES
// ============================================
app.post('/api/exams', authMiddleware, ExamController.create)
app.get('/api/exams', ExamController.getAll)
app.get('/api/exams/:id', ExamController.getById)
app.get('/api/exams/:id/preview', ExamController.getPreview)
app.get('/api/exams/:id/questions', ExamController.getQuestions)
app.put('/api/exams/:id', authMiddleware, ExamController.update)
app.delete('/api/exams/:id', authMiddleware, ExamController.delete)
app.post('/api/exams/:id/publish', authMiddleware, ExamController.publish)
app.post('/api/exams/:id/questions', authMiddleware, ExamController.addQuestions)
app.delete('/api/exams/:id/questions/:questionId', authMiddleware, ExamController.removeQuestion)

// ============================================
// EXAM ATTEMPT ROUTES (Taking exams)
// ============================================
app.post('/api/exams/:id/start', authMiddleware, AttemptController.startAttempt)
app.get('/api/attempts/:id', authMiddleware, AttemptController.getAttemptById)
app.post('/api/attempts/:id/answer', authMiddleware, AttemptController.submitAnswer)
app.post('/api/attempts/:id/submit', authMiddleware, AttemptController.submitExam)
app.post('/api/attempts/:id/abandon', authMiddleware, AttemptController.abandonAttempt)
app.get('/api/attempts/:id/results', authMiddleware, AttemptController.getResults)
app.get('/api/users/me/attempts', authMiddleware, AttemptController.getUserAttempts)

// ============================================
// DASHBOARD ROUTES (User stats and activity)
// ============================================
app.get('/api/dashboard/stats', authMiddleware, DashboardController.getStats)
app.get('/api/dashboard/recent', authMiddleware, DashboardController.getRecentActivity)

// ============================================
// ADMIN ROUTES (Role-based access)
// ============================================
app.get('/api/admin/users', authMiddleware, requireModerator(), AdminController.getUsers)
app.put(
  '/api/admin/users/:id/role',
  authMiddleware,
  requireSuperAdmin(),
  AdminController.updateUserRole
)
app.put(
  '/api/admin/users/:id/status',
  authMiddleware,
  requireModerator(),
  AdminController.updateUserStatus
)
app.get(
  '/api/admin/users/:id/contributions',
  authMiddleware,
  requireModerator(),
  AdminController.getUserContributions
)

// Contributor management
app.post(
  '/api/admin/contributors',
  authMiddleware,
  requireModerator(),
  AdminController.assignContributor
)
app.delete(
  '/api/admin/contributors/:userId/categories/:categoryId',
  authMiddleware,
  requireModerator(),
  AdminController.removeContributor
)
app.get(
  '/api/admin/categories/:id/contributors',
  authMiddleware,
  requireModerator(),
  AdminController.getCategoryContributors
)

// ============================================
// ANALYTICS ROUTES
// ============================================

// User analytics (authenticated users)
app.get('/api/analytics/user/performance', authMiddleware, AnalyticsController.getUserPerformance)
app.get('/api/analytics/user/categories', authMiddleware, AnalyticsController.getCategoryPerformance)
app.get('/api/analytics/user/weakest-topics', authMiddleware, AnalyticsController.getWeakestTopics)
app.get('/api/analytics/user/strongest-topics', authMiddleware, AnalyticsController.getStrongestTopics)
app.get('/api/analytics/user/progress', authMiddleware, AnalyticsController.getProgressOverTime)

// Admin/Moderator analytics
app.get('/api/analytics/questions', authMiddleware, requireModerator(), AnalyticsController.getQuestionAnalytics)
app.get('/api/analytics/overall', authMiddleware, requireModerator(), AnalyticsController.getOverallStats)
app.get('/api/analytics/daily-activity', authMiddleware, requireModerator(), AnalyticsController.getDailyActivity)
app.get('/api/analytics/users/:userId/performance', authMiddleware, requireModerator(), AnalyticsController.getSpecificUserPerformance)

// ============================================
// WEBSOCKET
// ============================================

// WebSocket endpoint
app.get(
  '/ws',
  upgradeWebSocket((c) => {
    const clientId = randomUUID()

    return {
      onOpen(_event, ws) {
        // Add client to manager
        wsManager.addClient(clientId, ws.raw as any)

        // Send welcome message
        ws.send(
          JSON.stringify({
            type: 'connected',
            clientId,
            message: 'Connected to WebSocket server'
          })
        )
      },

      onMessage(event, ws) {
        try {
          const data = JSON.parse(event.data.toString())

          // Handle different message types
          switch (data.type) {
            case 'authenticate':
              handleAuthenticate(ws, clientId, data.token)
              break

            case 'join-room':
              wsManager.joinRoom(clientId, data.roomId)
              ws.send(
                JSON.stringify({
                  type: 'room-joined',
                  roomId: data.roomId
                })
              )
              // Notify others in the room
              wsManager.sendToRoom(
                data.roomId,
                {
                  type: 'user-joined',
                  clientId
                },
                clientId
              )
              break

            case 'leave-room':
              if (data.roomId) {
                wsManager.leaveRoom(clientId, data.roomId)
                ws.send(
                  JSON.stringify({
                    type: 'room-left',
                    roomId: data.roomId
                  })
                )
                // Notify others in the room
                wsManager.sendToRoom(data.roomId, {
                  type: 'user-left',
                  clientId
                })
              }
              break

            case 'message':
              // Broadcast message to room or all clients
              if (data.roomId) {
                wsManager.sendToRoom(
                  data.roomId,
                  {
                    type: 'message',
                    from: clientId,
                    message: data.message,
                    timestamp: new Date().toISOString()
                  },
                  clientId
                )
              } else {
                wsManager.broadcast(
                  {
                    type: 'message',
                    from: clientId,
                    message: data.message,
                    timestamp: new Date().toISOString()
                  },
                  clientId
                )
              }
              break

            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' }))
              break

            default:
              ws.send(
                JSON.stringify({
                  type: 'error',
                  message: `Unknown message type: ${data.type}`
                })
              )
          }
        } catch (error: any) {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: error.message || 'Invalid message format'
            })
          )
        }
      },

      onClose() {
        wsManager.removeClient(clientId)
      }
    }
  })
)

// Handle WebSocket authentication
async function handleAuthenticate(ws: any, clientId: string, token: string) {
  try {
    if (!token) {
      ws.send(
        JSON.stringify({
          type: 'auth-error',
          message: 'Token is required'
        })
      )
      return
    }

    // Verify JWT token
    const payload = await AuthService.verifyToken(token)
    wsManager.setUserId(clientId, payload.userId)

    ws.send(
      JSON.stringify({
        type: 'authenticated',
        userId: payload.userId,
        email: payload.email
      })
    )
  } catch (error: any) {
    ws.send(
      JSON.stringify({
        type: 'auth-error',
        message: error.message || 'Authentication failed'
      })
    )
  }
}

export default {
  fetch: app.fetch,
  websocket
}
