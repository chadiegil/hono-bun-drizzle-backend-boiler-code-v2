import { Context } from 'hono'
import { z } from 'zod'
import { ExamAttemptService } from '../../service/exam-attempt/exam-attempt.service'

const submitExamSchema = z.object({
  categoryId: z.number(),
  mode: z.enum(['mock', 'simulate']),
  answers: z.array(
    z.object({
      questionId: z.number(),
      selectedOptionId: z.number()
    })
  )
})

export class ExamAttemptController {
  static async submitExam(c: Context) {
    try {
      const user = c.get('user')
      const body = await c.req.json()
      const validatedData = submitExamSchema.parse(body)

      const result = await ExamAttemptService.submitExamAttempt({
        userId: user.id,
        categoryId: validatedData.categoryId,
        mode: validatedData.mode,
        answers: validatedData.answers
      })

      return c.json({
        success: true,
        message: 'Exam submitted successfully',
        data: result
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return c.json({ success: false, message: 'Validation error', errors: error.errors }, 400)
      }
      console.error('Submit exam error:', error)
      return c.json({ success: false, message: error.message || 'Failed to submit exam' }, 500)
    }
  }

  static async getUserAttempts(c: Context) {
    try {
      const user = c.get('user')
      const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 10

      const attempts = await ExamAttemptService.getUserAttempts(user.id, limit)

      return c.json({
        success: true,
        data: attempts
      })
    } catch (error: any) {
      console.error('Get user attempts error:', error)
      return c.json({ success: false, message: error.message }, 500)
    }
  }

  static async getRecentActivity(c: Context) {
    try {
      const user = c.get('user')
      const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 5

      const activity = await ExamAttemptService.getRecentActivity(user.id, limit)

      return c.json({
        success: true,
        data: activity
      })
    } catch (error: any) {
      console.error('Get recent activity error:', error)
      return c.json({ success: false, message: error.message }, 500)
    }
  }
}
