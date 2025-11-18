import { Context } from 'hono'
import { ImportExportService } from '../../service/import-export/import-export.service'

export class ImportExportController {
  /**
   * Download CSV template
   * GET /api/questions/import-template
   */
  static async downloadTemplate(c: Context) {
    try {
      const csv = ImportExportService.generateTemplate()

      c.header('Content-Type', 'text/csv')
      c.header('Content-Disposition', 'attachment; filename="question-import-template.csv"')

      return c.body(csv)
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to generate template'
        },
        500
      )
    }
  }

  /**
   * Preview CSV import (validate without saving)
   * POST /api/questions/import/preview
   */
  static async previewImport(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const body = await c.req.parseBody()
      const file = body['file']
      const defaultCategoryId = body['categoryId'] ? parseInt(body['categoryId'] as string) : undefined

      if (!file || typeof file === 'string') {
        return c.json(
          {
            success: false,
            message: 'CSV file is required'
          },
          400
        )
      }

      // Read file content
      const csvContent = await (file as File).text()

      // Preview import (doesn't save to database)
      const result = await ImportExportService.importQuestions(csvContent, user.id, true, defaultCategoryId)

      return c.json({
        success: result.success,
        message: result.success
          ? `Preview successful: ${result.imported} questions valid`
          : 'Validation errors found',
        data: {
          total: result.total,
          valid: result.imported,
          invalid: result.errors.length,
          errors: result.errors,
          preview: result.questions?.slice(0, 5) // Show first 5 questions
        }
      })
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to preview import'
        },
        500
      )
    }
  }

  /**
   * Import questions from CSV
   * POST /api/questions/import
   */
  static async importQuestions(c: Context) {
    try {
      const user = c.get('user')
      if (!user) {
        return c.json({ success: false, message: 'Unauthorized' }, 401)
      }

      const body = await c.req.parseBody()
      const file = body['file']
      const defaultCategoryId = body['categoryId'] ? parseInt(body['categoryId'] as string) : undefined

      if (!file || typeof file === 'string') {
        return c.json(
          {
            success: false,
            message: 'CSV file is required'
          },
          400
        )
      }

      // Read file content
      const csvContent = await (file as File).text()

      // Import questions (saves to database)
      const result = await ImportExportService.importQuestions(csvContent, user.id, false, defaultCategoryId)

      return c.json(
        {
          success: result.success,
          message: result.success
            ? `Successfully imported ${result.imported} of ${result.total} questions`
            : `Imported ${result.imported} questions with ${result.errors.length} errors`,
          data: {
            total: result.total,
            imported: result.imported,
            failed: result.errors.length,
            errors: result.errors,
            questions: result.questions
          }
        },
        result.success ? 201 : 207 // 207 = Multi-Status (partial success)
      )
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to import questions'
        },
        500
      )
    }
  }

  /**
   * Export questions to CSV
   * GET /api/questions/export
   */
  static async exportQuestions(c: Context) {
    try {
      const user = c.get('user')

      // Build filters
      const filters: any = {}

      if (c.req.query('categoryId')) {
        filters.categoryId = parseInt(c.req.query('categoryId')!)
      }

      if (c.req.query('difficulty')) {
        filters.difficulty = c.req.query('difficulty')
      }

      if (c.req.query('questionType')) {
        filters.questionType = c.req.query('questionType')
      }

      // Regular users can only export their own questions
      // Moderators can export all questions
      if (user && user.role === 'user') {
        filters.createdBy = user.id
      } else if (c.req.query('createdBy')) {
        filters.createdBy = parseInt(c.req.query('createdBy')!)
      }

      const csv = await ImportExportService.exportQuestions(filters)

      const filename = `questions-export-${new Date().toISOString().split('T')[0]}.csv`

      c.header('Content-Type', 'text/csv')
      c.header('Content-Disposition', `attachment; filename="${filename}"`)

      return c.body(csv)
    } catch (error: any) {
      return c.json(
        {
          success: false,
          message: error.message || 'Failed to export questions'
        },
        500
      )
    }
  }
}
