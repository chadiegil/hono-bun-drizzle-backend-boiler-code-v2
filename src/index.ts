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
import { AuthController } from './controller/auth/auth.controller'
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
