# QuizMock Exam System - Implementation Guide

## What's Been Implemented

### Database Schema (Phase 1 - MVP)

All core tables have been created in your PostgreSQL database:

#### 1. **Categories** (`categories`)
- Organize questions and exams by subject/topic
- Supports nested categories (parent-child relationship)
- Fields: id, name, description, slug, parentId, isActive

#### 2. **Exams** (`exams`)
- Complete exam configuration system
- Types: practice, mock, timed, adaptive
- Difficulty levels: beginner, intermediate, advanced, mixed
- Features:
  - Public/private visibility
  - Template system for reusable exams
  - Timed or untimed exams
  - Randomize questions and options
  - Configure passing score
  - Limit attempts
  - Control when answers are shown
  - Question pool randomization

#### 3. **Questions** (`questions`)
- Multiple question types:
  - Multiple choice (single answer)
  - True/False
  - Essay
  - Fill in the blank
  - Multiple answer (select all that apply)
- Features:
  - Difficulty levels
  - Point values
  - Explanations
  - Image support
  - Tags for filtering
  - Usage tracking and analytics
  - Public/private visibility

#### 4. **Question Options** (`question_options`)
- Answer choices for multiple choice questions
- Mark correct answers
- Optional explanations per option
- Image support for options
- Ordering support

#### 5. **Exam Questions** (`exam_questions`)
- Junction table linking exams to questions
- Custom point values per question in exam
- Question ordering
- Mark questions as required/optional

#### 6. **Exam Attempts** (`exam_attempts`)
- Track user exam sessions
- Statuses: in_progress, completed, abandoned, grading
- Comprehensive scoring:
  - Percentage score
  - Points earned
  - Correct/incorrect/unanswered counts
  - Pass/fail status
- Time tracking:
  - Start/completion/submission times
  - Actual duration
  - Time remaining (for paused exams)
- Resume capability (currentQuestionIndex)
- Metadata storage (IP, user agent, etc.)

#### 7. **User Answers** (`user_answers`)
- Individual question responses within attempts
- Supports all question types:
  - Single option selection
  - Multiple option selection (array)
  - Text answers (essay/fill-blank)
- Features:
  - Correct/incorrect marking
  - Points awarded
  - Time spent per question
  - Mark for review
  - Timestamp when answered

---

## Database Relationships

```
users
├── exams (creator)
├── questions (creator)
└── exam_attempts

categories
├── exams
├── questions
└── categories (self-referencing for nested categories)

exams
├── exam_questions (junction)
└── exam_attempts

questions
├── question_options
├── exam_questions (junction)
└── user_answers

exam_attempts
└── user_answers
```

---

## Next Steps: API Endpoints to Build

### 1. Category Management

**Endpoints needed:**
```
POST   /api/categories              - Create category
GET    /api/categories              - List all categories
GET    /api/categories/:id          - Get single category
PUT    /api/categories/:id          - Update category
DELETE /api/categories/:id          - Delete category (soft delete)
GET    /api/categories/:id/exams    - Get exams in category
GET    /api/categories/:id/questions - Get questions in category
```

### 2. Question Management

**Endpoints needed:**
```
POST   /api/questions               - Create question with options
GET    /api/questions               - List questions (with filters)
GET    /api/questions/:id           - Get single question with options
PUT    /api/questions/:id           - Update question
DELETE /api/questions/:id           - Delete question (soft delete)
GET    /api/questions/search        - Search questions by text/tags
```

**Query params for listing:**
- `categoryId` - filter by category
- `difficulty` - filter by difficulty
- `type` - filter by question type
- `tags` - filter by tags
- `isPublic` - filter public/private
- `page`, `limit` - pagination

### 3. Exam Management

**Endpoints needed:**
```
POST   /api/exams                   - Create exam
GET    /api/exams                   - List exams (with filters)
GET    /api/exams/:id               - Get exam details
PUT    /api/exams/:id               - Update exam
DELETE /api/exams/:id               - Delete exam (soft delete)
POST   /api/exams/:id/questions     - Add questions to exam
DELETE /api/exams/:id/questions/:qid - Remove question from exam
PUT    /api/exams/:id/publish       - Publish exam
GET    /api/exams/:id/preview       - Preview exam (without starting attempt)
```

### 4. Exam Taking (Attempts)

**Endpoints needed:**
```
POST   /api/exams/:id/start         - Start new attempt
GET    /api/attempts/:id            - Get attempt details
POST   /api/attempts/:id/answer     - Submit answer for question
PUT    /api/attempts/:id/review     - Mark question for review
POST   /api/attempts/:id/submit     - Submit entire exam
GET    /api/attempts/:id/results    - Get results (if allowed)
POST   /api/attempts/:id/pause      - Pause attempt
POST   /api/attempts/:id/resume     - Resume paused attempt
```

### 5. User Progress & Analytics

**Endpoints needed:**
```
GET    /api/users/me/attempts       - My exam attempts history
GET    /api/users/me/stats          - My overall statistics
GET    /api/users/me/exams          - Exams I created
GET    /api/exams/:id/analytics     - Analytics for exam (creator only)
```

---

## Key Features to Implement

### 1. Exam Taking Flow

```typescript
// 1. Start attempt
POST /api/exams/:examId/start
→ Creates exam_attempts record with status='in_progress'
→ Randomly selects questions if shuffleQuestionPool=true
→ Returns first question

// 2. Answer questions
POST /api/attempts/:attemptId/answer
Body: {
  questionId: number,
  selectedOptionId?: number,      // for single choice
  selectedOptionIds?: number[],   // for multiple answer
  textAnswer?: string             // for essay/fill blank
}
→ Creates/updates user_answers record
→ Calculates isCorrect for objective questions
→ Returns next question

// 3. Submit exam
POST /api/attempts/:attemptId/submit
→ Updates attempt status to 'completed'
→ Calculates final score
→ Determines pass/fail
→ Returns results (if showAnswersAfter allows)
```

### 2. Auto-Grading Logic

```typescript
// For multiple choice/true-false
- Compare selectedOptionId with correct option
- Award full points if correct, 0 if incorrect

// For multiple answer
- Must select ALL correct options and NO incorrect options
- Award full points only if 100% correct

// For essay/fill blank
- Set status='grading' for manual review
- Points awarded by instructor later
```

### 3. Timed Exams

```typescript
// Track time on backend
- Store startedAt timestamp
- Calculate timeRemaining = duration - elapsed
- Auto-submit when time expires
- Allow pause/resume (update timeRemaining)
```

### 4. Randomization

```typescript
// Question randomization
if (exam.shuffleQuestionPool && exam.questionPoolSize) {
  // Select N random questions from pool
  questions = shuffle(allQuestions).slice(0, exam.questionPoolSize)
}

// Option randomization
if (exam.randomizeOptions) {
  // Shuffle options for each question (except True/False)
}
```

---

## Service Layer Structure

Create these services:

### 1. **CategoryService** (`src/service/category/category.service.ts`)
```typescript
- createCategory(data)
- getCategories(filters)
- getCategoryById(id)
- updateCategory(id, data)
- deleteCategory(id) // soft delete
- getCategoryExams(id)
- getCategoryQuestions(id)
```

### 2. **QuestionService** (`src/service/question/question.service.ts`)
```typescript
- createQuestion(data) // includes options
- getQuestions(filters)
- getQuestionById(id)
- updateQuestion(id, data)
- deleteQuestion(id)
- searchQuestions(query)
- updateQuestionStats(id, isCorrect) // for analytics
```

### 3. **ExamService** (`src/service/exam/exam.service.ts`)
```typescript
- createExam(data)
- getExams(filters)
- getExamById(id)
- updateExam(id, data)
- deleteExam(id)
- addQuestionsToExam(examId, questionIds)
- removeQuestionFromExam(examId, questionId)
- publishExam(id)
- getExamPreview(id)
- getExamAnalytics(id)
```

### 4. **AttemptService** (`src/service/attempt/attempt.service.ts`)
```typescript
- startAttempt(examId, userId)
- getAttemptById(id)
- submitAnswer(attemptId, questionId, answer)
- markForReview(attemptId, questionId)
- submitExam(attemptId)
- calculateScore(attemptId)
- getAttemptResults(attemptId)
- pauseAttempt(attemptId)
- resumeAttempt(attemptId)
```

---

## Validation Schemas (Zod)

### Question Creation
```typescript
const createQuestionSchema = z.object({
  questionText: z.string().min(1),
  questionType: z.enum(['multiple_choice', 'true_false', 'essay', 'fill_blank', 'multiple_answer']),
  categoryId: z.number().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'mixed']),
  points: z.number().default(1),
  explanation: z.string().optional(),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().default(false),
  options: z.array(z.object({
    optionText: z.string(),
    isCorrect: z.boolean(),
    order: z.number(),
    explanation: z.string().optional(),
    imageUrl: z.string().url().optional()
  })).min(2) // at least 2 options for MC questions
})
```

### Exam Creation
```typescript
const createExamSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  categoryId: z.number().optional(),
  type: z.enum(['practice', 'mock', 'timed', 'adaptive']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'mixed']),
  isPublic: z.boolean().default(false),
  instructions: z.string().optional(),
  passingScore: z.number().min(0).max(100).default(70),
  duration: z.number().optional(), // minutes
  randomizeQuestions: z.boolean().default(false),
  randomizeOptions: z.boolean().default(false),
  showAnswersAfter: z.enum(['immediately', 'after_submit', 'never']),
  allowReview: z.boolean().default(true),
  attemptsAllowed: z.number().optional()
})
```

---

## WebSocket Integration Ideas

Use your existing WebSocket setup for:

1. **Live Exam Sessions**
   - Real-time timer updates
   - Auto-submit when time expires
   - Notify on connection issues

2. **Multi-User Practice Rooms**
   - Students join same exam room
   - See others' progress (anonymized)
   - Leaderboard updates in real-time

3. **Instructor Dashboard**
   - Real-time view of active attempts
   - Monitor exam submissions
   - Live analytics updates

---

## Security Considerations

1. **Authorization Checks**
   - Users can only start attempts for published/public exams
   - Users can only view their own attempt results
   - Only exam creators can edit/delete exams
   - Only exam creators can view analytics

2. **Prevent Cheating**
   - Validate time limits on backend
   - Log metadata (IP, user agent) in attempts
   - Detect rapid answer submissions
   - Randomize question order per attempt

3. **Data Validation**
   - Validate answer belongs to question
   - Validate question belongs to exam
   - Check attempt limits before starting new attempt
   - Verify exam is published before starting

---

## Phase 2: Future Enhancements

Once Phase 1 is complete, consider adding:

1. **Flashcards** (schema already planned)
   - flashcard_decks
   - flashcards
   - flashcard_progress
   - Spaced repetition algorithm

2. **Progress Tracking**
   - user_statistics
   - daily_activity
   - category_progress
   - Strength/weakness analysis

3. **Collaboration**
   - exam_collaborators
   - shared_links
   - comments

4. **Study Plans**
   - study_plans
   - study_plan_items
   - Reminders and notifications

---

## Testing Strategy

Create tests for:

1. **Unit Tests**
   - Services (business logic)
   - Auto-grading functions
   - Score calculation

2. **Integration Tests**
   - Full exam taking flow
   - Question creation with options
   - Exam attempt submission

3. **E2E Tests**
   - Complete user journey
   - Timed exam scenarios
   - Randomization behavior

---

## Ready to Start Building!

Your database schema is ready. Next steps:

1. Start with **CategoryService** and **CategoryController** (simplest)
2. Move to **QuestionService** (with options handling)
3. Build **ExamService** (exam-question association)
4. Implement **AttemptService** (most complex, core feature)
5. Add WebSocket real-time features
6. Build frontend to consume APIs

The foundation is solid - happy coding!
