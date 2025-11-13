# RBAC Quick Start Guide

## Creating Your First Super Admin

After the RBAC system is deployed, you need to manually create your first super admin.

### Option 1: Via Database (Recommended for first admin)

```sql
-- Connect to your PostgreSQL database
docker compose exec db psql -U postgres -d quizmock

-- Update an existing user to super admin
UPDATE users
SET role = 'super_admin'
WHERE email = 'your-email@example.com';

-- Verify
SELECT id, name, email, role, is_active FROM users WHERE role = 'super_admin';
```

### Option 2: Via API (After first admin exists)

Once you have a super admin, use the API:

```bash
# Login as super admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d 
  "{
    "email": "admin@example.com",
    "password": "your-password"
  }"

# Promote another user to moderator
curl -X PUT http://localhost:3000/api/admin/users/5/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d 
  "{
    "role": "moderator"
  }"
```

---

## Quick Test: Assign a Contributor

### Step 1: Create Category (LET Example)

```bash
curl -X POST http://localhost:3000/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MODERATOR_TOKEN" \
  -d 
  "{
    "name": "LET - Professional Education",
    "slug": "let-professional-education",
    "description": "Questions for LET Professional Education subject"
  }"
```

### Step 2: Register Contributor

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d 
  "{
    "name": "Maria Santos",
    "email": "maria@example.com",
    "password": "secure-password"
  }"
```

### Step 3: Assign as Contributor

```bash
curl -X POST http://localhost:3000/api/admin/contributors \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MODERATOR_TOKEN" \
  -d 
  "{
    "userId": 3,
    "categoryId": 1,
    "canCreateQuestions": true,
    "canEditQuestions": false,
    "canDeleteQuestions": false,
    "canCreateExams": false,
    "notes": "LET Professional Education expert"
  }"
```

### Step 4: Contributor Creates Question

```bash
# Login as contributor
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d 
  "{
    "email": "maria@example.com",
    "password": "secure-password"
  }"

# Create question (will succeed because contributor has permission)
curl -X POST http://localhost:3000/api/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer CONTRIBUTOR_TOKEN" \
  -d 
  "{
    "questionText": "What are the major theories of learning?",
    "questionType": "essay",
    "categoryId": 1,
    "difficulty": "intermediate",
    "points": 5,
    "explanation": "Answer should cover behaviorism, cognitivism, and constructivism",
    "isPublic": true,
    "options": []
  }"
```

---

## Common Commands

### List All Users
```bash
curl http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer YOUR_MODERATOR_TOKEN"
```

### Search Users
```bash
curl "http://localhost:3000/api/admin/users?search=maria&role=user" \
  -H "Authorization: Bearer YOUR_MODERATOR_TOKEN"
```

### View Category Contributors
```bash
curl http://localhost:3000/api/admin/categories/1/contributors \
  -H "Authorization: Bearer YOUR_MODERATOR_TOKEN"
```

### View User's Contributions
```bash
curl http://localhost:3000/api/admin/users/3/contributions \
  -H "Authorization: Bearer YOUR_MODERATOR_TOKEN"
```

### Deactivate User
```bash
curl -X PUT http://localhost:3000/api/admin/users/5/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_MODERATOR_TOKEN" \
  -d 
  "{
    "isActive": false
  }"
```

### Remove Contributor Access
```bash
curl -X DELETE http://localhost:3000/api/admin/contributors/3/categories/1 \
  -H "Authorization: Bearer YOUR_MODERATOR_TOKEN"
```

---

## Permission Matrix

| Action | User | Contributor* | Moderator | Super Admin |
|--------|------|--------------|-----------|-------------|
| Create own questions | ✅ | ✅ | ✅ | ✅ |
| Edit own questions | ✅ | ✅ | ✅ | ✅ |
| Delete own questions | ✅ | ✅ | ✅ | ✅ |
| Create in assigned category | ❌ | ✅ (if granted) | ✅ | ✅ |
| Edit others\' questions | ❌ | ✅ (if granted) | ✅ | ✅ |
| Delete others\' questions | ❌ | ✅ (if granted) | ✅ | ✅ |
| Create exams | ✅ (own) | ✅ (if granted) | ✅ | ✅ |
| Assign contributors | ❌ | ✅ | ✅ | ✅ |
| Change user roles | ❌ | ❌ | ❌ | ✅ |
| Deactivate users | ❌ | ❌ | ✅ | ✅ |

*Contributor permissions depend on category assignment

---

## Category Examples for Philippines

### LET (Licensure Examination for Teachers)
- LET - General Education
- LET - Professional Education
- LET - Specialization (Major)

### Nursing
- Nursing - Fundamentals
- Nursing - Medical-Surgical
- Nursing - Maternal & Child
- Nursing - Community Health

### Civil Service
- Civil Service - Professional Level
- Civil Service - Sub-Professional Level

### Engineering
- Civil Engineering Board Exam
- Electrical Engineering Board Exam
- Mechanical Engineering Board Exam

---

## Troubleshooting

### Error: "Forbidden: You do not have permission..."

**Check:**
1. Is user assigned as contributor for this category?
2. Does contributor have the specific permission needed?
3. Is the assignment active (`is_active = true`)?

```bash
# Check user\'s contributions
curl http://localhost:3000/api/admin/users/3/contributions \
  -H "Authorization: Bearer YOUR_MODERATOR_TOKEN"
```

### Error: "You cannot change your own role"

Super admins cannot demote themselves. This is a safety feature.

**Solution:** Use another super admin account to change roles.

### Error: "You cannot deactivate your own account"

Users cannot deactivate their own accounts.

**Solution:** Have another moderator/admin deactivate the account.

---

## Next Steps

1. ✅ Create your first super admin (via database)
2. ✅ Login and test admin endpoints
3. ✅ Create categories for your exam types
4. ✅ Register contributors
5. ✅ Assign contributors to categories
6. ✅ Test question creation with contributor accounts
7. ✅ Monitor and adjust permissions as needed

See [RBAC_GUIDE.md](RBAC_GUIDE.md) for complete documentation.
