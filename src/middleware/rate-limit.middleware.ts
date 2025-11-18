import { Context, Next } from 'hono'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 5 * 60 * 1000)

export interface RateLimitOptions {
  windowMs?: number // Time window in milliseconds
  max?: number // Max requests per window
  message?: string
  statusCode?: number
  keyGenerator?: (c: Context) => string
}

/**
 * Rate limiting middleware
 * Limits requests per IP address within a time window
 */
export function rateLimiter(options: RateLimitOptions = {}) {
  const isDevelopment = process.env.NODE_ENV === 'development'

  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = isDevelopment ? 10000 : 1000, // 10000 in dev, 1000 in production
    message = 'Too many requests, please try again later',
    statusCode = 429,
    keyGenerator = (c: Context) => {
      // Get IP from various possible headers
      // Cloudflare passes the real IP in CF-Connecting-IP header
      const ip =
        c.req.header('cf-connecting-ip') ||
        c.req.header('x-real-ip') ||
        c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
        'unknown'
      return ip
    }
  } = options

  return async (c: Context, next: Next) => {
    const key = keyGenerator(c)
    const now = Date.now()

    if (!store[key] || store[key].resetTime < now) {
      // Initialize or reset
      store[key] = {
        count: 1,
        resetTime: now + windowMs
      }
    } else {
      store[key].count++
    }

    const { count, resetTime } = store[key]
    const remaining = Math.max(0, max - count)

    // Set rate limit headers
    c.header('X-RateLimit-Limit', max.toString())
    c.header('X-RateLimit-Remaining', remaining.toString())
    c.header('X-RateLimit-Reset', new Date(resetTime).toISOString())

    if (count > max) {
      const retryAfter = Math.ceil((resetTime - now) / 1000)
      c.header('Retry-After', retryAfter.toString())

      return c.json(
        {
          success: false,
          message,
          retryAfter
        },
        statusCode as any
      )
    }

    await next()
  }
}

/**
 * Stricter rate limit for auth endpoints
 * Relaxed in development, strict in production
 */
export function authRateLimiter() {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 1000 : 500, // 1000 in dev, 500 in production (increased for testing)
    message: 'Too many authentication attempts, please try again later'
  })
}
