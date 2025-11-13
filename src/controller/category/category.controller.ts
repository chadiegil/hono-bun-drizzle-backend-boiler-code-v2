import { Context } from 'hono'
import { z } from 'zod'
import { CategoryService } from '../../service/category/category.service'

// Validation schemas
export const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  parentId: z.number().optional()
})

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
  parentId: z.number().optional(),
  isActive: z.boolean().optional()
})

export class CategoryController {
  /**
   * Create a new category
   * POST /api/categories
   */
  static async create(c: Context) {
    try {
      const body = await c.req.json()
      const validatedData = createCategorySchema.parse(body)

      const category = await CategoryService.createCategory(validatedData)

      return c.json(
        {
          success: true,
          message: 'Category created successfully',
          data: category
        },
        201
      )
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return c.json(
          {
            success: false,
            message: 'Validation error',
            errors: error.errors
          },
          400
        )
      }

      // Check for unique constraint violation
      if (error.code === '23505') {
        return c.json(
          {
            success: false,
            message: 'Category name or slug already exists'
          },
          409
        )
      }

      return c.json(
        {
          success: false,
          message: error.message || 'Failed to create category'
        },
        500
      )
    }
  }

  /**
   * Get all categories
   * GET /api/categories
   */
  static async getAll(c: Context) {
    try {
      const isActive = c.req.query('isActive')
      const parentId = c.req.query('parentId')

      const filters: any = {}
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true'
      }
      if (parentId !== undefined) {
        filters.parentId = parentId === 'null' ? null : parseInt(parentId)
      }

      const categories = await CategoryService.getCategories(filters)

      return c.json({
        success: true,
        data: categories
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to fetch categories'
        },
        500
      )
    }
  }

  /**
   * Get category tree
   * GET /api/categories/tree
   */
  static async getTree(c: Context) {
    try {
      const tree = await CategoryService.getCategoryTree()

      return c.json({
        success: true,
        data: tree
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to fetch category tree'
        },
        500
      )
    }
  }

  /**
   * Get single category by ID
   * GET /api/categories/:id
   */
  static async getById(c: Context) {
    try {
      const id = parseInt(c.req.param('id'))

      const category = await CategoryService.getCategoryById(id)

      if (!category) {
        return c.json(
          {
            success: false,
            message: 'Category not found'
          },
          404
        )
      }

      return c.json({
        success: true,
        data: category
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to fetch category'
        },
        500
      )
    }
  }

  /**
   * Get category by slug
   * GET /api/categories/slug/:slug
   */
  static async getBySlug(c: Context) {
    try {
      const slug = c.req.param('slug')

      const category = await CategoryService.getCategoryBySlug(slug)

      if (!category) {
        return c.json(
          {
            success: false,
            message: 'Category not found'
          },
          404
        )
      }

      return c.json({
        success: true,
        data: category
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to fetch category'
        },
        500
      )
    }
  }

  /**
   * Update category
   * PUT /api/categories/:id
   */
  static async update(c: Context) {
    try {
      const id = parseInt(c.req.param('id'))
      const body = await c.req.json()

      const validatedData = updateCategorySchema.parse(body)

      const category = await CategoryService.updateCategory(id, validatedData)

      if (!category) {
        return c.json(
          {
            success: false,
            message: 'Category not found'
          },
          404
        )
      }

      return c.json({
        success: true,
        message: 'Category updated successfully',
        data: category
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return c.json(
          {
            success: false,
            message: 'Validation error',
            errors: error.errors
          },
          400
        )
      }

      return c.json(
        {
          success: false,
          message: error.message || 'Failed to update category'
        },
        500
      )
    }
  }

  /**
   * Delete category
   * DELETE /api/categories/:id
   */
  static async delete(c: Context) {
    try {
      const id = parseInt(c.req.param('id'))

      await CategoryService.deleteCategory(id)

      return c.json({
        success: true,
        message: 'Category deleted successfully'
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to delete category'
        },
        500
      )
    }
  }
}
