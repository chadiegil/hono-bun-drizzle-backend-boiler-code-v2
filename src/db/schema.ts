import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  pgEnum,
  decimal,
  jsonb,
  uniqueIndex,
  index
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================
// ENUMS
// ============================================

export const userRoleEnum = pgEnum('user_role', ['super_admin', 'moderator', 'user'])
export const questionStatusEnum = pgEnum('question_status', [
  'draft',
  'pending_review',
  'approved',
  'rejected'
])
export const difficultyEnum = pgEnum('difficulty', ['beginner', 'intermediate', 'advanced', 'mixed'])
export const examTypeEnum = pgEnum('exam_type', ['practice', 'mock', 'timed', 'adaptive'])
export const questionTypeEnum = pgEnum('question_type', [
  'multiple_choice',
  'true_false',
  'essay',
  'fill_blank',
  'multiple_answer'
])
export const attemptStatusEnum = pgEnum('attempt_status', [
  'in_progress',
  'completed',
  'abandoned',
  'grading'
])
export const showAnswersEnum = pgEnum('show_answers', ['immediately', 'after_submit', 'never'])

// ============================================
// USERS (existing)
// ============================================

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    role: userRoleEnum('role').default('user').notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    refreshToken: text('refresh_token'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  },
  (table) => ({
    emailIdx: uniqueIndex('user_email_idx').on(table.email),
    roleIdx: index('user_role_idx').on(table.role)
  })
)

// ============================================
// CATEGORIES
// ============================================

export const categories = pgTable(
  'categories',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull().unique(),
    description: text('description'),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    parentId: integer('parent_id'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  },
  (table) => ({
    slugIdx: uniqueIndex('category_slug_idx').on(table.slug)
  })
)

// ============================================
// EXAMS
// ============================================

export const exams = pgTable(
  'exams',
  {
    id: serial('id').primaryKey(),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    slug: varchar('slug', { length: 500 }).notNull().unique(),
    categoryId: integer('category_id').references(() => categories.id),
    createdBy: integer('created_by')
      .references(() => users.id)
      .notNull(),
    type: examTypeEnum('type').notNull(),
    difficulty: difficultyEnum('difficulty').notNull(),
    isPublic: boolean('is_public').default(false).notNull(),
    isTemplate: boolean('is_template').default(false).notNull(),
    isPublished: boolean('is_published').default(false).notNull(),
    instructions: text('instructions'),
    passingScore: integer('passing_score').default(70).notNull(), // percentage
    totalQuestions: integer('total_questions').default(0).notNull(),
    totalPoints: integer('total_points').default(0).notNull(),
    duration: integer('duration'), // minutes, null = untimed
    randomizeQuestions: boolean('randomize_questions').default(false).notNull(),
    randomizeOptions: boolean('randomize_options').default(false).notNull(),
    showAnswersAfter: showAnswersEnum('show_answers_after').default('after_submit').notNull(),
    allowReview: boolean('allow_review').default(true).notNull(),
    attemptsAllowed: integer('attempts_allowed'), // null = unlimited
    shuffleQuestionPool: boolean('shuffle_question_pool').default(false).notNull(),
    questionPoolSize: integer('question_pool_size'), // randomly select N questions
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  },
  (table) => ({
    slugIdx: uniqueIndex('exam_slug_idx').on(table.slug),
    createdByIdx: index('exam_created_by_idx').on(table.createdBy),
    categoryIdx: index('exam_category_idx').on(table.categoryId),
    typeIdx: index('exam_type_idx').on(table.type)
  })
)

// ============================================
// QUESTIONS
// ============================================

export const questions = pgTable(
  'questions',
  {
    id: serial('id').primaryKey(),
    questionText: text('question_text').notNull(),
    questionType: questionTypeEnum('question_type').notNull(),
    categoryId: integer('category_id').references(() => categories.id),
    createdBy: integer('created_by')
      .references(() => users.id)
      .notNull(),
    difficulty: difficultyEnum('difficulty').notNull(),
    points: integer('points').default(1).notNull(),
    explanation: text('explanation'),
    imageUrl: text('image_url'),
    tags: text('tags').array(),
    isPublic: boolean('is_public').default(false).notNull(),
    status: questionStatusEnum('status').default('draft').notNull(),
    reviewedBy: integer('reviewed_by').references(() => users.id),
    reviewedAt: timestamp('reviewed_at'),
    reviewNotes: text('review_notes'),
    submittedForReviewAt: timestamp('submitted_for_review_at'),
    usageCount: integer('usage_count').default(0).notNull(),
    correctAnswerCount: integer('correct_answer_count').default(0).notNull(),
    totalAnswerCount: integer('total_answer_count').default(0).notNull(),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  },
  (table) => ({
    categoryIdx: index('question_category_idx').on(table.categoryId),
    createdByIdx: index('question_created_by_idx').on(table.createdBy),
    typeIdx: index('question_type_idx').on(table.questionType),
    difficultyIdx: index('question_difficulty_idx').on(table.difficulty),
    statusIdx: index('question_status_idx').on(table.status)
  })
)

// ============================================
// QUESTION OPTIONS
// ============================================

export const questionOptions = pgTable(
  'question_options',
  {
    id: serial('id').primaryKey(),
    questionId: integer('question_id')
      .references(() => questions.id, { onDelete: 'cascade' })
      .notNull(),
    optionText: text('option_text').notNull(),
    isCorrect: boolean('is_correct').notNull(),
    order: integer('order').notNull(),
    explanation: text('explanation'),
    imageUrl: text('image_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  },
  (table) => ({
    questionIdx: index('option_question_idx').on(table.questionId)
  })
)

// ============================================
// EXAM QUESTIONS (Junction Table)
// ============================================

export const examQuestions = pgTable(
  'exam_questions',
  {
    id: serial('id').primaryKey(),
    examId: integer('exam_id')
      .references(() => exams.id, { onDelete: 'cascade' })
      .notNull(),
    questionId: integer('question_id')
      .references(() => questions.id, { onDelete: 'cascade' })
      .notNull(),
    order: integer('order').notNull(),
    points: integer('points').default(1).notNull(),
    isRequired: boolean('is_required').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
  },
  (table) => ({
    examIdx: index('exam_question_exam_idx').on(table.examId),
    questionIdx: index('exam_question_question_idx').on(table.questionId),
    uniqueExamQuestion: uniqueIndex('unique_exam_question_idx').on(table.examId, table.questionId)
  })
)

// ============================================
// EXAM ATTEMPTS
// ============================================

export const examAttempts = pgTable(
  'exam_attempts',
  {
    id: serial('id').primaryKey(),
    examId: integer('exam_id')
      .references(() => exams.id)
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    status: attemptStatusEnum('status').default('in_progress').notNull(),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    submittedAt: timestamp('submitted_at'),
    duration: integer('duration'), // actual time spent in seconds
    score: decimal('score', { precision: 5, scale: 2 }), // percentage
    totalPoints: integer('total_points').default(0),
    maxPoints: integer('max_points').default(0),
    correctAnswers: integer('correct_answers').default(0),
    incorrectAnswers: integer('incorrect_answers').default(0),
    unansweredQuestions: integer('unanswered_questions').default(0),
    isPassed: boolean('is_passed'),
    reviewedAt: timestamp('reviewed_at'),
    timeRemaining: integer('time_remaining'), // for paused exams (seconds)
    currentQuestionIndex: integer('current_question_index').default(0),
    metadata: jsonb('metadata'), // IP, user agent, etc.
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  },
  (table) => ({
    userIdx: index('attempt_user_idx').on(table.userId),
    examIdx: index('attempt_exam_idx').on(table.examId),
    statusIdx: index('attempt_status_idx').on(table.status),
    userExamIdx: index('attempt_user_exam_idx').on(table.userId, table.examId)
  })
)

// ============================================
// USER ANSWERS
// ============================================

export const userAnswers = pgTable(
  'user_answers',
  {
    id: serial('id').primaryKey(),
    attemptId: integer('attempt_id')
      .references(() => examAttempts.id, { onDelete: 'cascade' })
      .notNull(),
    questionId: integer('question_id')
      .references(() => questions.id)
      .notNull(),
    selectedOptionId: integer('selected_option_id').references(() => questionOptions.id),
    selectedOptionIds: integer('selected_option_ids').array(), // for multiple answer
    textAnswer: text('text_answer'), // for essay/fill-blank
    isCorrect: boolean('is_correct'),
    pointsAwarded: integer('points_awarded').default(0),
    timeSpent: integer('time_spent'), // seconds
    markedForReview: boolean('marked_for_review').default(false),
    answeredAt: timestamp('answered_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  },
  (table) => ({
    attemptIdx: index('answer_attempt_idx').on(table.attemptId),
    questionIdx: index('answer_question_idx').on(table.questionId),
    uniqueAttemptQuestion: uniqueIndex('unique_attempt_question_idx').on(
      table.attemptId,
      table.questionId
    )
  })
)

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  createdExams: many(exams),
  createdQuestions: many(questions),
  examAttempts: many(examAttempts)
}))

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id]
  }),
  children: many(categories),
  exams: many(exams),
  questions: many(questions)
}))

export const examsRelations = relations(exams, ({ one, many }) => ({
  creator: one(users, {
    fields: [exams.createdBy],
    references: [users.id]
  }),
  category: one(categories, {
    fields: [exams.categoryId],
    references: [categories.id]
  }),
  examQuestions: many(examQuestions),
  attempts: many(examAttempts)
}))

export const questionsRelations = relations(questions, ({ one, many }) => ({
  creator: one(users, {
    fields: [questions.createdBy],
    references: [users.id]
  }),
  category: one(categories, {
    fields: [questions.categoryId],
    references: [categories.id]
  }),
  options: many(questionOptions),
  examQuestions: many(examQuestions),
  userAnswers: many(userAnswers)
}))

export const questionOptionsRelations = relations(questionOptions, ({ one, many }) => ({
  question: one(questions, {
    fields: [questionOptions.questionId],
    references: [questions.id]
  }),
  userAnswers: many(userAnswers)
}))

export const examQuestionsRelations = relations(examQuestions, ({ one }) => ({
  exam: one(exams, {
    fields: [examQuestions.examId],
    references: [exams.id]
  }),
  question: one(questions, {
    fields: [examQuestions.questionId],
    references: [questions.id]
  })
}))

export const examAttemptsRelations = relations(examAttempts, ({ one, many }) => ({
  exam: one(exams, {
    fields: [examAttempts.examId],
    references: [exams.id]
  }),
  user: one(users, {
    fields: [examAttempts.userId],
    references: [users.id]
  }),
  answers: many(userAnswers)
}))

export const userAnswersRelations = relations(userAnswers, ({ one }) => ({
  attempt: one(examAttempts, {
    fields: [userAnswers.attemptId],
    references: [examAttempts.id]
  }),
  question: one(questions, {
    fields: [userAnswers.questionId],
    references: [questions.id]
  }),
  selectedOption: one(questionOptions, {
    fields: [userAnswers.selectedOptionId],
    references: [questionOptions.id]
  })
}))

// ============================================
// CONTRIBUTOR ASSIGNMENTS
// ============================================

export const contributorAssignments = pgTable(
  'contributor_assignments',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    categoryId: integer('category_id')
      .references(() => categories.id, { onDelete: 'cascade' })
      .notNull(),
    assignedBy: integer('assigned_by')
      .references(() => users.id)
      .notNull(),
    canCreateQuestions: boolean('can_create_questions').default(true).notNull(),
    canEditQuestions: boolean('can_edit_questions').default(false).notNull(),
    canDeleteQuestions: boolean('can_delete_questions').default(false).notNull(),
    canCreateExams: boolean('can_create_exams').default(false).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  },
  (table) => ({
    userIdx: index('contributor_user_idx').on(table.userId),
    categoryIdx: index('contributor_category_idx').on(table.categoryId),
    uniqueUserCategory: uniqueIndex('unique_contributor_user_category_idx').on(
      table.userId,
      table.categoryId
    )
  })
)

export const contributorAssignmentsRelations = relations(contributorAssignments, ({ one }) => ({
  user: one(users, {
    fields: [contributorAssignments.userId],
    references: [users.id]
  }),
  category: one(categories, {
    fields: [contributorAssignments.categoryId],
    references: [categories.id]
  }),
  assignedByUser: one(users, {
    fields: [contributorAssignments.assignedBy],
    references: [users.id]
  })
}))
