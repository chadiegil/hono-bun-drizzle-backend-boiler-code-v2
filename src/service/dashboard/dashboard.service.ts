import { db } from '../../db/client'
import { examAttempts, exams, userAnswers } from '../../db/schema'
import { eq, sql, desc, and } from 'drizzle-orm'

export class DashboardService {
  /**
   * Get dashboard statistics for a user
   */
  static async getUserStats(userId: number) {
    // Get total attempts
    const [{ totalAttempts }] = await db
      .select({ totalAttempts: sql<number>`count(*)` })
      .from(examAttempts)
      .where(
        and(
          eq(examAttempts.userId, userId),
          eq(examAttempts.status, 'completed')
        )
      )

    // Get average score
    const [{ avgScore }] = await db
      .select({
        avgScore: sql<number>`COALESCE(AVG(CAST(${examAttempts.score} AS DECIMAL)), 0)`
      })
      .from(examAttempts)
      .where(
        and(
          eq(examAttempts.userId, userId),
          eq(examAttempts.status, 'completed')
        )
      )

    // Get total questions answered
    const [{ questionsAnswered }] = await db
      .select({ questionsAnswered: sql<number>`count(*)` })
      .from(userAnswers)
      .innerJoin(examAttempts, eq(userAnswers.attemptId, examAttempts.id))
      .where(eq(examAttempts.userId, userId))

    return {
      totalAttempts: Number(totalAttempts) || 0,
      averageScore: Number(avgScore) || 0,
      questionsAnswered: Number(questionsAnswered) || 0
    }
  }

  /**
   * Get recent activity for a user
   */
  static async getRecentActivity(userId: number, limit: number = 10) {
    const attempts = await db
      .select({
        attempt: examAttempts,
        exam: exams
      })
      .from(examAttempts)
      .innerJoin(exams, eq(examAttempts.examId, exams.id))
      .where(
        and(
          eq(examAttempts.userId, userId),
          eq(examAttempts.status, 'completed')
        )
      )
      .orderBy(desc(examAttempts.completedAt))
      .limit(limit)

    return attempts.map((a) => ({
      id: a.attempt.id,
      type: 'exam' as const,
      title: a.exam.title,
      score: a.attempt.score ? parseFloat(a.attempt.score) : undefined,
      timestamp: a.attempt.completedAt?.toISOString() || a.attempt.startedAt.toISOString()
    }))
  }
}
