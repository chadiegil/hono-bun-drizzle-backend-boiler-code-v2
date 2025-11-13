import { z } from 'zod'

// Define environment variable schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().optional(),
  CORS_ORIGIN: z.string().optional()
})

export type Env = z.infer<typeof envSchema>

/**
 * Validate environment variables on startup
 * Throws an error if validation fails
 */
export function validateEnv(): Env {
  try {
    const env = envSchema.parse(process.env)
    console.log('✅ Environment variables validated successfully')
    return env
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:')
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      throw new Error('Invalid environment configuration')
    }
    throw error
  }
}

// Export validated env for use throughout the app
export const env = validateEnv()
