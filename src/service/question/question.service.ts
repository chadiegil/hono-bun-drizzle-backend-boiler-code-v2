import { db } from '../../db/client'
import { questions, questionOptions } from '../../db/schema'
import { eq, and, sql, ilike, or, inArray, isNull } from 'drizzle-orm'

export interface QuestionOption {
  optionText: string
  isCorrect: boolean
  order: number
  explanation?: string
  imageUrl?: string
}

export interface CreateQuestionData {
  questionText: string
  questionType: 'multiple_choice' | 'true_false' | 'essay' | 'fill_blank' | 'multiple_answer'
  categoryId?: number
  createdBy: number
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'mixed'
  points?: number
  explanation?: string
  imageUrl?: string
  tags?: string[]
  isPublic?: boolean
  options: QuestionOption[]
}

export interface UpdateQuestionData {
  questionText?: string
  questionType?: 'multiple_choice' | 'true_false' | 'essay' | 'fill_blank' | 'multiple_answer'
  categoryId?: number
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'mixed'
  points?: number
  explanation?: string
  imageUrl?: string
  tags?: string[]
  isPublic?: boolean
  options?: QuestionOption[]
}

export interface QuestionFilters {
  categoryId?: number
  difficulty?: string
  questionType?: string
  tags?: string[]
  isPublic?: boolean
  createdBy?: number
  search?: string
  page?: number
  limit?: number
}

export class QuestionService {
  /**
   * Create a question with options
   */
  static async createQuestion(data: CreateQuestionData) {
    // Validate question type has correct options
    this.validateQuestionOptions(data.questionType, data.options)

    // Insert question
    const [question] = await db
      .insert(questions)
      .values({
        questionText: data.questionText,
        questionType: data.questionType,
        categoryId: data.categoryId,
        createdBy: data.createdBy,
        difficulty: data.difficulty,
        points: data.points || 1,
        explanation: data.explanation,
        imageUrl: data.imageUrl,
        tags: data.tags,
        isPublic: data.isPublic || false
      })
      .returning()

    // Insert options for MC, True/False, Multiple Answer
    if (
      data.questionType !== 'essay' &&
      data.questionType !== 'fill_blank' &&
      data.options.length > 0
    ) {
      const optionsToInsert = data.options.map((opt) => ({
        questionId: question.id,
        optionText: opt.optionText,
        isCorrect: opt.isCorrect,
        order: opt.order,
        explanation: opt.explanation,
        imageUrl: opt.imageUrl
      }))

      await db.insert(questionOptions).values(optionsToInsert)
    }

    // Fetch complete question with options
    return await this.getQuestionById(question.id)
  }

  /**
   * Validate question options based on type
   */
  private static validateQuestionOptions(
    type: string,
    options: QuestionOption[]
  ) {
    if (type === 'essay' || type === 'fill_blank') {
      if (options.length > 0) {
        throw new Error(`${type} questions should not have options`)
      }
      return
    }

    if (type === 'true_false') {
      if (options.length !== 2) {
        throw new Error('True/False questions must have exactly 2 options')
      }
      const correctCount = options.filter((o) => o.isCorrect).length
      if (correctCount !== 1) {
        throw new Error('True/False questions must have exactly 1 correct answer')
      }
      return
    }

    if (type === 'multiple_choice') {
      if (options.length < 2) {
        throw new Error('Multiple choice questions must have at least 2 options')
      }
      const correctCount = options.filter((o) => o.isCorrect).length
      if (correctCount !== 1) {
        throw new Error('Multiple choice questions must have exactly 1 correct answer')
      }
      return
    }

    if (type === 'multiple_answer') {
      if (options.length < 2) {
        throw new Error('Multiple answer questions must have at least 2 options')
      }
      const correctCount = options.filter((o) => o.isCorrect).length
      if (correctCount < 1) {
        throw new Error('Multiple answer questions must have at least 1 correct answer')
      }
      return
    }
  }

  /**
   * Get questions with filters and pagination
   */
  static async getQuestions(filters: QuestionFilters = {}) {
    const page = filters.page || 1
    const limit = filters.limit || 20
    const offset = (page - 1) * limit

    let query = db
      .select({
        question: questions,
        optionsCount: sql<number>`count(${questionOptions.id})`.as('options_count')
      })
      .from(questions)
      .leftJoin(questionOptions, eq(questions.id, questionOptions.questionId))
      .groupBy(questions.id)
      .$dynamic()

    const conditions = [isNull(questions.deletedAt)]

    if (filters.categoryId) {
      conditions.push(eq(questions.categoryId, filters.categoryId))
    }

    if (filters.difficulty) {
      conditions.push(eq(questions.difficulty, filters.difficulty as any))
    }

    if (filters.questionType) {
      conditions.push(eq(questions.questionType, filters.questionType as any))
    }

    if (filters.isPublic !== undefined) {
      conditions.push(eq(questions.isPublic, filters.isPublic))
    }

    if (filters.createdBy) {
      conditions.push(eq(questions.createdBy, filters.createdBy))
    }

    if (filters.search) {
      conditions.push(ilike(questions.questionText, `%${filters.search}%`))
    }

    if (filters.tags && filters.tags.length > 0) {
      // Check if any tag matches
      conditions.push(
        sql`${questions.tags} && ARRAY[${sql.join(
          filters.tags.map((tag) => sql`${tag}`),
          sql`, `
        )}]::text[]`
      )
    }

    query = query.where(and(...conditions))
    query = query.limit(limit).offset(offset)

    const results = await query

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(questions)
      .where(and(...conditions))

    return {
      data: results.map((r) => r.question),
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit)
      }
    }
  }

  /**
   * Get question by ID with options
   */
  static async getQuestionById(id: number) {
    const [question] = await db
      .select()
      .from(questions)
      .where(and(eq(questions.id, id), isNull(questions.deletedAt)))
      .limit(1)

    if (!question) {
      return null
    }

    // Get options
    const options = await db
      .select()
      .from(questionOptions)
      .where(eq(questionOptions.questionId, id))
      .orderBy(questionOptions.order)

    return {
      ...question,
      options
    }
  }

  /**
   * Update question
   */
  static async updateQuestion(id: number, data: UpdateQuestionData) {
    // Check if question exists
    const existing = await this.getQuestionById(id)
    if (!existing) {
      throw new Error('Question not found')
    }

    // If options are being updated, validate them
    if (data.options) {
      const questionType = data.questionType || existing.questionType
      this.validateQuestionOptions(questionType, data.options)

      // Delete existing options
      await db.delete(questionOptions).where(eq(questionOptions.questionId, id))

      // Insert new options
      if (data.options.length > 0) {
        const optionsToInsert = data.options.map((opt) => ({
          questionId: id,
          optionText: opt.optionText,
          isCorrect: opt.isCorrect,
          order: opt.order,
          explanation: opt.explanation,
          imageUrl: opt.imageUrl
        }))

        await db.insert(questionOptions).values(optionsToInsert)
      }
    }

    // Update question
    const { options, ...updateData } = data
    const [updated] = await db
      .update(questions)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(questions.id, id))
      .returning()

    return await this.getQuestionById(id)
  }

  /**
   * Delete question (soft delete)
   */
  static async deleteQuestion(id: number) {
    const [deleted] = await db
      .update(questions)
      .set({ deletedAt: new Date() })
      .where(eq(questions.id, id))
      .returning()

    return deleted
  }

  /**
   * Update question statistics (after user answers)
   */
  static async updateQuestionStats(id: number, isCorrect: boolean) {
    await db
      .update(questions)
      .set({
        usageCount: sql`${questions.usageCount} + 1`,
        totalAnswerCount: sql`${questions.totalAnswerCount} + 1`,
        correctAnswerCount: isCorrect
          ? sql`${questions.correctAnswerCount} + 1`
          : questions.correctAnswerCount
      })
      .where(eq(questions.id, id))
  }

  /**
   * Search questions by text
   */
  static async searchQuestions(query: string, limit = 10) {
    const results = await db
      .select()
      .from(questions)
      .where(
        and(
          ilike(questions.questionText, `%${query}%`),
          isNull(questions.deletedAt),
          eq(questions.isPublic, true)
        )
      )
      .limit(limit)

    return results
  }
}
