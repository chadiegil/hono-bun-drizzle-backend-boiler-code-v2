# Import/Export System Guide

## Overview

The Import/Export system allows you to bulk import questions from CSV files and export questions for backup, sharing, or migration purposes. This feature is designed to save time when adding large numbers of questions to the system.

## Features

- **CSV Template Generation**: Download a pre-formatted CSV template with headers and an example question
- **Import Preview**: Validate your CSV file without saving to the database
- **Bulk Import**: Import multiple questions at once from a CSV file
- **Bulk Export**: Export questions to CSV format with various filters
- **Validation**: Comprehensive validation of question data before import
- **Error Reporting**: Detailed error messages for each invalid row

## API Endpoints

### 1. Download CSV Template

Get a CSV template with proper headers and an example question.

**Endpoint**: `GET /api/questions/import-template`

**Authorization**: None required

**Response**: CSV file download

**Example**:
```bash
curl -O http://localhost:3000/api/questions/import-template
```

### 2. Preview Import

Validate a CSV file without actually importing the questions.

**Endpoint**: `POST /api/questions/import/preview`

**Authorization**: Required (Bearer token)

**Body**: Multipart form data with file field

**Response**:
```json
{
  "success": true,
  "message": "Preview successful: 3 questions valid",
  "data": {
    "total": 3,
    "valid": 3,
    "invalid": 0,
    "errors": [],
    "preview": [...]
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/questions/import/preview \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@questions.csv"
```

### 3. Import Questions

Import questions from a CSV file into the database.

**Endpoint**: `POST /api/questions/import`

**Authorization**: Required (Bearer token)

**Body**: Multipart form data with file field

**Response**:
```json
{
  "success": true,
  "message": "Successfully imported 3 of 3 questions",
  "data": {
    "total": 3,
    "imported": 3,
    "failed": 0,
    "errors": [],
    "questions": [...]
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/questions/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@questions.csv"
```

### 4. Export Questions

Export questions to CSV format.

**Endpoint**: `GET /api/questions/export`

**Authorization**: Required (Bearer token)

**Query Parameters**:
- `categoryId` (optional): Filter by category ID
- `difficulty` (optional): Filter by difficulty (beginner, intermediate, advanced, mixed)
- `questionType` (optional): Filter by question type
- `createdBy` (optional): Filter by creator (moderators only)

**Response**: CSV file download

**Examples**:
```bash
# Export all your questions
curl -X GET http://localhost:3000/api/questions/export \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o my-questions.csv

# Export questions from specific category
curl -X GET "http://localhost:3000/api/questions/export?categoryId=1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o category-1-questions.csv

# Export beginner questions
curl -X GET "http://localhost:3000/api/questions/export?difficulty=beginner" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o beginner-questions.csv
```

## CSV Format Specification

### Headers (18 columns)

| Column Name | Required | Type | Description |
|------------|----------|------|-------------|
| questionText | Yes | String | The question text |
| questionType | Yes | Enum | One of: multiple_choice, true_false, essay, fill_blank, multiple_answer |
| categoryId | No | Number | Category ID (must exist in database) |
| difficulty | Yes | Enum | One of: beginner, intermediate, advanced, mixed |
| points | No | Number | Points awarded for correct answer (default: 1) |
| explanation | No | String | Explanation for the correct answer |
| tags | No | String | Comma-separated tags (e.g., "math,geometry,circles") |
| isPublic | No | Boolean | Whether question is public (true/false, default: false) |
| option1Text | Conditional | String | Text for first option |
| option1IsCorrect | Conditional | Boolean | Whether first option is correct |
| option2Text | Conditional | String | Text for second option |
| option2IsCorrect | Conditional | Boolean | Whether second option is correct |
| option3Text | Conditional | String | Text for third option |
| option3IsCorrect | Conditional | Boolean | Whether third option is correct |
| option4Text | Conditional | String | Text for fourth option |
| option4IsCorrect | Conditional | Boolean | Whether fourth option is correct |
| option5Text | Conditional | String | Text for fifth option |
| option5IsCorrect | Conditional | Boolean | Whether fifth option is correct |

### Question Type Requirements

#### Multiple Choice
- Must have at least 2 options
- Must have exactly 1 correct answer
- Supports up to 5 options

#### True/False
- Must have exactly 2 options
- Must have exactly 1 correct answer
- Options should be "True" and "False"

#### Multiple Answer
- Must have at least 2 options
- Must have at least 1 correct answer
- Can have multiple correct answers
- Supports up to 5 options

#### Essay
- Should NOT have any options
- All option fields should be empty

#### Fill in the Blank
- Should NOT have any options
- All option fields should be empty

### Example CSV

```csv
questionText,questionType,categoryId,difficulty,points,explanation,tags,isPublic,option1Text,option1IsCorrect,option2Text,option2IsCorrect,option3Text,option3IsCorrect,option4Text,option4IsCorrect,option5Text,option5IsCorrect
What is 2+2?,multiple_choice,1,beginner,1,Basic arithmetic,"math,arithmetic",false,3,false,4,true,5,false,6,false,,
What is the capital of Spain?,multiple_choice,1,beginner,1,Madrid is the capital of Spain,"geography,capitals",false,Barcelona,false,Madrid,true,Seville,false,Valencia,false,,
Is the Earth round?,true_false,1,beginner,1,The Earth is roughly spherical,"science,earth",true,True,true,False,false,,,,,,
Explain photosynthesis,essay,1,intermediate,5,Photosynthesis is the process by which plants convert light energy into chemical energy,biology,false,,,,,,,,,,
The chemical symbol for gold is ___,fill_blank,1,beginner,2,Au is the chemical symbol for gold,chemistry,false,,,,,,,,,,
```

## Import Workflow

### Step 1: Download Template
```bash
curl -O http://localhost:3000/api/questions/import-template
```

### Step 2: Fill in Your Questions
- Open the template in Excel, Google Sheets, or any CSV editor
- Add your questions following the format
- Ensure required fields are filled
- Verify question types match their options

### Step 3: Preview Import
```bash
curl -X POST http://localhost:3000/api/questions/import/preview \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@your-questions.csv"
```

Review the preview response:
- Check `total`: Total rows in CSV
- Check `valid`: Number of valid questions
- Check `invalid`: Number of invalid questions
- Review `errors`: Detailed error messages for each invalid row
- Review `preview`: First 5 valid questions

### Step 4: Fix Errors (if any)
- Review error messages
- Fix issues in your CSV file
- Run preview again

### Step 5: Import
```bash
curl -X POST http://localhost:3000/api/questions/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@your-questions.csv"
```

## Export Workflow

### Export All Your Questions
```bash
curl -X GET http://localhost:3000/api/questions/export \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o questions-backup-$(date +%Y%m%d).csv
```

### Export with Filters
```bash
# Export specific category
curl -X GET "http://localhost:3000/api/questions/export?categoryId=1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o category-1.csv

# Export specific difficulty
curl -X GET "http://localhost:3000/api/questions/export?difficulty=advanced" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o advanced-questions.csv

# Export specific question type
curl -X GET "http://localhost:3000/api/questions/export?questionType=multiple_choice" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o mcq-questions.csv

# Combine filters
curl -X GET "http://localhost:3000/api/questions/export?categoryId=1&difficulty=beginner" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o beginner-category-1.csv
```

## Permissions

### Regular Users
- Can import questions (questions will be created with status "draft")
- Can export only their own questions
- Cannot export other users' questions

### Moderators and Super Admins
- Can import questions
- Can export all questions in the system
- Can filter exports by any user using `createdBy` parameter

## Common Errors and Solutions

### Import Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "questionText is required" | Empty question text | Provide question text |
| "questionType is required" | Missing or empty type | Specify valid question type |
| "Invalid questionType" | Unsupported type | Use: multiple_choice, true_false, essay, fill_blank, or multiple_answer |
| "Invalid difficulty" | Unsupported difficulty | Use: beginner, intermediate, advanced, or mixed |
| "categoryId must be a number" | Non-numeric category ID | Use numeric category ID |
| "points must be a number" | Non-numeric points | Use numeric value for points |
| "Multiple choice questions must have at least 2 options" | Too few options | Add more options |
| "Multiple choice questions must have exactly 1 correct answer" | 0 or 2+ correct answers | Mark exactly 1 option as correct |
| "True/False questions must have exactly 2 options" | Wrong number of options | Provide exactly 2 options |
| "essay questions should not have options" | Options provided for essay | Remove all options |
| "Too many fields" | Extra columns in CSV | Ensure CSV has exactly 18 columns |

### Export Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Unauthorized" | Missing or invalid token | Provide valid authentication token |
| "Forbidden" | Trying to export other users' questions | Regular users can only export their own questions |

## Tips and Best Practices

### Creating CSVs

1. **Use the template**: Always start with the downloaded template to ensure correct format
2. **Quote fields with commas**: If your question text or tags contain commas, wrap them in double quotes
3. **Empty option fields**: For questions with fewer than 5 options, leave the unused option columns empty
4. **Boolean values**: Use lowercase "true" or "false" for boolean fields
5. **Tags**: Separate multiple tags with commas (e.g., "math,geometry,circles")
6. **Encoding**: Save CSV file with UTF-8 encoding to support special characters

### Importing

1. **Preview first**: Always use the preview endpoint before actual import
2. **Start small**: Test with a few questions before importing hundreds
3. **Create categories first**: Ensure all referenced categories exist in the database
4. **Check duplicates**: System doesn't check for duplicate questions, so review before importing
5. **Status**: All imported questions start with "draft" status

### Exporting

1. **Regular backups**: Export your questions regularly for backup
2. **Use filters**: Export specific subsets for sharing or migration
3. **Filename convention**: Use descriptive filenames with dates (e.g., `questions-2025-01-15.csv`)
4. **Version control**: Consider keeping exported CSVs in version control for history

## Integration Examples

### Node.js/TypeScript

```typescript
import FormData from 'form-data';
import fs from 'fs';
import axios from 'axios';

// Import questions
async function importQuestions(filePath: string, token: string) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  const response = await axios.post(
    'http://localhost:3000/api/questions/import',
    form,
    {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return response.data;
}

// Export questions
async function exportQuestions(token: string, filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await axios.get(
    `http://localhost:3000/api/questions/export?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return response.data;
}
```

### Python

```python
import requests

# Import questions
def import_questions(file_path, token):
    with open(file_path, 'rb') as f:
        files = {'file': f}
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.post(
            'http://localhost:3000/api/questions/import',
            files=files,
            headers=headers
        )
    return response.json()

# Export questions
def export_questions(token, **filters):
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(
        'http://localhost:3000/api/questions/export',
        params=filters,
        headers=headers
    )
    return response.text
```

## Troubleshooting

### CSV Parsing Issues

If you're getting "Too many fields" or "Too few fields" errors:

1. Open CSV in a text editor (not Excel)
2. Count the commas in the header row - should be 17 (for 18 columns)
3. Check for unquoted fields containing commas
4. Ensure all rows have the same number of fields

### Import Fails After Preview Success

If preview succeeds but import fails:

1. **Database constraints**: Category might have been deleted between preview and import
2. **Permissions**: User role might have changed
3. **Concurrent operations**: Another operation might have locked the tables

### Large File Imports

For importing large CSV files (1000+ questions):

1. Split into smaller batches (100-200 questions each)
2. Import in sequence with short delays
3. Monitor database performance
4. Consider using database transactions for all-or-nothing imports

## Limits and Constraints

- **Maximum CSV size**: 10MB recommended
- **Maximum rows**: 10,000 questions per import
- **Export limit**: 10,000 questions per export
- **Options per question**: Maximum 5
- **Tag length**: No specific limit, but keep reasonable
- **Question text length**: No specific limit, but very long questions may have display issues

## Future Enhancements

Planned features for future releases:

- Excel (.xlsx) file support
- JSON import/export format
- Bulk edit via CSV (export, modify, re-import)
- Image upload in CSV via URLs
- Import scheduling for automated tasks
- Import/export history and audit logs
- Template customization
- Batch operations with progress tracking

## Support

For issues or questions:

1. Check error messages carefully
2. Validate CSV format against template
3. Test with small sample first
4. Review this documentation
5. Contact system administrator if issues persist
