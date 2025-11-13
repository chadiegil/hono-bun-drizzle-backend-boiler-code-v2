import { Context, Next } from 'hono'
import { db } from '../db/client'
import { contributorAssignments } from '../db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * Role-based access control middleware
 * Checks if user has required role
 */
export function requireRole(...allowedRoles: ('super_admin' | 'moderator' | 'user')[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user')

    if (!user) {
      return c.json({ success: false, message: 'Unauthorized' }, 401)
    }

    if (!user.isActive) {
      return c.json({ success: false, message: 'Account is inactive' }, 403)
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        {
          success: false,
          message: 'Forbidden: Insufficient permissions',
          required: allowedRoles,
          current: user.role
        },
        403
      )
    }

    await next()
  }
}

/**
 * Super admin only
 */
export const requireSuperAdmin = () => requireRole('super_admin')

/**
 * Moderator or super admin
 */
export const requireModerator = () => requireRole('super_admin', 'moderator')

/**
 * Check if user is contributor for a specific category
 */
export async function isContributor(userId: number, categoryId: number): Promise<boolean> {
  const [assignment] = await db
    .select()
    .from(contributorAssignments)
    .where(
      and(
        eq(contributorAssignments.userId, userId),
        eq(contributorAssignments.categoryId, categoryId),
        eq(contributorAssignments.isActive, true)
      )
    )
    .limit(1)

  return !!assignment
}

/**
 * Get contributor permissions for a category
 */
export async function getContributorPermissions(userId: number, categoryId: number) {
  const [assignment] = await db
    .select()
    .from(contributorAssignments)
    .where(
      and(
        eq(contributorAssignments.userId, userId),
        eq(contributorAssignments.categoryId, categoryId),
        eq(contributorAssignments.isActive, true)
      )
    )
    .limit(1)

  if (!assignment) {
    return null
  }

  return {
    canCreateQuestions: assignment.canCreateQuestions,
    canEditQuestions: assignment.canEditQuestions,
    canDeleteQuestions: assignment.canDeleteQuestions,
    canCreateExams: assignment.canCreateExams
  }
}

/**
 * Check if user can create questions in category
 */
export async function canCreateQuestion(
  user: { id: number; role: string },
  categoryId?: number
): Promise<boolean> {
  // Super admin and moderators can always create
  if (user.role === 'super_admin' || user.role === 'moderator') {
    return true
  }

  // If no category, only admins/moderators can create
  if (!categoryId) {
    return false
  }

  // Check contributor permissions
  const perms = await getContributorPermissions(user.id, categoryId)
  return perms?.canCreateQuestions || false
}

/**
 * Check if user can edit a question
 */
export async function canEditQuestion(
  user: { id: number; role: string },
  question: { createdBy: number; categoryId?: number | null }
): Promise<boolean> {
  // Super admin can edit anything
  if (user.role === 'super_admin') {
    return true
  }

  // Users can edit their own questions
  if (question.createdBy === user.id) {
    return true
  }

  // Moderators can edit anything
  if (user.role === 'moderator') {
    return true
  }

  // Contributors can edit if they have permission
  if (question.categoryId) {
    const perms = await getContributorPermissions(user.id, question.categoryId)
    return perms?.canEditQuestions || false
  }

  return false
}

/**
 * Check if user can delete a question
 */
export async function canDeleteQuestion(
  user: { id: number; role: string },
  question: { createdBy: number; categoryId?: number | null }
): Promise<boolean> {
  // Super admin can delete anything
  if (user.role === 'super_admin') {
    return true
  }

  // Users can delete their own questions
  if (question.createdBy === user.id) {
    return true
  }

  // Moderators can delete anything
  if (user.role === 'moderator') {
    return true
  }

  // Contributors can delete if they have permission
  if (question.categoryId) {
    const perms = await getContributorPermissions(user.id, question.categoryId)
    return perms?.canDeleteQuestions || false
  }

  return false
}

/**
 * Check if user can create exams
 */
export async function canCreateExam(
  user: { id: number; role: string },
  categoryId?: number
): Promise<boolean> {
  // Super admin and moderators can always create
  if (user.role === 'super_admin' || user.role === 'moderator') {
    return true
  }

  // If no category, only admins/moderators can create
  if (!categoryId) {
    return false
  }

  // Check contributor permissions
  const perms = await getContributorPermissions(user.id, categoryId)
  return perms?.canCreateExams || false
}

/**
 * Check if user can edit an exam
 */
export async function canEditExam(
  user: { id: number; role: string },
  exam: { createdBy: number; categoryId?: number | null }
): Promise<boolean> {
  // Super admin can edit anything
  if (user.role === 'super_admin') {
    return true
  }

  // Users can edit their own exams
  if (exam.createdBy === user.id) {
    return true
  }

  // Moderators can edit anything
  if (user.role === 'moderator') {
    return true
  }

  return false
}

/**
 * Check if user can delete an exam
 */
export async function canDeleteExam(
  user: { id: number; role: string },
  exam: { createdBy: number; categoryId?: number | null }
): Promise<boolean> {
  // Super admin can delete anything
  if (user.role === 'super_admin') {
    return true
  }

  // Users can delete their own exams
  if (exam.createdBy === user.id) {
    return true
  }

  // Moderators can delete anything
  if (user.role === 'moderator') {
    return true
  }

  return false
}
