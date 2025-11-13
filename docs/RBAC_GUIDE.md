# Role-Based Access Control (RBAC) Guide

## Overview

QuizMock implements a comprehensive role-based access control system with three user roles and a flexible contributor system for category-specific permissions.

---

## User Roles

### 1. **User** (Default Role)
- Standard user account
- Can take exams and quizzes
- Can create questions and exams for their own use
- Can edit/delete only their own content
- Limited access to public features

### 2. **Moderator**
- Enhanced privileges for content moderation
- Can edit and delete any questions/exams
- Can manage contributors for categories
- Can activate/deactivate user accounts
- Cannot change user roles (super admin only)

### 3. **Super Admin**
- Full system access
- Can assign/change user roles
- Can manage all content and users
- Can assign moderators and contributors
- Cannot be demoted by themselves (safety check)

---

## Contributor System

Contributors are users assigned specific permissions for particular categories (e.g., LET, Nursing, Engineering).

### Contributor Permissions

When assigning a contributor to a category, you can grant these permissions:

| Permission | Description | Default |
|------------|-------------|---------|
| `canCreateQuestions` | Create new questions in the category | ✅ Yes |
| `canEditQuestions` | Edit any questions in the category | ❌ No |
| `canDeleteQuestions` | Delete any questions in the category | ❌ No |
| `canCreateExams` | Create exams in the category | ❌ No |

### Use Cases

**Example 1: LET Contributor**
```
Category: LET (Licensure Examination for Teachers)
Contributor: teacher@example.com
Permissions:
  - canCreateQuestions: true
  - canEditQuestions: false
  - canDeleteQuestions: false
  - canCreateExams: false
```

**Example 2: Nursing Exam Creator**
```
Category: Nursing
Contributor: nurse@example.com
Permissions:
  - canCreateQuestions: true
  - canEditQuestions: true
  - canDeleteQuestions: false
  - canCreateExams: true
```

---

## API Endpoints

### Admin User Management

#### Get All Users
```http
GET /api/admin/users?role=moderator&search=john&page=1&limit=20
Authorization: Bearer {token}
Requires: Moderator or Super Admin
```

Query Parameters:
- `role`: Filter by role (user, moderator, super_admin)
- `isActive`: Filter by status (true/false)
- `search`: Search by name or email
- `page`: Page number
- `limit`: Results per page

#### Update User Role
```http
PUT /api/admin/users/:id/role
Authorization: Bearer {token}
Requires: Super Admin only
Content-Type: application/json

{
  "role": "moderator"
}
```

Roles: `user`, `moderator`, `super_admin`

**Safety Rules:**
- Super admins cannot demote themselves
- Only super admins can change roles

#### Activate/Deactivate User
```http
PUT /api/admin/users/:id/status
Authorization: Bearer {token}
Requires: Moderator or Super Admin
Content-Type: application/json

{
  "isActive": false
}
```

**Safety Rules:**
- Users cannot deactivate their own accounts

---

### Contributor Management

#### Assign Contributor to Category
```http
POST /api/admin/contributors
Authorization: Bearer {token}
Requires: Moderator or Super Admin
Content-Type: application/json

{
  "userId": 5,
  "categoryId": 2,
  "canCreateQuestions": true,
  "canEditQuestions": true,
  "canDeleteQuestions": false,
  "canCreateExams": true,
  "notes": "LET subject matter expert"
}
```

If the assignment already exists, it will be updated with new permissions.

#### Remove Contributor Assignment
```http
DELETE /api/admin/contributors/:userId/categories/:categoryId
Authorization: Bearer {token}
Requires: Moderator or Super Admin
```

#### Get Category Contributors
```http
GET /api/admin/categories/:id/contributors
Authorization: Bearer {token}
Requires: Moderator or Super Admin
```

#### Get User's Contributions
```http
GET /api/admin/users/:id/contributions
Authorization: Bearer {token}
Requires: Moderator or Super Admin
```

---

## Permission Flows

### Creating a Question

```mermaid
User creates question → Check permissions:
├─ Super Admin? → ✅ Allow
├─ Moderator? → ✅ Allow
├─ Question has category?
│  ├─ Is contributor for category? → Check canCreateQuestions → Allow/Deny
│  └─ Not contributor? → ❌ Deny
└─ No category? → ❌ Deny (only admins can create uncategorized)
```

### Editing a Question

```mermaid
User edits question → Check permissions:
├─ Super Admin? → ✅ Allow
├─ Created by user? → ✅ Allow (own content)
├─ Moderator? → ✅ Allow (can edit any)
├─ Question has category?
│  └─ Is contributor with canEditQuestions? → Allow/Deny
└─ Else → ❌ Deny
```

### Deleting a Question

```mermaid
User deletes question → Check permissions:
├─ Super Admin? → ✅ Allow
├─ Created by user? → ✅ Allow (own content)
├─ Moderator? → ✅ Allow (can delete any)
├─ Question has category?
│  └─ Is contributor with canDeleteQuestions? → Allow/Deny
└─ Else → ❌ Deny
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role user_role DEFAULT 'user' NOT NULL,  -- NEW
  is_active BOOLEAN DEFAULT true NOT NULL, -- NEW
  refresh_token TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE user_role AS ENUM ('super_admin', 'moderator', 'user');
```

### Contributor Assignments Table
```sql
CREATE TABLE contributor_assignments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES users(id) NOT NULL,
  can_create_questions BOOLEAN DEFAULT true NOT NULL,
  can_edit_questions BOOLEAN DEFAULT false NOT NULL,
  can_delete_questions BOOLEAN DEFAULT false NOT NULL,
  can_create_exams BOOLEAN DEFAULT false NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, category_id)
);
```

---

## Security Features

### 1. **Role Hierarchy**
- Super Admin > Moderator > User
- Higher roles inherit lower role permissions

### 2. **Self-Protection**
- Users cannot change their own role
- Users cannot deactivate their own account
- Prevents accidental lockouts

### 3. **Category Isolation**
- Contributors only have access to assigned categories
- Permissions are granular per category
- Easy to revoke access

### 4. **Audit Trail**
- Track who assigned contributors (`assigned_by`)
- All assignments have timestamps
- Soft delete with `is_active` flag

---

## Common Workflows

### Workflow 1: Onboarding a LET Contributor

1. **Create category** (if doesn't exist)
```bash
POST /api/categories
{
  "name": "LET - Licensure Examination for Teachers",
  "slug": "let",
  "description": "Questions for teacher licensure exams"
}
```

2. **User registers**
```bash
POST /api/auth/register
{
  "name": "Maria Santos",
  "email": "maria.santos@example.com",
  "password": "securepassword"
}
```

3. **Admin assigns as contributor**
```bash
POST /api/admin/contributors
{
  "userId": 15,
  "categoryId": 3,
  "canCreateQuestions": true,
  "canEditQuestions": false,
  "notes": "LET subject matter expert - Filipino"
}
```

4. **Contributor creates questions**
```bash
POST /api/questions
{
  "questionText": "Ano ang ibig sabihin ng 'Pag-asa'?",
  "questionType": "multiple_choice",
  "categoryId": 3,
  "difficulty": "beginner",
  ...
}
```

### Workflow 2: Promoting User to Moderator

1. **Super admin promotes user**
```bash
PUT /api/admin/users/42/role
{
  "role": "moderator"
}
```

2. **Moderator can now:**
- Manage all questions and exams
- Assign contributors
- Activate/deactivate users

### Workflow 3: Removing Contributor Access

```bash
DELETE /api/admin/contributors/15/categories/3
```

This soft-deletes the assignment (sets `is_active = false`).

---

## Best Practices

### 1. **Start Small**
- Begin with limited permissions
- Grant additional permissions as trust builds
- Example: Start with only `canCreateQuestions`

### 2. **Use Category Organization**
- Create specific categories for exams (LET, Nursing, Civil Service)
- Assign specialized contributors to each
- Easier to manage and audit

### 3. **Regular Audits**
```bash
GET /api/admin/categories/3/contributors  # See who has access
GET /api/admin/users/15/contributions     # See user's assignments
```

### 4. **Moderator Assignment**
- Assign moderators for specific subject areas
- They can manage contributors in their domain
- Super admins handle role changes

### 5. **Documentation**
- Use the `notes` field when assigning contributors
- Example: "LET Filipino expert - Active since Jan 2025"

---

## Error Handling

### Common Errors

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Forbidden: You do not have permission to create questions in this category"
}
```
**Solution**: Check if user is assigned as contributor or has appropriate role

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized"
}
```
**Solution**: Ensure valid JWT token is provided

#### 409 Conflict
```json
{
  "success": false,
  "message": "Contributor assignment already exists"
}
```
**Solution**: Update existing assignment instead of creating new one

---

## Testing RBAC

### Test User Roles

```bash
# Create test users
POST /api/auth/register (user)
POST /api/auth/register (to be promoted)

# Promote to moderator (as super admin)
PUT /api/admin/users/2/role {"role": "moderator"}

# Try creating question as regular user (should fail for protected categories)
# Try creating question as contributor (should succeed for assigned category)
# Try editing any question as moderator (should succeed)
```

### Test Contributor Permissions

```bash
# Assign contributor
POST /api/admin/contributors
{
  "userId": 3,
  "categoryId": 1,
  "canCreateQuestions": true,
  "canEditQuestions": false
}

# Test create (should succeed)
POST /api/questions {"categoryId": 1, ...}

# Test edit others' questions (should fail)
PUT /api/questions/5 {...}

# Update permissions
POST /api/admin/contributors
{
  "userId": 3,
  "categoryId": 1,
  "canEditQuestions": true
}

# Test edit again (should succeed now)
PUT /api/questions/5 {...}
```

---

## Migration Notes

If you have existing users, they will default to `role = 'user'` and `is_active = true`.

To create your first super admin:

```sql
-- Manually update via database
UPDATE users
SET role = 'super_admin'
WHERE email = 'your-admin-email@example.com';
```

Then use the API to manage other users.

---

## Summary

✅ **3 User Roles**: Super Admin, Moderator, User
✅ **Contributor System**: Category-specific permissions
✅ **Granular Permissions**: 4 permission types per category
✅ **Safety Checks**: Prevent self-demotion and lockouts
✅ **API Endpoints**: 6 admin endpoints for user/contributor management
✅ **Automatic Checks**: All question/exam operations check permissions

Your app is now ready for multi-contributor exam platforms like LET, Nursing boards, Civil Service, and more! 🎓
