import { db } from '../../db/client'
import { questions } from '../../db/schema'
import { eq, and, sql, isNull, or } from 'drizzle-orm'

export interface SubmitForReviewData {
  questionId: number
  userId: number
}

export interface ReviewQuestionData {
  questionId: number
  reviewerId: number
  status: 'approved' | 'rejected'
  notes?: string
}

export interface ReviewFilters {
  status?: string
  categoryId?: number
  createdBy?: number
  page?: number
  limit?: number
}

export class ReviewService {
  /**
   * Submit question for review
   */
  static async submitForReview(data: SubmitForReviewData) {
    // Check if question exists and user owns it
    const [question] = await db
      .select()
      .from(questions)
      .where(and(eq(questions.id, data.questionId), eq(questions.createdBy, data.userId)))
      .limit(1)

    if (!question) {
      throw new Error('Question not found or you do not have permission')
    }

    // Can only submit draft or rejected questions
    if (question.status !== 'draft' && question.status !== 'rejected') {
      throw new Error(`Cannot submit question with status: ${question.status}`)
    }

    // Update to pending_review
    const [updated] = await db
      .update(questions)
      .set({
        status: 'pending_review',
        submittedForReviewAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(questions.id, data.questionId))
      .returning()

    return updated
  }

  /**
   * Approve a question
   */
  static async approveQuestion(data: ReviewQuestionData) {
    const [question] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, data.questionId))
      .limit(1)

    if (!question) {
      throw new Error('Question not found')
    }

    if (question.status !== 'pending_review') {
      throw new Error(`Question must be in pending_review status (current: ${question.status})`)
    }

    const [updated] = await db
      .update(questions)
      .set({
        status: 'approved',
        reviewedBy: data.reviewerId,
        reviewedAt: new Date(),
        reviewNotes: data.notes,
        isPublic: true, // Auto-publish approved questions
        updatedAt: new Date()
      })
      .where(eq(questions.id, data.questionId))
      .returning()

    return updated
  }

  /**
   * Reject a question
   */
  static async rejectQuestion(data: ReviewQuestionData) {
    const [question] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, data.questionId))
      .limit(1)

    if (!question) {
      throw new Error('Question not found')
    }

    if (question.status !== 'pending_review') {
      throw new Error(`Question must be in pending_review status (current: ${question.status})`)
    }

    if (!data.notes) {
      throw new Error('Rejection notes are required')
    }

    const [updated] = await db
      .update(questions)
      .set({
        status: 'rejected',
        reviewedBy: data.reviewerId,
        reviewedAt: new Date(),
        reviewNotes: data.notes,
        updatedAt: new Date()
      })
      .where(eq(questions.id, data.questionId))
      .returning()

    return updated
  }

  /**
   * Bulk approve questions
   */
  static async bulkApprove(questionIds: number[], reviewerId: number, notes?: string) {
    // Verify all questions are in pending_review
    const questionsToApprove = await db
      .select()
      .from(questions)
      .where(and(sql`${questions.id} = ANY(${questionIds})`, eq(questions.status, 'pending_review')))

    if (questionsToApprove.length !== questionIds.length) {
      throw new Error(
        `Some questions are not in pending_review status (found ${questionsToApprove.length} of ${questionIds.length})`
      )
    }

    const updated = await db
      .update(questions)
      .set({
        status: 'approved',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: notes,
        isPublic: true,
        updatedAt: new Date()
      })
      .where(sql`${questions.id} = ANY(${questionIds})`)
      .returning()

    return updated
  }

  /**
   * Bulk reject questions
   */
  static async bulkReject(questionIds: number[], reviewerId: number, notes: string) {
    if (!notes) {
      throw new Error('Rejection notes are required')
    }

    // Verify all questions are in pending_review
    const questionsToReject = await db
      .select()
      .from(questions)
      .where(and(sql`${questions.id} = ANY(${questionIds})`, eq(questions.status, 'pending_review')))

    if (questionsToReject.length !== questionIds.length) {
      throw new Error(
        `Some questions are not in pending_review status (found ${questionsToReject.length} of ${questionIds.length})`
      )
    }

    const updated = await db
      .update(questions)
      .set({
        status: 'rejected',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: notes,
        updatedAt: new Date()
      })
      .where(sql`${questions.id} = ANY(${questionIds})`)
      .returning()

    return updated
  }

  /**
   * Get pending review queue
   */
  static async getPendingReviewQueue(filters: ReviewFilters = {}) {
    const page = filters.page || 1
    const limit = filters.limit || 20
    const offset = (page - 1) * limit

    let conditions = [eq(questions.status, 'pending_review'), isNull(questions.deletedAt)]

    if (filters.categoryId) {
      conditions.push(eq(questions.categoryId, filters.categoryId))
    }

    if (filters.createdBy) {
      conditions.push(eq(questions.createdBy, filters.createdBy))
    }

    const results = await db
      .select()
      .from(questions)
      .where(and(...conditions))
      .orderBy(questions.submittedForReviewAt)
      .limit(limit)
      .offset(offset)

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(questions)
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
   * Get questions by status
   */
  static async getQuestionsByStatus(status: string, filters: ReviewFilters = {}) {
    const page = filters.page || 1
    const limit = filters.limit || 20
    const offset = (page - 1) * limit

    let conditions = [eq(questions.status, status as any), isNull(questions.deletedAt)]

    if (filters.categoryId) {
      conditions.push(eq(questions.categoryId, filters.categoryId))
    }

    if (filters.createdBy) {
      conditions.push(eq(questions.createdBy, filters.createdBy))
    }

    const results = await db
      .select()
      .from(questions)
      .where(and(...conditions))
      .orderBy(questions.createdAt)
      .limit(limit)
      .offset(offset)

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(questions)
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
   * Get review statistics
   */
  static async getReviewStats(userId?: number) {
    let conditions = [isNull(questions.deletedAt)]

    if (userId) {
      conditions.push(eq(questions.createdBy, userId))
    }

    const [stats] = await db
      .select({
        total: sql<number>`count(*)`,
        draft: sql<number>`count(*) FILTER (WHERE status = 'draft')`,
        pending: sql<number>`count(*) FILTER (WHERE status = 'pending_review')`,
        approved: sql<number>`count(*) FILTER (WHERE status = 'approved')`,
        rejected: sql<number>`count(*) FILTER (WHERE status = 'rejected')`
      })
      .from(questions)
      .where(and(...conditions))

    return {
      total: Number(stats.total),
      draft: Number(stats.draft),
      pendingReview: Number(stats.pending),
      approved: Number(stats.approved),
      rejected: Number(stats.rejected)
    }
  }
}
