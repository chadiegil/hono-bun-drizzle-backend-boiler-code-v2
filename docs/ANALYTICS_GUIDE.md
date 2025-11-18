# Analytics Dashboard Guide

## Overview

The Analytics Dashboard provides comprehensive insights into user performance, question effectiveness, and overall system usage. It offers both user-facing analytics (for students to track their progress) and admin-facing analytics (for moderators to monitor content quality and system health).

## Features

### For Users
- **Performance Metrics**: Track your scores, completion rates, and improvement over time
- **Category Performance**: See how you perform in different subject areas
- **Progress Tracking**: Visualize your learning journey with time-based analytics
- **Strength & Weakness Analysis**: Identify topics you excel at and areas that need more practice

### For Moderators/Admins
- **Question Analytics**: Understand which questions are effective and which need revision
- **Overall Statistics**: Get a bird's-eye view of system usage and performance
- **Daily Activity**: Monitor user engagement and platform activity
- **User Performance Tracking**: View detailed analytics for any user

## API Endpoints

### User Analytics (Authenticated Users)

#### 1. Get User Performance Metrics

Get comprehensive performance statistics for the current user.

**Endpoint**: `GET /api/analytics/user/performance`

**Authorization**: Required (Bearer token)

**Query Parameters**:
- `dateFrom` (optional): Start date for filtering (ISO 8601 format)
- `dateTo` (optional): End date for filtering (ISO 8601 format)

**Response**:
```json
{
  "success": true,
  "message": "User performance metrics retrieved successfully",
  "data": {
    "totalAttempts": 10,
    "completedAttempts": 8,
    "averageScore": 85.5,
    "highestScore": 100,
    "lowestScore": 65,
    "totalTimeSpent": 3600,
    "averageTimePerAttempt": 450,
    "totalCorrectAnswers": 45,
    "totalIncorrectAnswers": 8,
    "totalUnansweredQuestions": 2,
    "passRate": 87.5,
    "improvementRate": 15.3,
    "recentAttempts": [
      {
        "id": 123,
        "examName": "General Knowledge Quiz",
        "score": 90,
        "completedAt": "2025-11-14T10:30:00Z",
        "duration": 420,
        "isPassed": true
      }
    ]
  }
}
```

**Metrics Explained**:
- `totalAttempts`: Total number of exam attempts
- `completedAttempts`: Number of completed exams
- `averageScore`: Average score across all completed attempts (percentage)
- `highestScore`: Best score achieved
- `lowestScore`: Lowest score achieved
- `totalTimeSpent`: Total time spent on exams (seconds)
- `averageTimePerAttempt`: Average time per exam (seconds)
- `totalCorrectAnswers`: Total number of correct answers
- `totalIncorrectAnswers`: Total number of incorrect answers
- `totalUnansweredQuestions`: Total number of unanswered questions
- `passRate`: Percentage of passed exams
- `improvementRate`: Percentage improvement (comparing recent 5 vs previous 5 attempts)
- `recentAttempts`: Last 10 completed attempts

**Example**:
```bash
# Get all-time performance
curl -X GET http://localhost:3000/api/analytics/user/performance \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get performance for last 30 days
curl -X GET "http://localhost:3000/api/analytics/user/performance?dateFrom=2025-10-15&dateTo=2025-11-14" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 2. Get Category Performance

View performance breakdown by category/subject.

**Endpoint**: `GET /api/analytics/user/categories`

**Authorization**: Required (Bearer token)

**Response**:
```json
{
  "success": true,
  "message": "Category performance retrieved successfully",
  "data": [
    {
      "categoryId": 1,
      "categoryName": "Mathematics",
      "totalAttempts": 5,
      "averageScore": 88.5,
      "totalQuestions": 25,
      "correctAnswers": 22,
      "incorrectAnswers": 3,
      "accuracyRate": 88
    }
  ]
}
```

**Example**:
```bash
curl -X GET http://localhost:3000/api/analytics/user/categories \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3. Get Weakest Topics

Identify your weakest categories to focus on.

**Endpoint**: `GET /api/analytics/user/weakest-topics`

**Authorization**: Required (Bearer token)

**Query Parameters**:
- `limit` (optional): Number of topics to return (default: 5)

**Response**:
```json
{
  "success": true,
  "message": "Weakest topics retrieved successfully",
  "data": [
    {
      "categoryId": 3,
      "categoryName": "Physics",
      "totalAttempts": 3,
      "averageScore": 65.2,
      "totalQuestions": 15,
      "correctAnswers": 10,
      "incorrectAnswers": 5,
      "accuracyRate": 66.67
    }
  ]
}
```

**Example**:
```bash
# Get top 3 weakest topics
curl -X GET "http://localhost:3000/api/analytics/user/weakest-topics?limit=3" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 4. Get Strongest Topics

Identify your strongest categories.

**Endpoint**: `GET /api/analytics/user/strongest-topics`

**Authorization**: Required (Bearer token)

**Query Parameters**:
- `limit` (optional): Number of topics to return (default: 5)

**Response**: Same format as weakest topics

**Example**:
```bash
curl -X GET "http://localhost:3000/api/analytics/user/strongest-topics?limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 5. Get Progress Over Time

Track your score progression over time.

**Endpoint**: `GET /api/analytics/user/progress`

**Authorization**: Required (Bearer token)

**Query Parameters**:
- `period` (optional): Grouping period - `day`, `week`, or `month` (default: `week`)

**Response**:
```json
{
  "success": true,
  "message": "Progress over time retrieved successfully",
  "data": [
    {
      "period": "2025-11-04",
      "averageScore": 75.5,
      "totalAttempts": 3,
      "completedAttempts": 3
    },
    {
      "period": "2025-11-11",
      "averageScore": 85.0,
      "totalAttempts": 4,
      "completedAttempts": 4
    }
  ]
}
```

**Example**:
```bash
# Get daily progress
curl -X GET "http://localhost:3000/api/analytics/user/progress?period=day" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get weekly progress
curl -X GET "http://localhost:3000/api/analytics/user/progress?period=week" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get monthly progress
curl -X GET "http://localhost:3000/api/analytics/user/progress?period=month" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Admin/Moderator Analytics

#### 6. Get Question Analytics

Analyze question performance to identify problems and improve content quality.

**Endpoint**: `GET /api/analytics/questions`

**Authorization**: Required (Moderator or Super Admin)

**Query Parameters**:
- `questionId` (optional): Filter by specific question ID
- `categoryId` (optional): Filter by category
- `limit` (optional): Number of questions to return (default: 50)

**Response**:
```json
{
  "success": true,
  "message": "Question analytics retrieved successfully",
  "data": [
    {
      "questionId": 42,
      "questionText": "What is the capital of France?",
      "questionType": "multiple_choice",
      "difficulty": "beginner",
      "categoryName": "Geography",
      "totalAttempts": 150,
      "correctAttempts": 135,
      "incorrectAttempts": 15,
      "accuracyRate": 90,
      "averageTimeSpent": 25.5,
      "mostSelectedWrongOption": "Lyon"
    }
  ]
}
```

**Use Cases**:
- **High attempt count + low accuracy**: Question may be confusing or poorly worded
- **Most selected wrong option**: Reveals common misconceptions
- **Very high/low accuracy**: May need difficulty adjustment
- **High average time spent**: Question might be complex or unclear

**Example**:
```bash
# Get analytics for all questions
curl -X GET http://localhost:3000/api/analytics/questions \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get analytics for specific category
curl -X GET "http://localhost:3000/api/analytics/questions?categoryId=1&limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get analytics for specific question
curl -X GET "http://localhost:3000/api/analytics/questions?questionId=42" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 7. Get Overall Statistics

System-wide statistics and key metrics.

**Endpoint**: `GET /api/analytics/overall`

**Authorization**: Required (Moderator or Super Admin)

**Response**:
```json
{
  "success": true,
  "message": "Overall statistics retrieved successfully",
  "data": {
    "totalUsers": 1250,
    "totalQuestions": 5000,
    "totalExams": 150,
    "totalAttempts": 12500,
    "totalCompletedAttempts": 11000,
    "averageScoreAllUsers": 78.5,
    "averageCompletionTime": 1800,
    "mostPopularCategory": "Mathematics",
    "hardestQuestion": "Explain quantum entanglement",
    "easiestQuestion": "What is 2+2?"
  }
}
```

**Example**:
```bash
curl -X GET http://localhost:3000/api/analytics/overall \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 8. Get Daily Activity

Monitor daily user engagement and platform usage.

**Endpoint**: `GET /api/analytics/daily-activity`

**Authorization**: Required (Moderator or Super Admin)

**Query Parameters** (both required):
- `dateFrom`: Start date (ISO 8601 format)
- `dateTo`: End date (ISO 8601 format)

**Response**:
```json
{
  "success": true,
  "message": "Daily activity retrieved successfully",
  "data": [
    {
      "date": "2025-11-13",
      "totalAttempts": 250,
      "completedAttempts": 220,
      "averageScore": 82.5,
      "uniqueUsers": 150
    },
    {
      "date": "2025-11-14",
      "totalAttempts": 280,
      "completedAttempts": 250,
      "averageScore": 85.0,
      "uniqueUsers": 165
    }
  ]
}
```

**Example**:
```bash
# Get last 7 days of activity
curl -X GET "http://localhost:3000/api/analytics/daily-activity?dateFrom=2025-11-07&dateTo=2025-11-14" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 9. Get Specific User Performance

View performance metrics for any user (admin feature).

**Endpoint**: `GET /api/analytics/users/:userId/performance`

**Authorization**: Required (Moderator or Super Admin)

**Path Parameters**:
- `userId`: User ID to analyze

**Query Parameters**:
- `dateFrom` (optional): Start date for filtering
- `dateTo` (optional): End date for filtering

**Response**: Same format as `/api/analytics/user/performance`

**Example**:
```bash
# Get performance for user ID 42
curl -X GET http://localhost:3000/api/analytics/users/42/performance \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get performance for specific date range
curl -X GET "http://localhost:3000/api/analytics/users/42/performance?dateFrom=2025-11-01&dateTo=2025-11-14" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Common Use Cases

### For Students

#### Track Your Progress
```bash
# 1. Get overall performance
curl -X GET http://localhost:3000/api/analytics/user/performance \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. See progress over time
curl -X GET "http://localhost:3000/api/analytics/user/progress?period=week" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Identify weak areas
curl -X GET http://localhost:3000/api/analytics/user/weakest-topics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Focus Your Study
```bash
# 1. Find your weakest topics
curl -X GET "http://localhost:3000/api/analytics/user/weakest-topics?limit=3" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Check category-specific performance
curl -X GET http://localhost:3000/api/analytics/user/categories \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### For Moderators

#### Improve Question Quality
```bash
# 1. Find questions with low accuracy
curl -X GET "http://localhost:3000/api/analytics/questions?limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Analyze specific category
curl -X GET "http://localhost:3000/api/analytics/questions?categoryId=1" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Review specific question
curl -X GET "http://localhost:3000/api/analytics/questions?questionId=42" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Monitor System Health
```bash
# 1. Get overall statistics
curl -X GET http://localhost:3000/api/analytics/overall \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Check recent activity
curl -X GET "http://localhost:3000/api/analytics/daily-activity?dateFrom=2025-11-07&dateTo=2025-11-14" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Data Insights and Interpretations

### Improvement Rate

The improvement rate compares your recent 5 attempts against the previous 5 attempts:
- **Positive number**: You're improving! (e.g., +15.3% means 15.3% better)
- **Negative number**: You might need to review the material
- **Zero**: Consistent performance

### Accuracy Rate

Percentage of correct answers for a category or question:
- **90-100%**: Excellent understanding
- **70-89%**: Good grasp, minor gaps
- **50-69%**: Needs more practice
- **Below 50%**: Requires significant review

### Pass Rate

Percentage of exams you passed:
- **90-100%**: Excellent exam readiness
- **70-89%**: Good preparation
- **50-69%**: Moderate success, needs improvement
- **Below 50%**: Significant gaps in knowledge

### Question Analytics Insights

For moderators analyzing questions:

**High Attempts + Low Accuracy (< 60%)**
- Question might be too difficult for the stated difficulty level
- Wording may be confusing or ambiguous
- Correct answer might be incorrect
- Consider revision or removal

**Very High Accuracy (> 95%)**
- Question might be too easy
- Consider increasing difficulty level
- May be a good "confidence builder" question

**Most Selected Wrong Option**
- Reveals common misconceptions
- Opportunity for targeted explanation
- Consider adding explanation to address this misconception

**High Time Spent**
- Question might be complex or lengthy
- Could indicate confusion
- Review question clarity

## Performance Optimization Tips

### For Users

1. **Focus on Weak Areas**: Use weakest topics to prioritize study time
2. **Track Improvement**: Monitor progress weekly to stay motivated
3. **Consistency**: Aim for positive improvement rates
4. **Balanced Practice**: Don't neglect your strong topics

### For Moderators

1. **Regular Review**: Check question analytics monthly
2. **Quality Over Quantity**: Remove or revise poorly performing questions
3. **Monitor Trends**: Watch daily activity for engagement patterns
4. **User Feedback**: Combine analytics with user reports

## Permissions

### Regular Users
- Can view only their own analytics
- Cannot access admin/moderator endpoints
- Cannot view other users' performance

### Moderators
- Can access all analytics endpoints
- Can view question analytics
- Can view any user's performance
- Can access overall statistics

### Super Admins
- Full access to all analytics features
- Can manage moderator permissions
- Can view system-wide statistics

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "No token provided"
}
```

**Solution**: Include valid Bearer token in Authorization header

### 403 Forbidden
```json
{
  "success": false,
  "message": "Forbidden: Only moderators and admins can access question analytics"
}
```

**Solution**: Ensure your account has the required role (moderator or super_admin)

### 400 Bad Request
```json
{
  "success": false,
  "message": "dateFrom and dateTo query parameters are required"
}
```

**Solution**: Provide required query parameters

## Integration Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const API_URL = 'http://localhost:3000';
const token = 'YOUR_AUTH_TOKEN';

// Get user performance
async function getUserPerformance() {
  const response = await axios.get(`${API_URL}/api/analytics/user/performance`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data.data;
}

// Get progress over time
async function getProgress(period = 'week') {
  const response = await axios.get(`${API_URL}/api/analytics/user/progress`, {
    params: { period },
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data.data;
}

// Get weakest topics
async function getWeakestTopics(limit = 5) {
  const response = await axios.get(`${API_URL}/api/analytics/user/weakest-topics`, {
    params: { limit },
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data.data;
}

// Admin: Get question analytics
async function getQuestionAnalytics(categoryId?: number) {
  const response = await axios.get(`${API_URL}/api/analytics/questions`, {
    params: categoryId ? { categoryId } : {},
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data.data;
}
```

### Python

```python
import requests
from datetime import datetime, timedelta

API_URL = 'http://localhost:3000'
TOKEN = 'YOUR_AUTH_TOKEN'

headers = {
    'Authorization': f'Bearer {TOKEN}'
}

# Get user performance
def get_user_performance(date_from=None, date_to=None):
    params = {}
    if date_from:
        params['dateFrom'] = date_from.isoformat()
    if date_to:
        params['dateTo'] = date_to.isoformat()

    response = requests.get(
        f'{API_URL}/api/analytics/user/performance',
        params=params,
        headers=headers
    )
    return response.json()['data']

# Get category performance
def get_category_performance():
    response = requests.get(
        f'{API_URL}/api/analytics/user/categories',
        headers=headers
    )
    return response.json()['data']

# Get weakest topics
def get_weakest_topics(limit=5):
    response = requests.get(
        f'{API_URL}/api/analytics/user/weakest-topics',
        params={'limit': limit},
        headers=headers
    )
    return response.json()['data']

# Get daily activity (admin)
def get_daily_activity(days_back=7):
    date_to = datetime.now()
    date_from = date_to - timedelta(days=days_back)

    response = requests.get(
        f'{API_URL}/api/analytics/daily-activity',
        params={
            'dateFrom': date_from.date().isoformat(),
            'dateTo': date_to.date().isoformat()
        },
        headers=headers
    )
    return response.json()['data']
```

## Troubleshooting

### No Data Returned

**Problem**: Analytics endpoints return empty arrays or zero values

**Solutions**:
1. Ensure the user has completed at least one exam
2. Check date range filters - they might be too restrictive
3. Verify questions exist in the requested category

### Inaccurate Metrics

**Problem**: Metrics don't match expectations

**Solutions**:
1. Check if filtering by date range
2. Ensure exam attempts were completed (not abandoned)
3. Verify questions have been answered (not left blank)

### Permission Denied

**Problem**: 403 Forbidden error when accessing analytics

**Solutions**:
1. Verify your user role (must be moderator or super_admin for admin endpoints)
2. Refresh your authentication token
3. Contact system administrator to verify permissions

## Future Enhancements

Planned features for future releases:

- **Comparative Analytics**: Compare your performance with average users
- **Predictive Analytics**: AI-powered predictions of exam readiness
- **Custom Reports**: Generate and schedule custom analytics reports
- **Export Analytics**: Download analytics data in CSV/PDF format
- **Real-time Analytics**: WebSocket-based live analytics updates
- **Learning Recommendations**: AI-suggested topics based on performance
- **Streak Tracking**: Track consecutive days of practice
- **Achievement System**: Badges and milestones based on analytics

## Support

For issues or questions:

1. Check this documentation
2. Verify authentication and permissions
3. Test with sample data
4. Review error messages carefully
5. Contact system administrator if issues persist
