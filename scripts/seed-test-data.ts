import { db } from '../src/db/client'
import { users, categories, exams, questions, questionOptions } from '../src/db/schema'

async function seedTestData() {
  console.log('Starting to seed test data...')

  try {
    // Create test users (30 users for pagination testing)
    console.log('Creating test users...')
    const testUsers = []

    for (let i = 1; i <= 30; i++) {
      const hashedPassword = await Bun.password.hash('Password123!', {
        algorithm: 'bcrypt',
        cost: 10,
      })
      const role = i <= 2 ? 'super_admin' : i <= 5 ? 'moderator' : 'user'
      const isActive = i % 5 !== 0 // Make every 5th user inactive

      const [user] = await db.insert(users).values({
        email: `testuser${i}@example.com`,
        password: hashedPassword,
        firstName: `Test${i}`,
        lastName: `User${i}`,
        role: role as any,
        isActive,
        emailVerified: true,
      }).returning()

      testUsers.push(user)
      console.log(`Created user: ${user.email} (${role})`)
    }

    // Get or create test categories
    console.log('Creating test categories...')
    const testCategories = []
    const categoryNames = ['LET', 'Nursing', 'Engineering', 'Medical', 'Law']

    for (const name of categoryNames) {
      const [category] = await db.insert(categories).values({
        name,
        slug: name.toLowerCase(),
        description: `Test category for ${name}`,
        isActive: true,
      }).returning()

      testCategories.push(category)
      console.log(`Created category: ${category.name}`)
    }

    // Create test exams (25 exams for pagination testing)
    console.log('Creating test exams...')
    const testExams = []
    const examTypes = ['practice', 'mock', 'timed', 'adaptive']
    const difficulties = ['beginner', 'intermediate', 'advanced']

    for (let i = 1; i <= 25; i++) {
      const category = testCategories[i % testCategories.length]
      const examType = examTypes[i % examTypes.length]
      const difficulty = difficulties[i % difficulties.length]
      const creator = testUsers[i % 5] // Use first 5 users as creators

      const [exam] = await db.insert(exams).values({
        title: `Test Exam ${i} - ${category.name}`,
        slug: `test-exam-${i}-${category.slug}`,
        description: `This is test exam number ${i} for ${category.name}`,
        categoryId: category.id,
        type: examType as any,
        difficulty: difficulty as any,
        isPublic: i % 3 !== 0, // Make every 3rd exam private
        passingScore: 70,
        duration: i % 2 === 0 ? 60 : undefined, // Half with time limit, half unlimited
        totalQuestions: 10,
        randomizeQuestions: i % 2 === 0,
        randomizeOptions: true,
        showAnswersAfter: 'after_submit',
        allowReview: true,
        createdBy: creator.id,
      }).returning()

      testExams.push(exam)
      console.log(`Created exam: ${exam.title}`)
    }

    // Create test questions (50 questions for pagination testing)
    console.log('Creating test questions...')
    const questionTypes = ['multiple_choice', 'true_false', 'essay', 'fill_blank']

    for (let i = 1; i <= 50; i++) {
      const category = testCategories[i % testCategories.length]
      const difficulty = difficulties[i % difficulties.length]
      const questionType = questionTypes[i % questionTypes.length]
      const creator = testUsers[i % 10]

      const [question] = await db.insert(questions).values({
        questionText: `Test Question ${i}: What is the answer to question number ${i}?`,
        questionType: questionType as any,
        categoryId: category.id,
        difficulty: difficulty as any,
        points: (i % 3) + 1, // 1-3 points
        explanation: `This is the explanation for test question ${i}`,
        imageUrl: i % 5 === 0 ? `https://via.placeholder.com/400x300?text=Question+${i}` : undefined,
        tags: [`tag${i % 5}`, `category-${category.slug}`, difficulty],
        isPublic: i % 4 !== 0, // Make every 4th question private
        status: i % 10 === 0 ? 'pending' : 'approved', // Most approved, some pending
        createdBy: creator.id,
      }).returning()

      // Create options for multiple choice and true/false questions
      if (questionType === 'multiple_choice') {
        const options = [
          { text: 'Option A - Correct Answer', isCorrect: true },
          { text: 'Option B - Wrong Answer', isCorrect: false },
          { text: 'Option C - Wrong Answer', isCorrect: false },
          { text: 'Option D - Wrong Answer', isCorrect: false },
        ]

        for (let j = 0; j < options.length; j++) {
          await db.insert(questionOptions).values({
            questionId: question.id,
            optionText: options[j].text,
            isCorrect: options[j].isCorrect,
            order: j + 1,
          })
        }
      } else if (questionType === 'true_false') {
        await db.insert(questionOptions).values([
          {
            questionId: question.id,
            optionText: 'True',
            isCorrect: i % 2 === 0,
            order: 1,
          },
          {
            questionId: question.id,
            optionText: 'False',
            isCorrect: i % 2 !== 0,
            order: 2,
          },
        ])
      }

      console.log(`Created question: ${question.questionText} (${questionType})`)
    }

    console.log('\n✅ Test data seeding completed successfully!')
    console.log('\nSummary:')
    console.log(`- Created ${testUsers.length} test users`)
    console.log(`- Created ${testCategories.length} test categories`)
    console.log(`- Created ${testExams.length} test exams`)
    console.log('- Created 50 test questions with options')
    console.log('\nYou can now test pagination with:')
    console.log('- /admin/users (30 users across 2 pages)')
    console.log('- /admin/exams (25 exams across 2 pages)')
    console.log('- /admin/questions (50 questions across 3 pages)')

  } catch (error) {
    console.error('Error seeding test data:', error)
    throw error
  }
}

// Run the seeding
seedTestData()
  .then(() => {
    console.log('\nSeeding script finished')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Seeding script failed:', error)
    process.exit(1)
  })
