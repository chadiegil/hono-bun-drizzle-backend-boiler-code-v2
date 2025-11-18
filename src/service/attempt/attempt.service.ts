import { db } from '../../db/client'
import { examAttempts, userAnswers, exams, questions, questionOptions, examQuestions } from '../../db/schema'
import { eq, and, sql, inArray, isNull, desc } from 'drizzle-orm'

export interface StartAttemptData {
  examId: number
  userId: number
  metadata?: {
    ipAddress?: string
    userAgent?: string
    [key: string]: any
  }
}

export interface SubmitAnswerData {
  attemptId: number
  questionId: number
  selectedOptionId?: number
  selectedOptionIds?: number[]
  textAnswer?: string
  timeSpent?: number
  markedForReview?: boolean
}

export interface AttemptFilters {
  userId?: number
  examId?: number
  status?: string
  page?: number
  limit?: number
}

export class AttemptService {
  /**
   * Start a new exam attempt
   * Validates exam is published, checks attempt limits, creates attempt record
   */
  static async startAttempt(data: StartAttemptData) {
    const { examId, userId, metadata } = data

    // Get exam details
    const exam = await db
      .select()
      .from(exams)
      .where(and(eq(exams.id, examId), isNull(exams.deletedAt)))
      .limit(1)

    if (!exam || exam.length === 0) {
      throw new Error('Exam not found')
    }

    const examData = exam[0]

    // Check if exam is published
    if (!examData.isPublished) {
      throw new Error('Exam is not published yet')
    }

    // Check if exam has questions
    const [{ count: questionCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(examQuestions)
      .where(eq(examQuestions.examId, examId))

    if (Number(questionCount) === 0) {
      throw new Error('Exam has no questions')
    }

    // Check attempts limit
    if (examData.attemptsAllowed !== null) {
      const [{ count: attemptCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(examAttempts)
        .where(
          and(
            eq(examAttempts.examId, examId),
            eq(examAttempts.userId, userId),
            eq(examAttempts.status, 'completed')
          )
        )

      if (Number(attemptCount) >= examData.attemptsAllowed) {
        throw new Error(`Maximum attempts (${examData.attemptsAllowed}) reached for this exam`)
      }
    }

    // Create attempt record
    const [attempt] = await db
      .insert(examAttempts)
      .values({
        examId,
        userId,
        status: 'in_progress',
        startedAt: new Date(),
        maxPoints: examData.totalPoints,
        currentQuestionIndex: 0,
        timeRemaining: examData.duration ? examData.duration * 60 : null, // convert minutes to seconds
        metadata: metadata || null
      })
      .returning()

    // Get first question
    const questions = await this.getExamQuestionsForAttempt(examId, examData.randomizeQuestions || false)

    return {
      attempt,
      exam: examData,
      firstQuestion: questions[0] || null,
      totalQuestions: questions.length
    }
  }

  /**
   * Get exam questions for an attempt, with optional randomization
   */
  private static async getExamQuestionsForAttempt(examId: number, randomize: boolean) {
    let query = db
      .select({
        examQuestion: examQuestions,
        question: questions
      })
      .from(examQuestions)
      .innerJoin(questions, eq(examQuestions.questionId, questions.id))
      .where(and(eq(examQuestions.examId, examId), isNull(questions.deletedAt)))

    if (randomize) {
      query = query.orderBy(sql`RANDOM()`) as any
    } else {
      query = query.orderBy(examQuestions.order) as any
    }

    const examQuestionsList = await query

    // Get all question IDs
    const questionIds = examQuestionsList.map((eq) => eq.question.id)

    if (questionIds.length === 0) {
      return []
    }

    // Get all options for these questions
    const allOptions = await db
      .select()
      .from(questionOptions)
      .where(inArray(questionOptions.questionId, questionIds))
      .orderBy(questionOptions.order)

    // Group options by question ID
    const optionsByQuestion = allOptions.reduce(
      (acc, option) => {
        if (!acc[option.questionId]) {
          acc[option.questionId] = []
        }
        acc[option.questionId].push(option)
        return acc
      },
      {} as Record<number, typeof allOptions>
    )

    // Combine questions with their options
    return examQuestionsList.map((eq) => ({
      ...eq.question,
      examQuestionId: eq.examQuestion.id,
      order: eq.examQuestion.order,
      points: eq.examQuestion.points,
      isRequired: eq.examQuestion.isRequired,
      options: optionsByQuestion[eq.question.id] || []
    }))
  }

  /**
   * Get attempt by ID with all details
   */
  static async getAttemptById(id: number) {
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, id))
      .limit(1)

    if (!attempt) {
      return null
    }

    // Get exam details
    const [exam] = await db.select().from(exams).where(eq(exams.id, attempt.examId)).limit(1)

    // Get all answers for this attempt
    const answers = await db
      .select({
        answer: userAnswers,
        question: questions,
        selectedOption: questionOptions
      })
      .from(userAnswers)
      .leftJoin(questions, eq(userAnswers.questionId, questions.id))
      .leftJoin(questionOptions, eq(userAnswers.selectedOptionId, questionOptions.id))
      .where(eq(userAnswers.attemptId, id))

    return {
      ...attempt,
      exam,
      answers: answers.map((a) => ({
        ...a.answer,
        question: a.question,
        selectedOption: a.selectedOption
      }))
    }
  }

  /**
   * Submit answer for a question
   * Auto-grades objective questions (MC, TF, Multiple Answer)
   * Sets status to 'grading' for subjective questions (Essay, Fill Blank)
   */
  static async submitAnswer(data: SubmitAnswerData) {
    const { attemptId, questionId, selectedOptionId, selectedOptionIds, textAnswer, timeSpent, markedForReview } = data

    // Verify attempt exists and is in progress
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1)

    if (!attempt) {
      throw new Error('Attempt not found')
    }

    if (attempt.status !== 'in_progress') {
      throw new Error('Cannot submit answer for completed or abandoned attempt')
    }

    // Get question details
    const [question] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1)

    if (!question) {
      throw new Error('Question not found')
    }

    // Get exam question to get points
    const [examQuestion] = await db
      .select()
      .from(examQuestions)
      .where(and(eq(examQuestions.examId, attempt.examId), eq(examQuestions.questionId, questionId)))
      .limit(1)

    if (!examQuestion) {
      throw new Error('Question not part of this exam')
    }

    // Auto-grade based on question type
    const gradeResult = await this.autoGradeAnswer(
      question.questionType,
      questionId,
      selectedOptionId,
      selectedOptionIds,
      textAnswer
    )

    // Check if answer already exists (update) or create new
    const existingAnswer = await db
      .select()
      .from(userAnswers)
      .where(and(eq(userAnswers.attemptId, attemptId), eq(userAnswers.questionId, questionId)))
      .limit(1)

    const answerData = {
      selectedOptionId: selectedOptionId || null,
      selectedOptionIds: selectedOptionIds || null,
      textAnswer: textAnswer || null,
      isCorrect: gradeResult.isCorrect,
      pointsAwarded: gradeResult.pointsAwarded,
      timeSpent: timeSpent || 0,
      markedForReview: markedForReview || false,
      answeredAt: new Date()
    }

    let savedAnswer

    if (existingAnswer.length > 0) {
      // Update existing answer
      const [updated] = await db
        .update(userAnswers)
        .set({
          ...answerData,
          updatedAt: new Date()
        })
        .where(eq(userAnswers.id, existingAnswer[0].id))
        .returning()
      savedAnswer = updated
    } else {
      // Create new answer
      const [created] = await db
        .insert(userAnswers)
        .values({
          attemptId,
          questionId,
          ...answerData
        })
        .returning()
      savedAnswer = created
    }

    // Update question statistics if answer is graded
    if (gradeResult.isCorrect !== null) {
      await this.updateQuestionStats(questionId, gradeResult.isCorrect)
    }

    return {
      answer: savedAnswer,
      isCorrect: gradeResult.isCorrect,
      needsManualGrading: gradeResult.needsManualGrading
    }
  }

  /**
   * Auto-grade answer based on question type
   */
  private static async autoGradeAnswer(
    questionType: string,
    questionId: number,
    selectedOptionId?: number,
    selectedOptionIds?: number[],
    textAnswer?: string
  ): Promise<{ isCorrect: boolean | null; pointsAwarded: number; needsManualGrading: boolean }> {
    // Essay and fill-in-the-blank need manual grading
    if (questionType === 'essay' || questionType === 'fill_blank') {
      return {
        isCorrect: null,
        pointsAwarded: 0,
        needsManualGrading: true
      }
    }

    // Get correct options
    const correctOptions = await db
      .select()
      .from(questionOptions)
      .where(and(eq(questionOptions.questionId, questionId), eq(questionOptions.isCorrect, true)))

    const [examQuestion] = await db
      .select()
      .from(examQuestions)
      .where(eq(examQuestions.questionId, questionId))
      .limit(1)

    const points = examQuestion?.points || 1

    // Multiple choice and true/false - single correct answer
    if (questionType === 'multiple_choice' || questionType === 'true_false') {
      if (!selectedOptionId) {
        return { isCorrect: false, pointsAwarded: 0, needsManualGrading: false }
      }

      const isCorrect = correctOptions.some((opt) => opt.id === selectedOptionId)
      return {
        isCorrect,
        pointsAwarded: isCorrect ? points : 0,
        needsManualGrading: false
      }
    }

    // Multiple answer - must select ALL correct options and NO incorrect ones
    if (questionType === 'multiple_answer') {
      if (!selectedOptionIds || selectedOptionIds.length === 0) {
        return { isCorrect: false, pointsAwarded: 0, needsManualGrading: false }
      }

      const correctIds = correctOptions.map((opt) => opt.id).sort()
      const selectedIds = [...selectedOptionIds].sort()

      // Check if arrays are equal
      const isCorrect =
        correctIds.length === selectedIds.length &&
        correctIds.every((id, index) => id === selectedIds[index])

      return {
        isCorrect,
        pointsAwarded: isCorrect ? points : 0,
        needsManualGrading: false
      }
    }

    return { isCorrect: null, pointsAwarded: 0, needsManualGrading: true }
  }

  /**
   * Submit exam and calculate final score
   * Sets status to 'completed' or 'grading' if there are subjective questions
   */
  static async submitExam(attemptId: number) {
    // Get attempt
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1)

    if (!attempt) {
      throw new Error('Attempt not found')
    }

    if (attempt.status !== 'in_progress') {
      throw new Error('Attempt already submitted')
    }

    // Get exam
    const [exam] = await db.select().from(exams).where(eq(exams.id, attempt.examId)).limit(1)

    if (!exam) {
      throw new Error('Exam not found')
    }

    // Calculate score
    const scoreResult = await this.calculateScore(attemptId)

    // Calculate duration (time spent)
    const duration = Math.floor((new Date().getTime() - attempt.startedAt.getTime()) / 1000) // seconds

    // Determine if exam needs manual grading
    const hasSubjectiveQuestions = scoreResult.unansweredQuestions > 0 || scoreResult.needsGrading > 0
    const finalStatus = hasSubjectiveQuestions ? 'grading' : 'completed'

    // Determine pass/fail
    const isPassed = scoreResult.percentage >= exam.passingScore

    // Update attempt with final results
    const [updatedAttempt] = await db
      .update(examAttempts)
      .set({
        status: finalStatus as any,
        completedAt: new Date(),
        submittedAt: new Date(),
        duration,
        score: scoreResult.percentage.toString(),
        totalPoints: scoreResult.totalPoints,
        correctAnswers: scoreResult.correctAnswers,
        incorrectAnswers: scoreResult.incorrectAnswers,
        unansweredQuestions: scoreResult.unansweredQuestions,
        isPassed,
        updatedAt: new Date()
      })
      .where(eq(examAttempts.id, attemptId))
      .returning()

    return {
      attempt: updatedAttempt,
      score: scoreResult,
      isPassed,
      status: finalStatus
    }
  }

  /**
   * Calculate score for an attempt
   */
  static async calculateScore(attemptId: number) {
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1)

    if (!attempt) {
      throw new Error('Attempt not found')
    }

    // Get all questions in the exam
    const examQuestionsList = await db
      .select()
      .from(examQuestions)
      .where(eq(examQuestions.examId, attempt.examId))

    const totalQuestions = examQuestionsList.length
    const maxPoints = examQuestionsList.reduce((sum, eq) => sum + eq.points, 0)

    // Get all answers
    const answers = await db
      .select()
      .from(userAnswers)
      .where(eq(userAnswers.attemptId, attemptId))

    // Calculate statistics
    let correctAnswers = 0
    let incorrectAnswers = 0
    let needsGrading = 0
    let totalPoints = 0

    answers.forEach((answer) => {
      if (answer.isCorrect === true) {
        correctAnswers++
        totalPoints += answer.pointsAwarded || 0
      } else if (answer.isCorrect === false) {
        incorrectAnswers++
      } else {
        // null = needs grading
        needsGrading++
      }
    })

    const unansweredQuestions = totalQuestions - answers.length
    const percentage = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0

    return {
      totalQuestions,
      correctAnswers,
      incorrectAnswers,
      unansweredQuestions,
      needsGrading,
      totalPoints,
      maxPoints,
      percentage: Math.round(percentage * 100) / 100 // round to 2 decimal places
    }
  }

  /**
   * Get attempt results with answers
   * Respects exam's showAnswersAfter setting
   */
  static async getAttemptResults(attemptId: number, userId: number) {
    const attemptData = await this.getAttemptById(attemptId)

    if (!attemptData) {
      throw new Error('Attempt not found')
    }

    // Verify user owns this attempt
    if (attemptData.userId !== userId) {
      throw new Error('Unauthorized to view this attempt')
    }

    const exam = attemptData.exam

    if (!exam) {
      throw new Error('Exam not found')
    }

    // Check if user is allowed to see answers
    const showAnswers =
      exam.showAnswersAfter === 'immediately' ||
      (exam.showAnswersAfter === 'after_submit' && attemptData.status === 'completed')

    // Get questions with correct answers if allowed
    let questionsWithAnswers: any[] = []

    if (showAnswers) {
      const examQuestionsList = await db
        .select({
          examQuestion: examQuestions,
          question: questions
        })
        .from(examQuestions)
        .innerJoin(questions, eq(examQuestions.questionId, questions.id))
        .where(eq(examQuestions.examId, exam.id))
        .orderBy(examQuestions.order)

      const questionIds = examQuestionsList.map((eq) => eq.question.id)

      // Get all options
      const allOptions = await db
        .select()
        .from(questionOptions)
        .where(inArray(questionOptions.questionId, questionIds))
        .orderBy(questionOptions.order)

      // Group options by question ID
      const optionsByQuestion = allOptions.reduce(
        (acc, option) => {
          if (!acc[option.questionId]) {
            acc[option.questionId] = []
          }
          acc[option.questionId].push(option)
          return acc
        },
        {} as Record<number, typeof allOptions>
      )

      // Get user's answers
      const userAnswersMap = attemptData.answers.reduce(
        (acc, answer) => {
          acc[answer.questionId] = answer
          return acc
        },
        {} as Record<number, any>
      )

      questionsWithAnswers = examQuestionsList.map((eq) => ({
        ...eq.question,
        order: eq.examQuestion.order,
        points: eq.examQuestion.points,
        options: optionsByQuestion[eq.question.id] || [],
        userAnswer: userAnswersMap[eq.question.id] || null
      }))
    }

    return {
      attempt: attemptData,
      exam,
      showAnswers,
      questions: showAnswers ? questionsWithAnswers : []
    }
  }

  /**
   * Get user's attempts with filters and pagination
   */
  static async getUserAttempts(userId: number, filters: AttemptFilters = {}) {
    const page = filters.page || 1
    const limit = filters.limit || 20
    const offset = (page - 1) * limit

    let query = db
      .select({
        attempt: examAttempts,
        exam: exams
      })
      .from(examAttempts)
      .innerJoin(exams, eq(examAttempts.examId, exams.id))
      .$dynamic()

    const conditions = [eq(examAttempts.userId, userId)]

    if (filters.examId) {
      conditions.push(eq(examAttempts.examId, filters.examId))
    }

    if (filters.status) {
      conditions.push(eq(examAttempts.status, filters.status as any))
    }

    query = query
      .where(and(...conditions))
      .orderBy(desc(examAttempts.startedAt))
      .limit(limit)
      .offset(offset)

    const results = await query

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(examAttempts)
      .where(and(...conditions))

    return {
      data: results.map((r) => ({
        ...r.attempt,
        exam: r.exam
      })),
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit)
      }
    }
  }

  /**
   * Update question statistics after answer
   */
  private static async updateQuestionStats(questionId: number, isCorrect: boolean) {
    await db
      .update(questions)
      .set({
        usageCount: sql`${questions.usageCount} + 1`,
        totalAnswerCount: sql`${questions.totalAnswerCount} + 1`,
        correctAnswerCount: isCorrect
          ? sql`${questions.correctAnswerCount} + 1`
          : questions.correctAnswerCount
      })
      .where(eq(questions.id, questionId))
  }

  /**
   * Mark an attempt as abandoned
   */
  static async abandonAttempt(attemptId: number) {
    const [updatedAttempt] = await db
      .update(examAttempts)
      .set({
        status: 'abandoned' as any,
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(examAttempts.id, attemptId))
      .returning()

    return updatedAttempt
  }
}
