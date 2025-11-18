import { db } from '../../db/client'
import { examAttempts, userAnswers, questions, questionOptions } from '../../db/schema'
import { eq, and, desc } from 'drizzle-orm'

export interface CreateExamAttemptInput {
  userId: number
  categoryId: number
  mode: 'mock' | 'simulate'
  answers: {
    questionId: number
    selectedOptionId: number
  }[]
}

export interface ExamAttemptResult {
  id: number
  score: number
  totalPoints: number
  maxPoints: number
  correctAnswers: number
  incorrectAnswers: number
  unansweredQuestions: number
  isPassed: boolean
  startedAt: Date
  completedAt: Date
}

export class ExamAttemptService {
  /**
   * Submit an exam attempt and calculate results
   */
  static async submitExamAttempt(input: CreateExamAttemptInput): Promise<ExamAttemptResult> {
    const { userId, categoryId, mode, answers } = input

    // Get all questions with their correct answers
    const questionIds = answers.map(a => a.questionId)
    const questionsData = await db
      .select()
      .from(questions)
      .where(and(
        eq(questions.categoryId, categoryId)
      ))

    const allOptions = await db
      .select()
      .from(questionOptions)
      .where(eq(questionOptions.questionId, questionIds[0]))

    // Calculate score
    let correctCount = 0
    let incorrectCount = 0
    const totalQuestions = questionsData.length

    // Create exam attempt record (without examId for now, we'll use categoryId in metadata)
    const [attempt] = await db
      .insert(examAttempts)
      .values({
        examId: categoryId, // Using categoryId as examId for now
        userId,
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        submittedAt: new Date()
      })
      .returning()

    // Process each answer
    for (const answer of answers) {
      const question = questionsData.find(q => q.id === answer.questionId)
      if (!question) continue

      // Get the correct option for this question
      const options = await db
        .select()
        .from(questionOptions)
        .where(eq(questionOptions.questionId, answer.questionId))

      const correctOption = options.find(opt => opt.isCorrect)
      const isCorrect = correctOption?.id === answer.selectedOptionId

      if (isCorrect) {
        correctCount++
      } else {
        incorrectCount++
      }

      // Save user answer
      await db.insert(userAnswers).values({
        attemptId: attempt.id,
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        isCorrect,
        timeSpent: 0
      })
    }

    const unansweredCount = totalQuestions - answers.length
    const maxPoints = totalQuestions
    const totalPoints = correctCount
    const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0
    const isPassed = score >= 60 // 60% passing grade

    // Update attempt with results
    await db
      .update(examAttempts)
      .set({
        score: score.toString(),
        totalPoints,
        maxPoints,
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        unansweredQuestions: unansweredCount,
        isPassed
      })
      .where(eq(examAttempts.id, attempt.id))

    return {
      id: attempt.id,
      score,
      totalPoints,
      maxPoints,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      unansweredQuestions: unansweredCount,
      isPassed,
      startedAt: attempt.startedAt,
      completedAt: new Date()
    }
  }

  /**
   * Get user's exam attempts history
   */
  static async getUserAttempts(userId: number, limit = 10) {
    const attempts = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.userId, userId))
      .orderBy(desc(examAttempts.completedAt))
      .limit(limit)

    return attempts
  }

  /**
   * Get user's recent activity for dashboard
   */
  static async getRecentActivity(userId: number, limit = 5) {
    const attempts = await db
      .select({
        id: examAttempts.id,
        examId: examAttempts.examId,
        score: examAttempts.score,
        correctAnswers: examAttempts.correctAnswers,
        totalPoints: examAttempts.totalPoints,
        isPassed: examAttempts.isPassed,
        completedAt: examAttempts.completedAt
      })
      .from(examAttempts)
      .where(and(
        eq(examAttempts.userId, userId),
        eq(examAttempts.status, 'completed')
      ))
      .orderBy(desc(examAttempts.completedAt))
      .limit(limit)

    return attempts
  }
}
