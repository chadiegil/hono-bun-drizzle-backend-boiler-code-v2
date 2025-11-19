import { db } from '../../db/client'
import { users } from '../../db/schema'
import { sql, gt } from 'drizzle-orm'

export class NotificationService {
  /**
   * Get count of new registrations since a given date
   */
  static async getNewRegistrationsCount(since?: Date) {
    const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000) // Default: last 24 hours

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(gt(users.createdAt, sinceDate))

    return Number(result?.count || 0)
  }

  /**
   * Get list of recent registrations
   */
  static async getRecentRegistrations(limit = 10) {
    const recentUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt
      })
      .from(users)
      .orderBy(sql`${users.createdAt} DESC`)
      .limit(limit)

    return recentUsers
  }
}
