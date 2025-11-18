/**
 * Approve all draft questions via API
 */

const API_URL = 'http://localhost:3000'

async function apiRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
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

async function approveAllQuestions() {
  console.log('🔄 Approving all draft questions via API...\n')

  try {
    // Login as admin
    console.log('1. Logging in as admin...')
    const loginResponse = await apiRequest('/api/auth/login', 'POST', {
      email: 'admin@test.com',
      password: 'Admin123!',
    })
    const adminToken = loginResponse.data.accessToken
    console.log('✅ Logged in as admin\n')

    // Fetch all questions
    console.log('2. Fetching all questions...')
    let allQuestions: any[] = []
    let currentPage = 1
    let hasMore = true

    while (hasMore) {
      const response = await apiRequest(
        `/api/questions?page=${currentPage}&limit=100`,
        'GET',
        undefined,
        adminToken
      )

      const questions = response.data || []
      allQuestions = allQuestions.concat(questions)

      if (response.pagination && currentPage < response.pagination.totalPages) {
        currentPage++
      } else {
        hasMore = false
      }
    }

    console.log(`✅ Fetched ${allQuestions.length} total questions\n`)

    // Filter draft questions
    const draftQuestions = allQuestions.filter(q => q.status === 'draft')
    console.log(`📝 Found ${draftQuestions.length} draft questions\n`)

    if (draftQuestions.length === 0) {
      console.log('✅ No draft questions to approve')
      return
    }

    // Approve each draft question
    console.log('3. Approving draft questions...')
    let approved = 0

    for (const question of draftQuestions) {
      try {
        await apiRequest(
          `/api/questions/${question.id}/approve`,
          'POST',
          undefined,
          adminToken
        )
        approved++
        console.log(`  ✅ Approved question ${question.id}: ${question.questionText.substring(0, 50)}...`)
      } catch (error: any) {
        console.log(`  ⚠️  Failed to approve question ${question.id}: ${error.message}`)
      }
    }

    console.log(`\n✅ Approved ${approved} out of ${draftQuestions.length} draft questions\n`)
    console.log('🎉 Done!')

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

// Run the script
console.log('Make sure the backend server is running at', API_URL)
console.log('Press Ctrl+C to cancel, or wait 2 seconds to continue...\n')

setTimeout(() => {
  approveAllQuestions()
    .then(() => {
      console.log('\n✅ Script finished successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error)
      process.exit(1)
    })
}, 2000)
