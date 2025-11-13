import app from './index'
import { env } from './config/env'

const port = parseInt(env.PORT)

const server = Bun.serve({
  port,
  fetch: app.fetch,
  websocket: app.websocket
})

console.log(`🚀 Server running on http://localhost:${port}`)
console.log(`🔌 WebSocket ready on ws://localhost:${port}/ws`)
console.log(`📝 Environment: ${env.NODE_ENV}`)
console.log(`🔒 CORS Origins: ${env.CORS_ORIGIN || 'default'}`)

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`)

  try {
    // Close server
    server.stop()
    console.log('✅ Server closed')

    // Close database connections if needed
    // await db.end()

    console.log('✅ Graceful shutdown complete')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error during shutdown:', error)
    process.exit(1)
  }
}

// Listen for termination signals
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error)
  shutdown('uncaughtException')
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  shutdown('unhandledRejection')
})
