# QuizMock Feature Roadmap

This document outlines the planned features for the QuizMock platform, organized by priority and implementation phases.

---

## ✅ Completed Features (Phase 0)

### Core Exam System
- [x] User authentication (JWT with refresh tokens)
- [x] Category management with hierarchical structure
- [x] Question management (5 types: multiple choice, true/false, essay, fill blank, multiple answer)
- [x] Exam creation and management
- [x] Exam attempts with auto-grading
- [x] Real-time WebSocket support
- [x] Rate limiting and security features

### RBAC & Permissions
- [x] Three user roles (Super Admin, Moderator, User)
- [x] Contributor system with category-specific permissions
- [x] Admin endpoints for user management
- [x] Permission checks on all CRUD operations

---

## 🚀 Phase 1: Quality Control & Content Management (Priority: HIGH)

### 1.1 Question Review & Approval System ⭐⭐⭐ [IN PROGRESS]
**Status**: Implementing now
**Effort**: Medium (2-3 days)
**Impact**: Critical for content quality

**Features:**
- Question status workflow: `draft`, `pending_review`, `approved`, `rejected`
- Review queue for moderators
- Approve/reject with feedback
- Bulk review operations
- Review history and audit trail
- Auto-publish on approval
- Email notifications for status changes

**Database Changes:**
- Add `status` enum to questions table
- Add `reviewedBy`, `reviewedAt`, `reviewNotes` fields
- Create `question_reviews` table for audit trail

**API Endpoints:**
```
GET    /api/questions/pending-review        # Moderator review queue
PUT    /api/questions/:id/submit-review     # Submit for review
PUT    /api/questions/:id/approve           # Approve question
PUT    /api/questions/:id/reject            # Reject question
POST   /api/questions/bulk-approve          # Bulk approve
GET    /api/questions/:id/review-history    # Review audit trail
```

---

### 1.2 Question Import/Export ⭐⭐⭐
**Status**: Planned
**Effort**: Low (1-2 days)
**Impact**: High efficiency gain

**Features:**
- Import questions from CSV/Excel
- Export questions to CSV/Excel/PDF
- Template download for contributors
- Preview before import
- Validation with detailed error messages
- Bulk operations (import 100+ questions at once) must have limit so that the server wont crash 

**API Endpoints:**
```
GET    /api/questions/export?format=csv&categoryId=1
POST   /api/questions/import                # Upload CSV/Excel
GET    /api/questions/import-template       # Download template
POST   /api/questions/import/preview        # Preview before commit
```

**File Formats:**
- CSV: Simple text format
- Excel: Rich formatting with validation
- PDF: Export for printing

---

### 1.3 Basic Analytics Dashboard ⭐⭐⭐
**Status**: Planned
**Effort**: Medium (2-3 days)
**Impact**: High user value

**Features:**
- **User Dashboard:**
  - Overall performance score
  - Questions answered (total, correct, incorrect)
  - Exams taken and average scores
  - Time spent studying
  - Category-wise performance breakdown
  - Recent activity timeline

- **Admin Dashboard:**
  - Total users, questions, exams
  - Active users (daily/weekly/monthly)
  - Popular categories
  - Question usage statistics
  - Exam completion rates
  - Contributor statistics

**API Endpoints:**
```
GET    /api/users/me/stats                  # User statistics
GET    /api/users/me/performance            # Performance by category
GET    /api/admin/dashboard/stats           # Admin overview
GET    /api/admin/dashboard/activity        # Platform activity
GET    /api/categories/:id/stats            # Category statistics
```

---

## 📚 Phase 2: Learning Tools (Priority: MEDIUM)

### 2.1 Flashcard System with Spaced Repetition ⭐⭐
**Status**: Planned
**Effort**: High (4-5 days)
**Impact**: Major learning enhancement

**Features:**
- Convert questions to flashcards
- Spaced repetition algorithm (SM-2 or Leitner system)
- Daily review scheduling
- Card decks organized by category
- Mastery levels (Learning, Young, Mature)
- Review statistics and streaks
- Customizable study sessions

**Database Tables:**
```sql
flashcards
  - id, question_id, user_id, front_text, back_text
  - ease_factor, interval, repetitions
  - next_review_date, last_reviewed_at

flashcard_reviews
  - id, flashcard_id, user_id
  - quality (1-5), time_spent, reviewed_at
```

**API Endpoints:**
```
POST   /api/flashcards                      # Create flashcard
GET    /api/flashcards/due                  # Cards due for review
POST   /api/flashcards/:id/review           # Submit review
GET    /api/flashcards/stats                # Review statistics
GET    /api/flashcards/decks                # Organize by category
```

**Algorithm**: SM-2 (SuperMemo 2)
- Quality ratings: 0-5
- Interval calculation based on performance
- Optimal retention curve

---

### 2.2 Study Plans & Schedules ⭐⭐
**Status**: Planned
**Effort**: Medium (3-4 days)
**Impact**: Structured learning

**Features:**
- Create custom study plans
- Set daily/weekly goals
- Track progress against plan
- Automated reminders
- Adjust plan based on performance
- Templates for common exams (LET, Nursing, etc.)
- Deadline tracking

**Database Tables:**
```sql
study_plans
  - id, user_id, title, target_exam_date
  - daily_goal, weekly_goal, status

study_plan_items
  - id, plan_id, category_id, target_questions
  - target_completion_date, status

study_sessions
  - id, user_id, plan_id, duration
  - questions_answered, score, session_date
```

**API Endpoints:**
```
POST   /api/study-plans                     # Create plan
GET    /api/study-plans                     # List plans
GET    /api/study-plans/:id/progress        # Track progress
PUT    /api/study-plans/:id/goals           # Update goals
POST   /api/study-sessions                  # Log study session
```

---

### 2.3 Leaderboards & Gamification ⭐⭐
**Status**: Planned
**Effort**: Low (1-2 days)
**Impact**: User engagement

**Features:**
- Global leaderboard
- Category-specific leaderboards
- Time-based boards (daily, weekly, monthly, all-time)
- Achievements and badges
- Streak tracking
- Points system
- Levels and ranks

**Database Tables:**
```sql
achievements
  - id, name, description, icon, criteria

user_achievements
  - id, user_id, achievement_id, earned_at

user_stats
  - id, user_id, total_points, current_streak
  - longest_streak, level, rank
```

**Achievements:**
- "First Steps" - Complete first exam
- "Century Club" - Answer 100 questions
- "Perfect Score" - Get 100% on an exam
- "Week Warrior" - 7-day study streak
- "Subject Master" - 90%+ average in a category

**API Endpoints:**
```
GET    /api/leaderboard?period=weekly&category=1
GET    /api/users/me/achievements
GET    /api/achievements                    # All available
```

---

## 💬 Phase 3: Community & Collaboration (Priority: LOW-MEDIUM)

### 3.1 Discussion & Comments ⭐
**Status**: Planned
**Effort**: Low (2 days)
**Impact**: Community building

**Features:**
- Comment on questions
- Reply to comments (threaded)
- Upvote/downvote
- Report inappropriate content
- Moderator responses (highlighted)
- Sort by helpful, newest, oldest

**Database Tables:**
```sql
comments
  - id, question_id, user_id, parent_id
  - content, upvotes, downvotes
  - is_moderator_response, created_at

comment_votes
  - id, comment_id, user_id, vote_type
```

**API Endpoints:**
```
POST   /api/questions/:id/comments
GET    /api/questions/:id/comments
PUT    /api/comments/:id/vote
POST   /api/comments/:id/report
DELETE /api/comments/:id                    # Moderator only
```

---

### 3.2 Question Reporting & Feedback ⭐⭐
**Status**: Planned
**Effort**: Low (1 day)
**Impact**: Quality improvement

**Features:**
- Report incorrect answers
- Report typos/errors
- Suggest improvements
- Flag inappropriate content
- Moderator review queue
- Track resolution status

**Database Tables:**
```sql
question_reports
  - id, question_id, user_id, report_type
  - description, status, resolved_by, resolved_at
```

**Report Types:**
- Incorrect answer
- Typo/grammar error
- Unclear question
- Inappropriate content
- Duplicate question

---

## 📅 Phase 4: Scheduling & Advanced Exam Features (Priority: MEDIUM)

### 4.1 Exam Scheduling & Registration ⭐⭐
**Status**: Planned
**Effort**: Medium (3 days)
**Impact**: Structured testing

**Features:**
- Schedule exams for specific dates/times
- Registration system with limits
- Waiting room before exam
- Auto-start at scheduled time
- Auto-submit at deadline
- Reminder notifications

**Database Tables:**
```sql
exam_schedules
  - id, exam_id, start_time, end_time
  - max_participants, registration_deadline

exam_registrations
  - id, schedule_id, user_id
  - registered_at, status
```

## 💰 Phase 5: Monetization (Priority: MEDIUM)

### 5.1 Payment Integration & Subscriptions ⭐⭐
**Status**: Planned
**Effort**: High (5 days)
**Impact**: Revenue generation

**Features:**
- Subscription tiers (Free, Pro, Premium)
- Payment integration (PayMongo, Stripe, Xendit)
- Access control based on tier
- Trial periods
- Discount codes
- Revenue dashboard

**Tiers:**
- **Free**: 10 exams/month, basic analytics
- **Pro**: Unlimited exams, advanced analytics, flashcards , can take exams from contributors
- **Premium**: All features, priority support, certificates

---

### 5.2 Marketplace for Question Banks ⭐
**Status**: Planned
**Effort**: High (7+ days)
**Impact**: Contributor incentives

**Features:**
- Contributors sell question banks
- Revenue sharing (65/35 split)
- Ratings and reviews
- Preview questions before purchase
- Automatic payments
- Sales analytics

---

## 🎓 Phase 6: Certificates & Credentials (Priority: LOW)

### 6.1 Certificate Generation ⭐
**Status**: Planned
**Effort**: Medium (2-3 days)
**Impact**: User motivation

**Features:**
- Auto-generate certificates for passed exams
- PDF certificates with QR code
- Verify certificate authenticity
- Custom certificate templates
- Digital badges
- Share on social media
