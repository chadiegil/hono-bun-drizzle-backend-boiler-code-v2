import { Context, Next } from 'hono'
import { randomUUID } from 'crypto'

/**
 * Request ID middleware
 * Adds a unique ID to each request for tracing
 */
export async function requestId(c: Context, next: Next) {
  // Check if request already has an ID (from load balancer, etc.)
  const existingId = c.req.header('x-request-id')
  const requestId = existingId || randomUUID()

  // Store in context for use in handlers
  c.set('requestId', requestId)

  // Add to response headers
  c.header('X-Request-Id', requestId)

  // Log with request ID
  const originalError = console.error
  console.error = (...args) => {
    originalError(`[${requestId}]`, ...args)
  }

  await next()

  // Restore original console.error
  console.error = originalError
}
