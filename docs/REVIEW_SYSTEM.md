# Question Review & Approval System

## Overview

The Question Review System provides a workflow for contributors to submit questions for moderator approval before they become public. This ensures quality control and content accuracy.

---

## Question Statuses

| Status | Description | Who Can Set | Next Allowed States |
|--------|-------------|-------------|---------------------|
| `draft` | Newly created, not submitted | System (default) | `pending_review` |
| `pending_review` | Submitted for moderator review | Question creator | `approved`, `rejected` |
| `approved` | Reviewed and approved by moderator | Moderators only | - |
| `rejected` | Reviewed and rejected with feedback | Moderators only | `pending_review` |

---

## Workflow

```
┌──────┐
│DRAFT │ (Created by contributor)
└──┬───┘
   │ submit_for_review()
   ↓
┌──────────────┐
│PENDING_REVIEW│ (Waiting for moderator)
└──┬───────────┘
   │
   ├─ approve() → ┌─────────┐
   │              │APPROVED │ (Published)
   │              └─────────┘
   │
   └─ reject() → ┌────────┐
                 │REJECTED│ (Can be resubmitted)
                 └────────┘
```

---

## API Endpoints

### 1. Submit Question for Review
Submit a draft or rejected question for moderator review.

```http
PUT /api/questions/:id/submit-review
Authorization: Bearer {token}
```

**Requirements:**
- Question must be owned by the authenticated user
- Question status must be `draft` or `rejected`

**Response:**
```json
{
  "success": true,
  "message": "Question submitted for review successfully",
  "data": {
    "id": 1,
    "status": "pending_review",
    "submittedForReviewAt": "2025-01-13T10:00:00Z",
    ...
  }
}
```

---

### 2. Get Pending Review Queue
Get all questions awaiting moderator review (Moderator only).

```http
GET /api/questions/pending-review?page=1&limit=20&categoryId=1
Authorization: Bearer {moderatorToken}
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20)
- `categoryId` (optional): Filter by category
- `createdBy` (optional): Filter by creator

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "questionText": "What is the capital of France?",
      "status": "pending_review",
      "submittedForReviewAt": "2025-01-13T09:30:00Z",
      "createdBy": 10,
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### 3. Approve Question
Approve a question and make it public (Moderator only).

```http
PUT /api/questions/:id/approve
Authorization: Bearer {moderatorToken}
Content-Type: application/json

{
  "notes": "Good question, well written"
}
```

**Requirements:**
- User must be Moderator or Super Admin
- Question status must be `pending_review`

**What Happens:**
- Status changes to `approved`
- Question becomes public (`isPublic = true`)
- Review metadata is saved (reviewer, timestamp, notes)

**Response:**
```json
{
  "success": true,
  "message": "Question approved successfully",
  "data": {
    "id": 5,
    "status": "approved",
    "isPublic": true,
    "reviewedBy": 2,
    "reviewedAt": "2025-01-13T10:15:00Z",
    "reviewNotes": "Good question, well written",
    ...
  }
}
```

---

### 4. Reject Question
Reject a question with feedback (Moderator only).

```http
PUT /api/questions/:id/reject
Authorization: Bearer {moderatorToken}
Content-Type: application/json

{
  "notes": "Question is too vague. Please add more specific details about the context."
}
```

**Requirements:**
- User must be Moderator or Super Admin
- Question status must be `pending_review`
- **Rejection notes are required** (minimum 10 characters)

**What Happens:**
- Status changes to `rejected`
- Review metadata is saved with feedback
- Creator can see the feedback and resubmit after improvements

**Response:**
```json
{
  "success": true,
  "message": "Question rejected successfully",
  "data": {
    "id": 5,
    "status": "rejected",
    "reviewedBy": 2,
    "reviewedAt": "2025-01-13T10:20:00Z",
    "reviewNotes": "Question is too vague. Please add more specific details about the context.",
    ...
  }
}
```

---

### 5. Bulk Approve Questions
Approve multiple questions at once (Moderator only).

```http
POST /api/questions/bulk-approve
Authorization: Bearer {moderatorToken}
Content-Type: application/json

{
  "questionIds": [1, 2, 3, 4, 5],
  "notes": "Batch approved - LET Filipino questions"
}
```

**Requirements:**
- All questions must be in `pending_review` status
- If any question doesn't meet criteria, entire operation fails

**Response:**
```json
{
  "success": true,
  "message": "5 question(s) approved successfully",
  "data": [/* array of approved questions */]
}
```

---

### 6. Bulk Reject Questions
Reject multiple questions at once (Moderator only).

```http
POST /api/questions/bulk-reject
Authorization: Bearer {moderatorToken}
Content-Type: application/json

{
  "questionIds": [6, 7, 8],
  "notes": "All questions need better explanations"
}
```

**Requirements:**
- Rejection notes are required
- All questions must be in `pending_review` status

**Response:**
```json
{
  "success": true,
  "message": "3 question(s) rejected successfully",
  "data": [/* array of rejected questions */]
}
```

---

### 7. Get Questions by Status
Get questions filtered by status.

```http
GET /api/questions/by-status/draft?page=1&limit=20
Authorization: Bearer {token}
```

**Valid Statuses:**
- `draft`
- `pending_review`
- `approved`
- `rejected`

**Query Parameters:**
- `page`, `limit`, `categoryId`, `createdBy` (same as pending-review endpoint)

**Permission:**
- Regular users see only their own questions
- Moderators see all questions

---

### 8. Get Review Statistics
Get question count by status.

```http
GET /api/questions/review-stats?userId=5
Authorization: Bearer {token}
```

**Query Parameters:**
- `userId` (optional): Get stats for specific user (Moderator only)

**Permission:**
- Regular users see only their own stats
- Moderators can see any user's stats or platform-wide stats

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "draft": 20,
    "pendingReview": 15,
    "approved": 100,
    "rejected": 15
  }
}
```

---

## Typical Workflows

### Workflow 1: Contributor Submits Question

1. **Create question** (status: `draft`)
```bash
POST /api/questions
{
  "questionText": "What is 2 + 2?",
  "questionType": "multiple_choice",
  "categoryId": 1,
  "difficulty": "beginner",
  "points": 1,
  "options": [...]
}
# Status: draft
```

2. **Submit for review**
```bash
PUT /api/questions/1/submit-review
# Status: pending_review
# submittedForReviewAt: timestamp set
```

3. **Wait for moderator review**

---

### Workflow 2: Moderator Reviews Questions

1. **Check pending queue**
```bash
GET /api/questions/pending-review?categoryId=1
```

2. **Review each question** (Choose one):

   **Option A: Approve**
   ```bash
   PUT /api/questions/5/approve
   {
     "notes": "Excellent question!"
   }
   # Status: approved
   # isPublic: true (automatically published)
   ```

   **Option B: Reject**
   ```bash
   PUT /api/questions/6/reject
   {
     "notes": "Please clarify the question. Add more context about which formula to use."
   }
   # Status: rejected
   # Contributor receives feedback
   ```

3. **Bulk operations** (for efficiency)
   ```bash
   POST /api/questions/bulk-approve
   {
     "questionIds": [7, 8, 9, 10, 11],
     "notes": "LET General Education batch - all good"
   }
   ```

---

### Workflow 3: Contributor Fixes Rejected Question

1. **Check rejected questions**
```bash
GET /api/questions/by-status/rejected
```

2. **Review feedback**
```json
{
  "id": 6,
  "status": "rejected",
  "reviewNotes": "Please clarify the question. Add more context about which formula to use.",
  "reviewedBy": 2,
  "reviewedAt": "2025-01-13T10:20:00Z"
}
```

3. **Update question** based on feedback
```bash
PUT /api/questions/6
{
  "questionText": "Using the quadratic formula, what is the value of x in x² + 5x + 6 = 0?",
  "explanation": "Use the quadratic formula: x = (-b ± √(b²-4ac)) / 2a"
}
```

4. **Resubmit for review**
```bash
PUT /api/questions/6/submit-review
# Status: pending_review (again)
```

---

## Database Schema

### Questions Table (New Fields)

```sql
ALTER TABLE questions ADD COLUMN status question_status DEFAULT 'draft' NOT NULL;
ALTER TABLE questions ADD COLUMN reviewed_by INTEGER REFERENCES users(id);
ALTER TABLE questions ADD COLUMN reviewed_at TIMESTAMP;
ALTER TABLE questions ADD COLUMN review_notes TEXT;
ALTER TABLE questions ADD COLUMN submitted_for_review_at TIMESTAMP;

CREATE INDEX question_status_idx ON questions(status);
```

### Question Status Enum

```sql
CREATE TYPE question_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected');
```

---

## Permissions

| Action | User | Contributor* | Moderator | Super Admin |
|--------|------|--------------|-----------|-------------|
| Create question (draft) | ✅ | ✅ | ✅ | ✅ |
| Submit own question for review | ✅ | ✅ | ✅ | ✅ |
| View pending review queue | ❌ | ❌ | ✅ | ✅ |
| Approve questions | ❌ | ❌ | ✅ | ✅ |
| Reject questions | ❌ | ❌ | ✅ | ✅ |
| Bulk approve/reject | ❌ | ❌ | ✅ | ✅ |
| View all stats | ❌ | ❌ | ✅ | ✅ |

*Contributor permissions depend on category assignment

---

## Best Practices

### For Contributors

1. **Draft First**: Create questions in draft status and review them yourself before submitting
2. **Complete Information**: Ensure all fields are filled (explanation, tags, etc.)
3. **Check Similar Questions**: Search existing questions to avoid duplicates
4. **Read Rejection Feedback**: Carefully review moderator notes before resubmitting
5. **Batch Submissions**: Submit related questions together for context

### For Moderators

1. **Quick Turnaround**: Review within 24 hours to keep contributors motivated
2. **Constructive Feedback**: When rejecting, provide specific, actionable feedback
3. **Consistency**: Apply the same quality standards across all categories
4. **Bulk Operations**: Use bulk approve for trusted contributors
5. **Category Context**: Review questions within their subject area context

---

## Quality Checklist for Moderators

Before approving a question, check:

- [ ] Question text is clear and unambiguous
- [ ] Grammar and spelling are correct
- [ ] For multiple choice: Exactly one correct answer
- [ ] For multiple answer: At least one correct answer
- [ ] Options are well-distributed (no obvious wrong answers)
- [ ] Explanation is provided (if applicable)
- [ ] Difficulty level is appropriate
- [ ] Tags are relevant
- [ ] No duplicate questions exist
- [ ] Content is appropriate and accurate

---

## Monitoring & Metrics

### Track These KPIs:

1. **Review Turnaround Time**: Average time from submission to review
2. **Approval Rate**: Percentage of submitted questions approved
3. **Rejection Reasons**: Common patterns in rejection notes
4. **Resubmission Success**: Rejected questions that get approved after fixes
5. **Contributor Quality**: Approval rate by contributor

### Query Examples:

**Average review time:**
```sql
SELECT AVG(EXTRACT(EPOCH FROM (reviewed_at - submitted_for_review_at))) / 3600 AS avg_hours
FROM questions
WHERE status IN ('approved', 'rejected');
```

**Approval rate by contributor:**
```sql
SELECT
  created_by,
  COUNT(*) FILTER (WHERE status = 'approved') * 100.0 / COUNT(*) AS approval_rate
FROM questions
WHERE status IN ('approved', 'rejected')
GROUP BY created_by;
```

---

## Error Handling

### Common Errors:

**403 Forbidden**
```json
{
  "success": false,
  "message": "Forbidden: Insufficient permissions",
  "required": ["moderator", "super_admin"],
  "current": "user"
}
```

**400 Bad Request** (Missing rejection notes)
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "path": ["notes"],
      "message": "Rejection notes must be at least 10 characters"
    }
  ]
}
```

**500 Internal Server Error** (Wrong status)
```json
{
  "success": false,
  "message": "Question must be in pending_review status (current: draft)"
}
```

---

## Future Enhancements

Planned features for Phase 2:

1. **Email Notifications**: Notify contributors when their questions are reviewed
2. **Review Comments**: Thread of comments between moderator and contributor
3. **Version History**: Track all revisions of a question
4. **Auto-Approval**: Trusted contributors get auto-approved after X successful submissions
5. **Review Templates**: Predefined rejection reasons for faster review
6. **Review Assignment**: Assign specific questions to specific moderators
7. **SLA Tracking**: Automated alerts if reviews exceed 24 hours

---

## Testing the Review System

### 1. Create a Test Question

```bash
# As contributor
POST /api/questions
{
  "questionText": "Test question for review",
  "questionType": "multiple_choice",
  "categoryId": 1,
  "difficulty": "beginner",
  "points": 1,
  "options": [
    {"optionText": "A", "isCorrect": false, "order": 1},
    {"optionText": "B", "isCorrect": true, "order": 2}
  ]
}
# Note the question ID (e.g., 100)
```

### 2. Submit for Review

```bash
PUT /api/questions/100/submit-review
# Verify status changed to pending_review
```

### 3. Review as Moderator

```bash
# Login as moderator
POST /api/auth/login
{
  "email": "moderator@example.com",
  "password": "password"
}

# Check pending queue
GET /api/questions/pending-review

# Approve the question
PUT /api/questions/100/approve
{
  "notes": "Test approval"
}
```

### 4. Verify Published

```bash
GET /api/questions/100
# Verify: status = approved, isPublic = true
```

---

## Summary

✅ **4 Question Statuses**: draft, pending_review, approved, rejected
✅ **8 API Endpoints**: Submit, approve, reject, bulk operations, stats
✅ **Role-Based Access**: Moderators control approval workflow
✅ **Quality Control**: Mandatory feedback for rejections
✅ **Audit Trail**: Track who reviewed, when, and why

Your platform now has professional-grade content quality control! 🎯
