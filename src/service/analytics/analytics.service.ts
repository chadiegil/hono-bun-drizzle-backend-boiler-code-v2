import { db } from '../../db/client'
import {
  examAttempts,
  userAnswers,
  questions,
  exams,
  categories,
  users,
  questionOptions
} from '../../db/schema'
import { eq, and, sql, desc, gte, lte, isNull, count, avg, sum } from 'drizzle-orm'

export interface UserPerformanceMetrics {
  totalAttempts: number
  completedAttempts: number
  averageScore: number
  highestScore: number
  lowestScore: number
  totalTimeSpent: number // seconds
  averageTimePerAttempt: number // seconds
  totalCorrectAnswers: number
  totalIncorrectAnswers: number
  totalUnansweredQuestions: number
  passRate: number // percentage
  improvementRate: number // comparing recent vs older attempts
  recentAttempts: Array<{
    id: number
    examName: string
    score: number
    completedAt: string
    duration: number
    isPassed: boolean
  }>
}

export interface CategoryPerformance {
  categoryId: number
  categoryName: string
  totalAttempts: number
  averageScore: number
  totalQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  accuracyRate: number
}

export interface QuestionAnalytics {
  questionId: number
  questionText: string
  questionType: string
  difficulty: string
  categoryName: string | null
  totalAttempts: number
  correctAttempts: number
  incorrectAttempts: number
  accuracyRate: number
  averageTimeSpent: number
  mostSelectedWrongOption: string | null
}

export interface OverallStats {
  totalUsers: number
  totalQuestions: number
  totalExams: number
  totalAttempts: number
  totalCompletedAttempts: number
  averageScoreAllUsers: number
  averageCompletionTime: number
  mostPopularCategory: string | null
  hardestQuestion: string | null
  easiestQuestion: string | null
}

export interface DailyActivity {
  date: string
  totalAttempts: number
  completedAttempts: number
  averageScore: number
  uniqueUsers: number
}

export interface ProgressOverTime {
  period: string // date or week
  averageScore: number
  totalAttempts: number
  completedAttempts: number
}

export class AnalyticsService {
  /**
   * Get user performance metrics
   */
  static async getUserPerformance(
    userId: number,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<UserPerformanceMetrics> {
    // Build date filter
    const dateFilters = [eq(examAttempts.userId, userId)]
    if (dateFrom) {
      dateFilters.push(gte(examAttempts.startedAt, dateFrom))
    }
    if (dateTo) {
      dateFilters.push(lte(examAttempts.startedAt, dateTo))
    }

    // Get basic stats
    const [stats] = await db
      .select({
        totalAttempts: count(examAttempts.id),
        completedAttempts: sql<number>`count(*) filter (where ${examAttempts.status} = 'completed')`,
        averageScore: avg(examAttempts.score),
        highestScore: sql<number>`max(${examAttempts.score})`,
        lowestScore: sql<number>`min(${examAttempts.score})`,
        totalTimeSpent: sum(examAttempts.duration),
        totalCorrectAnswers: sum(examAttempts.correctAnswers),
        totalIncorrectAnswers: sum(examAttempts.incorrectAnswers),
        totalUnansweredQuestions: sum(examAttempts.unansweredQuestions),
        passedAttempts: sql<number>`count(*) filter (where ${examAttempts.isPassed} = true)`
      })
      .from(examAttempts)
      .where(and(...dateFilters))

    const totalAttempts = Number(stats.totalAttempts) || 0
    const completedAttempts = Number(stats.completedAttempts) || 0
    const passedAttempts = Number(stats.passedAttempts) || 0
    const totalTimeSpent = Number(stats.totalTimeSpent) || 0

    // Get recent attempts with exam names
    const recentAttempts = await db
      .select({
        id: examAttempts.id,
        examName: exams.title,
        score: examAttempts.score,
        completedAt: examAttempts.completedAt,
        duration: examAttempts.duration,
        isPassed: examAttempts.isPassed
      })
      .from(examAttempts)
      .innerJoin(exams, eq(examAttempts.examId, exams.id))
      .where(
        and(
          eq(examAttempts.userId, userId),
          eq(examAttempts.status, 'completed'),
          ...(dateFrom ? [gte(examAttempts.startedAt, dateFrom)] : []),
          ...(dateTo ? [lte(examAttempts.startedAt, dateTo)] : [])
        )
      )
      .orderBy(desc(examAttempts.completedAt))
      .limit(10)

    // Calculate improvement rate (comparing recent 5 vs previous 5)
    let improvementRate = 0
    if (recentAttempts.length >= 5) {
      const recent5 = recentAttempts.slice(0, 5)
      const previous5 = recentAttempts.slice(5, 10)

      if (previous5.length > 0) {
        const recentAvg =
          recent5.reduce((sum, a) => sum + Number(a.score || 0), 0) / recent5.length
        const previousAvg =
          previous5.reduce((sum, a) => sum + Number(a.score || 0), 0) / previous5.length

        improvementRate = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0
      }
    }

    return {
      totalAttempts,
      completedAttempts,
      averageScore: Number(stats.averageScore) || 0,
      highestScore: Number(stats.highestScore) || 0,
      lowestScore: Number(stats.lowestScore) || 0,
      totalTimeSpent,
      averageTimePerAttempt: completedAttempts > 0 ? totalTimeSpent / completedAttempts : 0,
      totalCorrectAnswers: Number(stats.totalCorrectAnswers) || 0,
      totalIncorrectAnswers: Number(stats.totalIncorrectAnswers) || 0,
      totalUnansweredQuestions: Number(stats.totalUnansweredQuestions) || 0,
      passRate: completedAttempts > 0 ? (passedAttempts / completedAttempts) * 100 : 0,
      improvementRate,
      recentAttempts: recentAttempts.map((a) => ({
        id: a.id,
        examName: a.examName,
        score: Number(a.score) || 0,
        completedAt: a.completedAt?.toISOString() || '',
        duration: a.duration || 0,
        isPassed: a.isPassed || false
      }))
    }
  }

  /**
   * Get category performance for a user
   */
  static async getCategoryPerformance(userId: number): Promise<CategoryPerformance[]> {
    const results = await db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        totalAttempts: sql<number>`count(distinct ${examAttempts.id})`,
        averageScore: avg(examAttempts.score),
        totalQuestions: sql<number>`count(${userAnswers.id})`,
        correctAnswers: sql<number>`count(*) filter (where ${userAnswers.isCorrect} = true)`,
        incorrectAnswers: sql<number>`count(*) filter (where ${userAnswers.isCorrect} = false)`
      })
      .from(examAttempts)
      .innerJoin(exams, eq(examAttempts.examId, exams.id))
      .innerJoin(categories, eq(exams.categoryId, categories.id))
      .leftJoin(userAnswers, eq(userAnswers.attemptId, examAttempts.id))
      .where(
        and(
          eq(examAttempts.userId, userId),
          eq(examAttempts.status, 'completed')
        )
      )
      .groupBy(categories.id, categories.name)

    return results.map((r) => {
      const totalQuestions = Number(r.totalQuestions) || 0
      const correctAnswers = Number(r.correctAnswers) || 0

      return {
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        totalAttempts: Number(r.totalAttempts) || 0,
        averageScore: Number(r.averageScore) || 0,
        totalQuestions,
        correctAnswers,
        incorrectAnswers: Number(r.incorrectAnswers) || 0,
        accuracyRate: totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0
      }
    })
  }

  /**
   * Get question analytics (for moderators)
   */
  static async getQuestionAnalytics(
    questionId?: number,
    categoryId?: number,
    limit: number = 50
  ): Promise<QuestionAnalytics[]> {
    let query = db
      .select({
        questionId: questions.id,
        questionText: questions.questionText,
        questionType: questions.questionType,
        difficulty: questions.difficulty,
        categoryName: categories.name,
        totalAttempts: count(userAnswers.id),
        correctAttempts: sql<number>`count(*) filter (where ${userAnswers.isCorrect} = true)`,
        incorrectAttempts: sql<number>`count(*) filter (where ${userAnswers.isCorrect} = false)`,
        averageTimeSpent: avg(userAnswers.timeSpent)
      })
      .from(questions)
      .leftJoin(categories, eq(questions.categoryId, categories.id))
      .leftJoin(userAnswers, eq(userAnswers.questionId, questions.id))
      .where(isNull(questions.deletedAt))
      .groupBy(questions.id, questions.questionText, questions.questionType, questions.difficulty, categories.name)
      .orderBy(desc(count(userAnswers.id)))
      .limit(limit)
      .$dynamic()

    if (questionId) {
      query = query.where(eq(questions.id, questionId))
    }

    if (categoryId) {
      query = query.where(eq(questions.categoryId, categoryId))
    }

    const results = await query

    // Get most selected wrong option for each question
    const questionsWithWrongOptions = await Promise.all(
      results.map(async (q) => {
        const totalAttempts = Number(q.totalAttempts) || 0
        const correctAttempts = Number(q.correctAttempts) || 0

        let mostSelectedWrongOption: string | null = null

        if (totalAttempts > 0 && correctAttempts < totalAttempts) {
          // Find most selected wrong option
          const [wrongOption] = await db
            .select({
              optionText: questionOptions.optionText,
              selectionCount: count(userAnswers.id)
            })
            .from(userAnswers)
            .innerJoin(questionOptions, eq(userAnswers.selectedOptionId, questionOptions.id))
            .where(
              and(
                eq(userAnswers.questionId, q.questionId),
                eq(userAnswers.isCorrect, false)
              )
            )
            .groupBy(questionOptions.id, questionOptions.optionText)
            .orderBy(desc(count(userAnswers.id)))
            .limit(1)

          mostSelectedWrongOption = wrongOption?.optionText || null
        }

        return {
          questionId: q.questionId,
          questionText: q.questionText,
          questionType: q.questionType,
          difficulty: q.difficulty,
          categoryName: q.categoryName,
          totalAttempts,
          correctAttempts,
          incorrectAttempts: Number(q.incorrectAttempts) || 0,
          accuracyRate: totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0,
          averageTimeSpent: Number(q.averageTimeSpent) || 0,
          mostSelectedWrongOption
        }
      })
    )

    return questionsWithWrongOptions
  }

  /**
   * Get overall statistics (for admins/dashboard)
   */
  static async getOverallStats(): Promise<OverallStats> {
    // Get basic counts
    const [counts] = await db
      .select({
        totalUsers: sql<number>`(select count(*) from ${users})`,
        totalQuestions: sql<number>`(select count(*) from ${questions} where ${questions.deletedAt} is null)`,
        totalExams: sql<number>`(select count(*) from ${exams} where ${exams.deletedAt} is null)`,
        totalAttempts: count(examAttempts.id),
        totalCompletedAttempts: sql<number>`count(*) filter (where ${examAttempts.status} = 'completed')`,
        averageScore: avg(examAttempts.score),
        averageCompletionTime: avg(examAttempts.duration)
      })
      .from(examAttempts)

    // Get most popular category
    const [popularCategory] = await db
      .select({
        categoryName: categories.name,
        attemptCount: count(examAttempts.id)
      })
      .from(examAttempts)
      .innerJoin(exams, eq(examAttempts.examId, exams.id))
      .innerJoin(categories, eq(exams.categoryId, categories.id))
      .groupBy(categories.id, categories.name)
      .orderBy(desc(count(examAttempts.id)))
      .limit(1)

    // Get hardest question (lowest accuracy)
    const [hardestQuestion] = await db
      .select({
        questionText: questions.questionText,
        correctRate: sql<number>`
          count(*) filter (where ${userAnswers.isCorrect} = true)::float /
          nullif(count(*), 0) * 100
        `
      })
      .from(questions)
      .leftJoin(userAnswers, eq(userAnswers.questionId, questions.id))
      .where(isNull(questions.deletedAt))
      .groupBy(questions.id, questions.questionText)
      .having(sql`count(*) >= 5`) // at least 5 attempts
      .orderBy(sql`count(*) filter (where ${userAnswers.isCorrect} = true)::float / nullif(count(*), 0)`)
      .limit(1)

    // Get easiest question (highest accuracy)
    const [easiestQuestion] = await db
      .select({
        questionText: questions.questionText,
        correctRate: sql<number>`
          count(*) filter (where ${userAnswers.isCorrect} = true)::float /
          nullif(count(*), 0) * 100
        `
      })
      .from(questions)
      .leftJoin(userAnswers, eq(userAnswers.questionId, questions.id))
      .where(isNull(questions.deletedAt))
      .groupBy(questions.id, questions.questionText)
      .having(sql`count(*) >= 5`) // at least 5 attempts
      .orderBy(desc(sql`count(*) filter (where ${userAnswers.isCorrect} = true)::float / nullif(count(*), 0)`))
      .limit(1)

    return {
      totalUsers: Number(counts.totalUsers) || 0,
      totalQuestions: Number(counts.totalQuestions) || 0,
      totalExams: Number(counts.totalExams) || 0,
      totalAttempts: Number(counts.totalAttempts) || 0,
      totalCompletedAttempts: Number(counts.totalCompletedAttempts) || 0,
      averageScoreAllUsers: Number(counts.averageScore) || 0,
      averageCompletionTime: Number(counts.averageCompletionTime) || 0,
      mostPopularCategory: popularCategory?.categoryName || null,
      hardestQuestion: hardestQuestion?.questionText || null,
      easiestQuestion: easiestQuestion?.questionText || null
    }
  }

  /**
   * Get daily activity for a date range
   */
  static async getDailyActivity(dateFrom: Date, dateTo: Date): Promise<DailyActivity[]> {
    const results = await db
      .select({
        date: sql<string>`date(${examAttempts.startedAt})`,
        totalAttempts: count(examAttempts.id),
        completedAttempts: sql<number>`count(*) filter (where ${examAttempts.status} = 'completed')`,
        averageScore: avg(examAttempts.score),
        uniqueUsers: sql<number>`count(distinct ${examAttempts.userId})`
      })
      .from(examAttempts)
      .where(
        and(
          gte(examAttempts.startedAt, dateFrom),
          lte(examAttempts.startedAt, dateTo)
        )
      )
      .groupBy(sql`date(${examAttempts.startedAt})`)
      .orderBy(sql`date(${examAttempts.startedAt})`)

    return results.map((r) => ({
      date: r.date,
      totalAttempts: Number(r.totalAttempts) || 0,
      completedAttempts: Number(r.completedAttempts) || 0,
      averageScore: Number(r.averageScore) || 0,
      uniqueUsers: Number(r.uniqueUsers) || 0
    }))
  }

  /**
   * Get user progress over time
   */
  static async getProgressOverTime(
    userId: number,
    periodType: 'day' | 'week' | 'month' = 'week'
  ): Promise<ProgressOverTime[]> {
    let dateGroupBy
    switch (periodType) {
      case 'day':
        dateGroupBy = sql`date(${examAttempts.completedAt})`
        break
      case 'week':
        dateGroupBy = sql`date_trunc('week', ${examAttempts.completedAt})`
        break
      case 'month':
        dateGroupBy = sql`date_trunc('month', ${examAttempts.completedAt})`
        break
    }

    const results = await db
      .select({
        period: dateGroupBy,
        averageScore: avg(examAttempts.score),
        totalAttempts: count(examAttempts.id),
        completedAttempts: sql<number>`count(*) filter (where ${examAttempts.status} = 'completed')`
      })
      .from(examAttempts)
      .where(
        and(
          eq(examAttempts.userId, userId),
          eq(examAttempts.status, 'completed')
        )
      )
      .groupBy(dateGroupBy)
      .orderBy(dateGroupBy)

    return results.map((r) => ({
      period: r.period?.toString() || '',
      averageScore: Number(r.averageScore) || 0,
      totalAttempts: Number(r.totalAttempts) || 0,
      completedAttempts: Number(r.completedAttempts) || 0
    }))
  }

  /**
   * Get weakest topics for a user
   */
  static async getWeakestTopics(userId: number, limit: number = 5): Promise<CategoryPerformance[]> {
    const categoryPerformance = await this.getCategoryPerformance(userId)
    return categoryPerformance
      .sort((a, b) => a.accuracyRate - b.accuracyRate)
      .slice(0, limit)
  }

  /**
   * Get strongest topics for a user
   */
  static async getStrongestTopics(userId: number, limit: number = 5): Promise<CategoryPerformance[]> {
    const categoryPerformance = await this.getCategoryPerformance(userId)
    return categoryPerformance
      .sort((a, b) => b.accuracyRate - a.accuracyRate)
      .slice(0, limit)
  }
}
