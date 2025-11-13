import Papa from 'papaparse'
import { QuestionService } from '../question/question.service'

export interface QuestionCSVRow {
  questionText: string
  questionType: string
  categoryId?: string
  difficulty: string
  points?: string
  explanation?: string
  imageUrl?: string
  tags?: string
  isPublic?: string
  // For multiple choice, true/false, multiple answer
  option1Text?: string
  option1IsCorrect?: string
  option2Text?: string
  option2IsCorrect?: string
  option3Text?: string
  option3IsCorrect?: string
  option4Text?: string
  option4IsCorrect?: string
  option5Text?: string
  option5IsCorrect?: string
}

export interface ImportResult {
  success: boolean
  total: number
  imported: number
  errors: Array<{ row: number; errors: string[] }>
  questions?: any[]
}

export interface ExportOptions {
  categoryId?: number
  difficulty?: string
  questionType?: string
  status?: string
  createdBy?: number
}

export class ImportExportService {
  /**
   * Generate CSV template with headers and example row
   */
  static generateTemplate(): string {
    const headers = [
      'questionText',
      'questionType',
      'categoryId',
      'difficulty',
      'points',
      'explanation',
      'tags',
      'isPublic',
      'option1Text',
      'option1IsCorrect',
      'option2Text',
      'option2IsCorrect',
      'option3Text',
      'option3IsCorrect',
      'option4Text',
      'option4IsCorrect'
    ]

    const exampleRow = [
      'What is the capital of France?',
      'multiple_choice',
      '1',
      'beginner',
      '1',
      'Paris is the capital and largest city of France',
      'geography,capitals,europe',
      'false',
      'London',
      'false',
      'Paris',
      'true',
      'Berlin',
      'false',
      'Madrid',
      'false'
    ]

    const csv = Papa.unparse({
      fields: headers,
      data: [exampleRow]
    })

    return csv
  }

  /**
   * Parse CSV file content
   */
  static parseCSV(csvContent: string): Papa.ParseResult<QuestionCSVRow> {
    return Papa.parse<QuestionCSVRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    })
  }

  /**
   * Validate and transform CSV row to question data
   */
  static validateAndTransformRow(row: QuestionCSVRow, rowNumber: number): {
    valid: boolean
    errors: string[]
    data?: any
  } {
    const errors: string[] = []

    // Required fields
    if (!row.questionText || row.questionText.trim() === '') {
      errors.push('questionText is required')
    }

    if (!row.questionType) {
      errors.push('questionType is required')
    }

    const validTypes = ['multiple_choice', 'true_false', 'essay', 'fill_blank', 'multiple_answer']
    if (row.questionType && !validTypes.includes(row.questionType)) {
      errors.push(
        `Invalid questionType. Must be one of: ${validTypes.join(', ')}`
      )
    }

    if (!row.difficulty) {
      errors.push('difficulty is required')
    }

    const validDifficulties = ['beginner', 'intermediate', 'advanced', 'mixed']
    if (row.difficulty && !validDifficulties.includes(row.difficulty)) {
      errors.push(`Invalid difficulty. Must be one of: ${validDifficulties.join(', ')}`)
    }

    // Parse numeric fields
    const categoryId = row.categoryId ? parseInt(row.categoryId) : undefined
    if (row.categoryId && isNaN(categoryId!)) {
      errors.push('categoryId must be a number')
    }

    const points = row.points ? parseInt(row.points) : 1
    if (row.points && isNaN(points)) {
      errors.push('points must be a number')
    }

    // Parse boolean fields
    const isPublic = row.isPublic ? row.isPublic.toLowerCase() === 'true' : false

    // Parse tags
    const tags = row.tags ? row.tags.split(',').map((t) => t.trim()).filter((t) => t) : undefined

    // Build options array
    const options: any[] = []
    for (let i = 1; i <= 5; i++) {
      const textKey = `option${i}Text` as keyof QuestionCSVRow
      const correctKey = `option${i}IsCorrect` as keyof QuestionCSVRow

      if (row[textKey] && row[textKey]!.trim() !== '') {
        options.push({
          optionText: row[textKey]!.trim(),
          isCorrect: row[correctKey]?.toLowerCase() === 'true',
          order: i
        })
      }
    }

    // Validate options based on question type
    if (row.questionType === 'essay' || row.questionType === 'fill_blank') {
      if (options.length > 0) {
        errors.push(`${row.questionType} questions should not have options`)
      }
    } else if (row.questionType === 'true_false') {
      if (options.length !== 2) {
        errors.push('True/False questions must have exactly 2 options')
      }
      const correctCount = options.filter((o) => o.isCorrect).length
      if (correctCount !== 1) {
        errors.push('True/False questions must have exactly 1 correct answer')
      }
    } else if (row.questionType === 'multiple_choice') {
      if (options.length < 2) {
        errors.push('Multiple choice questions must have at least 2 options')
      }
      const correctCount = options.filter((o) => o.isCorrect).length
      if (correctCount !== 1) {
        errors.push('Multiple choice questions must have exactly 1 correct answer')
      }
    } else if (row.questionType === 'multiple_answer') {
      if (options.length < 2) {
        errors.push('Multiple answer questions must have at least 2 options')
      }
      const correctCount = options.filter((o) => o.isCorrect).length
      if (correctCount < 1) {
        errors.push('Multiple answer questions must have at least 1 correct answer')
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors }
    }

    return {
      valid: true,
      errors: [],
      data: {
        questionText: row.questionText.trim(),
        questionType: row.questionType as any,
        categoryId,
        difficulty: row.difficulty as any,
        points,
        explanation: row.explanation?.trim(),
        imageUrl: row.imageUrl?.trim(),
        tags,
        isPublic,
        options
      }
    }
  }

  /**
   * Import questions from CSV
   */
  static async importQuestions(
    csvContent: string,
    userId: number,
    preview: boolean = false
  ): Promise<ImportResult> {
    const parseResult = this.parseCSV(csvContent)

    if (parseResult.errors.length > 0) {
      return {
        success: false,
        total: 0,
        imported: 0,
        errors: parseResult.errors.map((err, idx) => ({
          row: idx + 1,
          errors: [err.message]
        }))
      }
    }

    const results: ImportResult = {
      success: true,
      total: parseResult.data.length,
      imported: 0,
      errors: [],
      questions: []
    }

    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i]
      const validation = this.validateAndTransformRow(row, i + 2) // +2 because row 1 is header

      if (!validation.valid) {
        results.errors.push({
          row: i + 2,
          errors: validation.errors
        })
        continue
      }

      // If preview mode, just collect the data without saving
      if (preview) {
        results.questions!.push(validation.data)
        results.imported++
      } else {
        // Actually create the question
        try {
          const question = await QuestionService.createQuestion({
            ...validation.data,
            createdBy: userId
          })
          results.questions!.push(question)
          results.imported++
        } catch (error: any) {
          results.errors.push({
            row: i + 2,
            errors: [error.message || 'Failed to create question']
          })
        }
      }
    }

    results.success = results.errors.length === 0

    return results
  }

  /**
   * Export questions to CSV
   */
  static async exportQuestions(filters: ExportOptions = {}): Promise<string> {
    // Build query to get questions with options
    let conditions = [isNull(questions.deletedAt)]

    if (filters.categoryId) {
      conditions.push(eq(questions.categoryId, filters.categoryId))
    }

    if (filters.difficulty) {
      conditions.push(eq(questions.difficulty, filters.difficulty as any))
    }

    if (filters.questionType) {
      conditions.push(eq(questions.questionType, filters.questionType as any))
    }

    if (filters.createdBy) {
      conditions.push(eq(questions.createdBy, filters.createdBy))
    }

    // Get questions
    const questionList = await db
      .select()
      .from(questions)
      .where(and(...conditions))
      .orderBy(questions.createdAt)
      .limit(10000)

    // Get options for each question
    const questionsWithOptions = await Promise.all(
      questionList.map(async (q) => {
        const options = await db
          .select()
          .from(questionOptions)
          .where(eq(questionOptions.questionId, q.id))
          .orderBy(questionOptions.order)

        return {
          ...q,
          options
        }
      })
    )

    // Transform questions to CSV rows
    const rows = questionsWithOptions.map((q: any) => {
      const row: any = {
        questionText: q.questionText,
        questionType: q.questionType,
        categoryId: q.categoryId || '',
        difficulty: q.difficulty,
        points: q.points,
        explanation: q.explanation || '',
        imageUrl: q.imageUrl || '',
        tags: q.tags ? q.tags.join(',') : '',
        isPublic: q.isPublic
      }

      // Add options (up to 5)
      const options = q.options || []
      for (let i = 0; i < 5; i++) {
        if (options[i]) {
          row[`option${i + 1}Text`] = options[i].optionText
          row[`option${i + 1}IsCorrect`] = options[i].isCorrect
        } else {
          row[`option${i + 1}Text`] = ''
          row[`option${i + 1}IsCorrect`] = ''
        }
      }

      return row
    })

    const csv = Papa.unparse(rows)
    return csv
  }
}
