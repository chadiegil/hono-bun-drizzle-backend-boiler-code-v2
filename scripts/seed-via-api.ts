/**
 * Seed test data via API endpoints
 * This script creates dummy users, categories, exams, and questions for testing pagination
 */

const API_URL = 'http://localhost:3000'

// Helper function to make API requests
async function apiRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  token?: string
) {
  const headers: any = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const options: any = {
    method,
    headers,
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_URL}${endpoint}`, options)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(`API request failed: ${JSON.stringify(data)}`)
  }

  return data
}

async function seedTestData() {
  console.log('🌱 Starting to seed test data via API...\n')

  try {
    // First, create an admin user to use for creating other resources
    console.log('1. Creating admin user...')
    let adminToken: string

    try {
      const registerResponse = await apiRequest('/api/auth/register', 'POST', {
        email: 'admin@test.com',
        password: 'Admin123!',
        firstName: 'Admin',
        lastName: 'User',
      })
      adminToken = registerResponse.data.accessToken
      console.log('✅ Admin user created and logged in\n')
    } catch (error: any) {
      // If user already exists, try to login
      console.log('Admin user might already exist, trying to login...')
      const loginResponse = await apiRequest('/api/auth/login', 'POST', {
        email: 'admin@test.com',
        password: 'Admin123!',
      })
      adminToken = loginResponse.data.accessToken
      console.log('✅ Logged in as admin\n')
    }

    // Create test categories
    console.log('2. Creating test categories...')
    const categoryNames = ['LET', 'Nursing', 'Engineering', 'Medical', 'Law', 'IT Certification']
    const createdCategories: any[] = []

    for (const name of categoryNames) {
      try {
        const category = await apiRequest('/api/categories', 'POST', {
          name,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          description: `Test category for ${name}`,
          isActive: true,
        }, adminToken)
        createdCategories.push(category.data)
        console.log(`  ✅ Created category: ${name}`)
      } catch (error: any) {
        console.log(`  ⚠️  Category ${name} might already exist`)
      }
    }

    // Fetch all categories (including existing ones)
    const categoriesResponse = await apiRequest('/api/categories', 'GET', undefined, adminToken)
    const allCategories = categoriesResponse.data || []
    console.log(`✅ Total categories available: ${allCategories.length}\n`)

    // Create test users (register via API)
    console.log('3. Creating test users...')
    const testUsers: any[] = []

    for (let i = 1; i <= 30; i++) {
      try {
        const user = await apiRequest('/api/auth/register', 'POST', {
          email: `testuser${i}@example.com`,
          password: 'Test123!',
          firstName: `Test${i}`,
          lastName: `User${i}`,
        })
        testUsers.push(user.data)
        console.log(`  ✅ Created user: testuser${i}@example.com`)
      } catch (error: any) {
        console.log(`  ⚠️  User testuser${i}@example.com might already exist`)
      }
    }
    console.log(`✅ Test users created/verified\n`)

    // Create test exams
    console.log('4. Creating test exams...')
    const examTypes = ['practice', 'mock', 'timed', 'adaptive']
    const difficulties = ['beginner', 'intermediate', 'advanced']

    for (let i = 1; i <= 25; i++) {
      const category = allCategories[i % allCategories.length]
      const examType = examTypes[i % examTypes.length]
      const difficulty = difficulties[i % difficulties.length]

      try {
        await apiRequest('/api/exams', 'POST', {
          title: `Test Exam ${i} - ${category.name}`,
          slug: `test-exam-${i}-${category.slug}`,
          description: `This is test exam number ${i} for ${category.name}`,
          categoryId: category.id,
          type: examType,
          difficulty,
          isPublic: i % 3 !== 0,
          passingScore: 70,
          duration: i % 2 === 0 ? 60 : undefined,
          totalQuestions: 10,
          randomizeQuestions: i % 2 === 0,
          randomizeOptions: true,
          showAnswersAfter: 'after_submit',
          allowReview: true,
        }, adminToken)
        console.log(`  ✅ Created exam: Test Exam ${i}`)
      } catch (error: any) {
        console.log(`  ⚠️  Failed to create exam ${i}: ${error.message}`)
      }
    }
    console.log(`✅ Test exams created\n`)

    // Create test questions
    console.log('5. Creating test questions...')
    const questionTypes = ['multiple_choice', 'true_false']

    for (let i = 1; i <= 50; i++) {
      const category = allCategories[i % allCategories.length]
      const difficulty = difficulties[i % difficulties.length]
      const questionType = questionTypes[i % questionTypes.length]

      try {
        const questionData: any = {
          questionText: `Test Question ${i}: What is the answer to question number ${i}?`,
          questionType,
          categoryId: category.id,
          difficulty,
          points: (i % 3) + 1,
          explanation: `This is the explanation for test question ${i}`,
          tags: [`tag${i % 5}`, `category-${category.slug}`, difficulty],
          isPublic: i % 4 !== 0,
        }

        // Add options based on question type
        if (questionType === 'multiple_choice') {
          questionData.options = [
            { optionText: `Option A - Correct Answer for Q${i}`, isCorrect: true, order: 1 },
            { optionText: `Option B - Wrong Answer`, isCorrect: false, order: 2 },
            { optionText: `Option C - Wrong Answer`, isCorrect: false, order: 3 },
            { optionText: `Option D - Wrong Answer`, isCorrect: false, order: 4 },
          ]
        } else if (questionType === 'true_false') {
          questionData.options = [
            { optionText: 'True', isCorrect: i % 2 === 0, order: 1 },
            { optionText: 'False', isCorrect: i % 2 !== 0, order: 2 },
          ]
        }

        await apiRequest('/api/questions', 'POST', questionData, adminToken)
        console.log(`  ✅ Created question: Test Question ${i} (${questionType})`)
      } catch (error: any) {
        console.log(`  ⚠️  Failed to create question ${i}: ${error.message}`)
      }
    }
    console.log(`✅ Test questions created\n`)

    console.log('🎉 Test data seeding completed successfully!\n')
    console.log('Summary:')
    console.log('- Created/verified 30+ test users')
    console.log(`- Created ${createdCategories.length} new categories (${allCategories.length} total)`)
    console.log('- Created 25 test exams')
    console.log('- Created 50 test questions with options')
    console.log('\n📊 You can now test pagination with:')
    console.log('- http://localhost:3001/admin/users (30+ users, 20 per page)')
    console.log('- http://localhost:3001/admin/exams (25 exams, 20 per page)')
    console.log('- http://localhost:3001/admin/questions (50 questions, 20 per page)')
    console.log('\n🔑 Admin credentials:')
    console.log('  Email: admin@test.com')
    console.log('  Password: Admin123!')

  } catch (error) {
    console.error('❌ Error seeding test data:', error)
    throw error
  }
}

// Run the seeding
console.log('Please make sure the backend server is running at', API_URL)
console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n')

setTimeout(() => {
  seedTestData()
    .then(() => {
      console.log('\n✅ Seeding script finished successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Seeding script failed:', error)
      process.exit(1)
    })
}, 3000)
