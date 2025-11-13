import { db } from '../../db/client'
import { exams, examQuestions, questions, questionOptions } from '../../db/schema'
import { eq, and, sql, inArray, isNull } from 'drizzle-orm'

export interface CreateExamData {
  title: string
  description?: string
  slug: string
  categoryId?: number
  createdBy: number
  type: 'practice' | 'mock' | 'timed' | 'adaptive'
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'mixed'
  isPublic?: boolean
  isTemplate?: boolean
  instructions?: string
  passingScore?: number
  duration?: number
  randomizeQuestions?: boolean
  randomizeOptions?: boolean
  showAnswersAfter?: 'immediately' | 'after_submit' | 'never'
  allowReview?: boolean
  attemptsAllowed?: number
  shuffleQuestionPool?: boolean
  questionPoolSize?: number
}

export interface UpdateExamData {
  title?: string
  description?: string
  slug?: string
  categoryId?: number
  type?: 'practice' | 'mock' | 'timed' | 'adaptive'
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'mixed'
  isPublic?: boolean
  isTemplate?: boolean
  isPublished?: boolean
  instructions?: string
  passingScore?: number
  duration?: number
  randomizeQuestions?: boolean
  randomizeOptions?: boolean
  showAnswersAfter?: 'immediately' | 'after_submit' | 'never'
  allowReview?: boolean
  attemptsAllowed?: number
  shuffleQuestionPool?: boolean
  questionPoolSize?: number
}

export interface ExamFilters {
  type?: string
  difficulty?: string
  categoryId?: number
  isPublic?: boolean
  isPublished?: boolean
  createdBy?: number
  page?: number
  limit?: number
}

export class ExamService {
  /**
   * Create a new exam with basic information
   */
  static async createExam(data: CreateExamData) {
    const [exam] = await db
      .insert(exams)
      .values({
        title: data.title,
        description: data.description,
        slug: data.slug,
        categoryId: data.categoryId,
        createdBy: data.createdBy,
        type: data.type,
        difficulty: data.difficulty,
        isPublic: data.isPublic || false,
        isTemplate: data.isTemplate || false,
        instructions: data.instructions,
        passingScore: data.passingScore || 70,
        duration: data.duration,
        randomizeQuestions: data.randomizeQuestions || false,
        randomizeOptions: data.randomizeOptions || false,
        showAnswersAfter: data.showAnswersAfter || 'after_submit',
        allowReview: data.allowReview ?? true,
        attemptsAllowed: data.attemptsAllowed,
        shuffleQuestionPool: data.shuffleQuestionPool || false,
        questionPoolSize: data.questionPoolSize
      })
      .returning()

    return exam
  }

  /**
   * Get exams with filters and pagination
   */
  static async getExams(filters: ExamFilters = {}) {
    const page = filters.page || 1
    const limit = filters.limit || 20
    const offset = (page - 1) * limit

    let query = db.select().from(exams).$dynamic()

    const conditions = [isNull(exams.deletedAt)]

    if (filters.type) {
      conditions.push(eq(exams.type, filters.type as any))
    }

    if (filters.difficulty) {
      conditions.push(eq(exams.difficulty, filters.difficulty as any))
    }

    if (filters.categoryId) {
      conditions.push(eq(exams.categoryId, filters.categoryId))
    }

    if (filters.isPublic !== undefined) {
      conditions.push(eq(exams.isPublic, filters.isPublic))
    }

    if (filters.isPublished !== undefined) {
      conditions.push(eq(exams.isPublished, filters.isPublished))
    }

    if (filters.createdBy) {
      conditions.push(eq(exams.createdBy, filters.createdBy))
    }

    query = query.where(and(...conditions))
    query = query.limit(limit).offset(offset).orderBy(exams.createdAt)

    const results = await query

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(exams)
      .where(and(...conditions))

    return {
      data: results,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit)
      }
    }
  }

  /**
   * Get single exam by ID
   */
  static async getExamById(id: number) {
    const [exam] = await db
      .select()
      .from(exams)
      .where(and(eq(exams.id, id), isNull(exams.deletedAt)))
      .limit(1)

    return exam
  }

  /**
   * Update exam information
   */
  static async updateExam(id: number, data: UpdateExamData) {
    const [exam] = await db
      .update(exams)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(exams.id, id))
      .returning()

    return exam
  }

  /**
   * Soft delete exam by setting deletedAt timestamp
   */
  static async deleteExam(id: number) {
    const [exam] = await db
      .update(exams)
      .set({ deletedAt: new Date() })
      .where(eq(exams.id, id))
      .returning()

    return exam
  }

  /**
   * Publish exam by setting isPublished to true
   * Validates that exam has questions before publishing
   */
  static async publishExam(id: number) {
    // Check if exam has questions
    const questionsCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(examQuestions)
      .where(eq(examQuestions.examId, id))

    const [{ count }] = questionsCount

    if (Number(count) === 0) {
      throw new Error('Cannot publish exam without questions')
    }

    const [exam] = await db
      .update(exams)
      .set({
        isPublished: true,
        updatedAt: new Date()
      })
      .where(eq(exams.id, id))
      .returning()

    return exam
  }

  /**
   * Add multiple questions to an exam via the examQuestions junction table
   * Updates exam's totalQuestions and totalPoints counts
   */
  static async addQuestionsToExam(examId: number, questionIds: number[]) {
    if (questionIds.length === 0) {
      throw new Error('Question IDs array cannot be empty')
    }

    // Verify all questions exist and are not deleted
    const validQuestions = await db
      .select()
      .from(questions)
      .where(and(inArray(questions.id, questionIds), isNull(questions.deletedAt)))

    if (validQuestions.length !== questionIds.length) {
      throw new Error('Some questions not found or have been deleted')
    }

    // Get current max order for this exam
    const [maxOrderResult] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${examQuestions.order}), -1)` })
      .from(examQuestions)
      .where(eq(examQuestions.examId, examId))

    const maxOrder = maxOrderResult?.maxOrder ?? -1

    // Prepare questions to insert with their points and order
    const questionsToAdd = validQuestions.map((q, index) => ({
      examId,
      questionId: q.id,
      order: maxOrder + index + 1,
      points: q.points,
      isRequired: true
    }))

    // Insert into junction table
    await db.insert(examQuestions).values(questionsToAdd)

    // Calculate total points from all questions
    const totalPoints = validQuestions.reduce((sum, q) => sum + q.points, 0)

    // Update exam's totalQuestions and totalPoints
    await db
      .update(exams)
      .set({
        totalQuestions: sql`${exams.totalQuestions} + ${validQuestions.length}`,
        totalPoints: sql`${exams.totalPoints} + ${totalPoints}`,
        updatedAt: new Date()
      })
      .where(eq(exams.id, examId))

    return { added: validQuestions.length, totalPoints }
  }

  /**
   * Remove a question from an exam
   * Updates exam's totalQuestions and totalPoints counts
   */
  static async removeQuestionFromExam(examId: number, questionId: number) {
    // Get the question points before removing
    const [examQuestion] = await db
      .select()
      .from(examQuestions)
      .where(and(eq(examQuestions.examId, examId), eq(examQuestions.questionId, questionId)))
      .limit(1)

    if (!examQuestion) {
      throw new Error('Question not found in exam')
    }

    // Delete from junction table
    await db
      .delete(examQuestions)
      .where(and(eq(examQuestions.examId, examId), eq(examQuestions.questionId, questionId)))

    // Update exam's totalQuestions and totalPoints
    await db
      .update(exams)
      .set({
        totalQuestions: sql`${exams.totalQuestions} - 1`,
        totalPoints: sql`${exams.totalPoints} - ${examQuestion.points}`,
        updatedAt: new Date()
      })
      .where(eq(exams.id, examId))

    return { success: true }
  }

  /**
   * Get all questions for an exam with their options
   * Returns questions in order with full details
   */
  static async getExamQuestions(examId: number) {
    // Get exam questions with question details
    const examQuestionsList = await db
      .select({
        examQuestion: examQuestions,
        question: questions
      })
      .from(examQuestions)
      .innerJoin(questions, eq(examQuestions.questionId, questions.id))
      .where(and(eq(examQuestions.examId, examId), isNull(questions.deletedAt)))
      .orderBy(examQuestions.order)

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
   * Get exam preview with basic info and question count
   * Does not return actual questions - useful for displaying exam before starting
   */
  static async getExamPreview(examId: number) {
    const exam = await this.getExamById(examId)

    if (!exam) {
      throw new Error('Exam not found')
    }

    // Get question count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(examQuestions)
      .where(eq(examQuestions.examId, examId))

    return {
      ...exam,
      questionCount: Number(count),
      // Don't include questions in preview
      questions: undefined
    }
  }
}
