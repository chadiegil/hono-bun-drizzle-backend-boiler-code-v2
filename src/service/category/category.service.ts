import { db } from '../../db/client'
import { categories } from '../../db/schema'
import { eq, and, isNull, sql } from 'drizzle-orm'

export interface CreateCategoryData {
  name: string
  description?: string
  slug: string
  parentId?: number
}

export interface UpdateCategoryData {
  name?: string
  description?: string
  slug?: string
  parentId?: number
  isActive?: boolean
}

export class CategoryService {
  /**
   * Create a new category
   */
  static async createCategory(data: CreateCategoryData) {
    const [category] = await db
      .insert(categories)
      .values({
        name: data.name,
        description: data.description,
        slug: data.slug,
        parentId: data.parentId
      })
      .returning()

    return category
  }

  /**
   * Get all categories (optionally filter by active status)
   */
  static async getCategories(filters: { isActive?: boolean; parentId?: number | null; page?: number; limit?: number } = {}) {
    const page = filters.page || 1
    const limit = filters.limit || 20
    const offset = (page - 1) * limit

    let query = db.select().from(categories)

    const conditions = []

    if (filters.isActive !== undefined) {
      conditions.push(eq(categories.isActive, filters.isActive))
    }

    if (filters.parentId !== undefined) {
      if (filters.parentId === null) {
        conditions.push(isNull(categories.parentId))
      } else {
        conditions.push(eq(categories.parentId, filters.parentId))
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any
    }

    // Get total count for pagination
    const countQuery = db.select({ count: sql<number>`count(*)` }).from(categories)
    if (conditions.length > 0) {
      countQuery.where(and(...conditions)) as any
    }
    const [{ count: total }] = await countQuery

    // Get paginated data
    const data = await query.limit(limit).offset(offset)

    return {
      data,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit)
      }
    }
  }

  /**
   * Get category by ID
   */
  static async getCategoryById(id: number) {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1)

    return category
  }

  /**
   * Get category by slug
   */
  static async getCategoryBySlug(slug: string) {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1)

    return category
  }

  /**
   * Update category
   */
  static async updateCategory(id: number, data: UpdateCategoryData) {
    const [category] = await db
      .update(categories)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(categories.id, id))
      .returning()

    return category
  }

  /**
   * Delete category (check for dependencies first)
   */
  static async deleteCategory(id: number) {
    // Check if category has children
    const children = await db
      .select()
      .from(categories)
      .where(eq(categories.parentId, id))
      .limit(1)

    if (children.length > 0) {
      throw new Error('Cannot delete category with sub-categories')
    }

    // In a real app, also check for exams and questions using this category
    // For now, we'll just delete it
    await db.delete(categories).where(eq(categories.id, id))

    return { success: true }
  }

  /**
   * Get category tree (hierarchical structure)
   */
  static async getCategoryTree() {
    const allCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))

    // Build tree structure
    const categoryMap = new Map()
    const roots: any[] = []

    // First pass: create all nodes
    allCategories.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, children: [] })
    })

    // Second pass: build tree
    allCategories.forEach((cat) => {
      const node = categoryMap.get(cat.id)
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId)
        if (parent) {
          parent.children.push(node)
        }
      } else {
        roots.push(node)
      }
    })

    return roots
  }
}
