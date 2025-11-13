import { db } from '../../db/client'
import { users, contributorAssignments } from '../../db/schema'
import { eq, and, or, ilike, sql } from 'drizzle-orm'

export interface UpdateUserRoleData {
  userId: number
  role: 'super_admin' | 'moderator' | 'user'
  updatedBy: number
}

export interface AssignContributorData {
  userId: number
  categoryId: number
  assignedBy: number
  canCreateQuestions?: boolean
  canEditQuestions?: boolean
  canDeleteQuestions?: boolean
  canCreateExams?: boolean
  notes?: string
}

export interface UserFilters {
  role?: string
  isActive?: boolean
  search?: string
  page?: number
  limit?: number
}

export class AdminService {
  /**
   * Get all users with filters
   */
  static async getUsers(filters: UserFilters = {}) {
    const page = filters.page || 1
    const limit = filters.limit || 20
    const offset = (page - 1) * limit

    let conditions = []

    if (filters.role) {
      conditions.push(eq(users.role, filters.role as any))
    }

    if (filters.isActive !== undefined) {
      conditions.push(eq(users.isActive, filters.isActive))
    }

    if (filters.search) {
      conditions.push(
        or(ilike(users.name, `%${filters.search}%`), ilike(users.email, `%${filters.search}%`))
      )
    }

    const query = conditions.length > 0 ? and(...conditions) : undefined

    const usersList = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(query)
      .limit(limit)
      .offset(offset)
      .orderBy(users.createdAt)

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(query)

    return {
      data: usersList,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit)
      }
    }
  }

  /**
   * Update user role
   */
  static async updateUserRole(data: UpdateUserRoleData) {
    const [updated] = await db
      .update(users)
      .set({
        role: data.role,
        updatedAt: new Date()
      })
      .where(eq(users.id, data.userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive
      })

    if (!updated) {
      throw new Error('User not found')
    }

    return updated
  }

  /**
   * Activate or deactivate user
   */
  static async updateUserStatus(userId: number, isActive: boolean) {
    const [updated] = await db
      .update(users)
      .set({
        isActive,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive
      })

    if (!updated) {
      throw new Error('User not found')
    }

    return updated
  }

  /**
   * Assign contributor to category
   */
  static async assignContributor(data: AssignContributorData) {
    // Check if assignment already exists
    const [existing] = await db
      .select()
      .from(contributorAssignments)
      .where(
        and(
          eq(contributorAssignments.userId, data.userId),
          eq(contributorAssignments.categoryId, data.categoryId)
        )
      )
      .limit(1)

    if (existing) {
      // Update existing assignment
      const [updated] = await db
        .update(contributorAssignments)
        .set({
          canCreateQuestions: data.canCreateQuestions ?? true,
          canEditQuestions: data.canEditQuestions ?? false,
          canDeleteQuestions: data.canDeleteQuestions ?? false,
          canCreateExams: data.canCreateExams ?? false,
          isActive: true,
          notes: data.notes,
          updatedAt: new Date()
        })
        .where(eq(contributorAssignments.id, existing.id))
        .returning()

      return updated
    }

    // Create new assignment
    const [assignment] = await db
      .insert(contributorAssignments)
      .values({
        userId: data.userId,
        categoryId: data.categoryId,
        assignedBy: data.assignedBy,
        canCreateQuestions: data.canCreateQuestions ?? true,
        canEditQuestions: data.canEditQuestions ?? false,
        canDeleteQuestions: data.canDeleteQuestions ?? false,
        canCreateExams: data.canCreateExams ?? false,
        notes: data.notes
      })
      .returning()

    return assignment
  }

  /**
   * Remove contributor assignment
   */
  static async removeContributor(userId: number, categoryId: number) {
    const [removed] = await db
      .update(contributorAssignments)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(contributorAssignments.userId, userId),
          eq(contributorAssignments.categoryId, categoryId)
        )
      )
      .returning()

    if (!removed) {
      throw new Error('Contributor assignment not found')
    }

    return removed
  }

  /**
   * Get all contributors for a category
   */
  static async getCategoryContributors(categoryId: number) {
    const contributors = await db
      .select({
        assignment: contributorAssignments,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role
        }
      })
      .from(contributorAssignments)
      .innerJoin(users, eq(contributorAssignments.userId, users.id))
      .where(
        and(
          eq(contributorAssignments.categoryId, categoryId),
          eq(contributorAssignments.isActive, true)
        )
      )

    return contributors
  }

  /**
   * Get all categories a user contributes to
   */
  static async getUserContributions(userId: number) {
    const contributions = await db
      .select()
      .from(contributorAssignments)
      .where(
        and(eq(contributorAssignments.userId, userId), eq(contributorAssignments.isActive, true))
      )

    return contributions
  }
}
