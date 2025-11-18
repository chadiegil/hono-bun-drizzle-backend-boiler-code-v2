import { db } from './client'
import {
  users,
  categories,
  questions,
  questionOptions,
  userAnswers,
  examAttempts,
  examQuestions,
  exams
} from './schema'

async function seed() {
  console.log('Starting database seeding...')

  // Clear existing data (in correct order due to foreign keys)
  await db.delete(userAnswers)
  await db.delete(examAttempts)
  await db.delete(examQuestions)
  await db.delete(exams)
  await db.delete(questionOptions)
  await db.delete(questions)
  await db.delete(categories)
  await db.delete(users)

  // Hash password using Bun's built-in bcrypt
  const hashedPassword = await Bun.password.hash('test12345', {
    algorithm: 'bcrypt',
    cost: 10
  })

  // Create test user
  const [user] = await db
    .insert(users)
    .values({
      name: 'Ike',
      email: 'ike@gmail.com',
      password: hashedPassword,
      role: 'super_admin'
    })
    .returning()

  console.log('Created user:', user.email)

  // Create categories
  const [category1] = await db
    .insert(categories)
    .values({
      name: 'General Knowledge',
      slug: 'general-knowledge',
      description: 'Test your general knowledge with these questions'
    })
    .returning()

  const [category2] = await db
    .insert(categories)
    .values({
      name: 'Science',
      slug: 'science',
      description: 'Science and nature questions'
    })
    .returning()

  console.log('Created categories:', category1.name, category2.name)

  // Create questions with options
  const questionsData = [
    {
      questionText: 'What is the capital of France?',
      questionType: 'multiple_choice' as const,
      categoryId: category1.id,
      createdBy: user.id,
      difficulty: 'beginner' as const,
      points: 1,
      explanation: 'Paris is the capital and most populous city of France.',
      options: [
        { optionText: 'London', isCorrect: false, order: 1 },
        { optionText: 'Paris', isCorrect: true, order: 2 },
        { optionText: 'Berlin', isCorrect: false, order: 3 },
        { optionText: 'Madrid', isCorrect: false, order: 4 }
      ]
    },
    {
      questionText: 'Is the Earth round?',
      questionType: 'true_false' as const,
      categoryId: category2.id,
      createdBy: user.id,
      difficulty: 'beginner' as const,
      points: 1,
      explanation: 'The Earth is an oblate spheroid, slightly flattened at the poles.',
      options: [
        { optionText: 'True', isCorrect: true, order: 1 },
        { optionText: 'False', isCorrect: false, order: 2 }
      ]
    },
    {
      questionText: 'Which planet is known as the Red Planet?',
      questionType: 'multiple_choice' as const,
      categoryId: category2.id,
      createdBy: user.id,
      difficulty: 'beginner' as const,
      points: 1,
      explanation: 'Mars is called the Red Planet due to its reddish appearance caused by iron oxide on its surface.',
      options: [
        { optionText: 'Venus', isCorrect: false, order: 1 },
        { optionText: 'Mars', isCorrect: true, order: 2 },
        { optionText: 'Jupiter', isCorrect: false, order: 3 },
        { optionText: 'Saturn', isCorrect: false, order: 4 }
      ]
    },
    {
      questionText: 'What is 2 + 2?',
      questionType: 'multiple_choice' as const,
      categoryId: category1.id,
      createdBy: user.id,
      difficulty: 'beginner' as const,
      points: 1,
      explanation: 'Basic arithmetic: 2 + 2 = 4',
      options: [
        { optionText: '3', isCorrect: false, order: 1 },
        { optionText: '4', isCorrect: true, order: 2 },
        { optionText: '5', isCorrect: false, order: 3 },
        { optionText: '6', isCorrect: false, order: 4 }
      ]
    },
    {
      questionText: 'The Great Wall of China is visible from space.',
      questionType: 'true_false' as const,
      categoryId: category1.id,
      createdBy: user.id,
      difficulty: 'intermediate' as const,
      points: 1,
      explanation: 'This is a common misconception. The Great Wall is not visible from space with the naked eye.',
      options: [
        { optionText: 'True', isCorrect: false, order: 1 },
        { optionText: 'False', isCorrect: true, order: 2 }
      ]
    },
    {
      questionText: 'What is the largest ocean on Earth?',
      questionType: 'multiple_choice' as const,
      categoryId: category2.id,
      createdBy: user.id,
      difficulty: 'beginner' as const,
      points: 1,
      explanation: 'The Pacific Ocean is the largest and deepest ocean on Earth.',
      options: [
        { optionText: 'Atlantic Ocean', isCorrect: false, order: 1 },
        { optionText: 'Indian Ocean', isCorrect: false, order: 2 },
        { optionText: 'Pacific Ocean', isCorrect: true, order: 3 },
        { optionText: 'Arctic Ocean', isCorrect: false, order: 4 }
      ]
    },
    {
      questionText: 'Which programming language is known for its use in web development?',
      questionType: 'multiple_choice' as const,
      categoryId: category1.id,
      createdBy: user.id,
      difficulty: 'intermediate' as const,
      points: 1,
      explanation: 'JavaScript is the primary language for client-side web development.',
      options: [
        { optionText: 'Python', isCorrect: false, order: 1 },
        { optionText: 'JavaScript', isCorrect: true, order: 2 },
        { optionText: 'C++', isCorrect: false, order: 3 },
        { optionText: 'Java', isCorrect: false, order: 4 }
      ]
    },
    {
      questionText: 'Water boils at 100 degrees Celsius at sea level.',
      questionType: 'true_false' as const,
      categoryId: category2.id,
      createdBy: user.id,
      difficulty: 'beginner' as const,
      points: 1,
      explanation: 'Water boils at 100°C (212°F) at standard atmospheric pressure (sea level).',
      options: [
        { optionText: 'True', isCorrect: true, order: 1 },
        { optionText: 'False', isCorrect: false, order: 2 }
      ]
    },
    {
      questionText: 'How many continents are there on Earth?',
      questionType: 'multiple_choice' as const,
      categoryId: category1.id,
      createdBy: user.id,
      difficulty: 'beginner' as const,
      points: 1,
      explanation: 'There are 7 continents: Africa, Antarctica, Asia, Australia, Europe, North America, and South America.',
      options: [
        { optionText: '5', isCorrect: false, order: 1 },
        { optionText: '6', isCorrect: false, order: 2 },
        { optionText: '7', isCorrect: true, order: 3 },
        { optionText: '8', isCorrect: false, order: 4 }
      ]
    },
    {
      questionText: 'Which element has the chemical symbol "O"?',
      questionType: 'multiple_choice' as const,
      categoryId: category2.id,
      createdBy: user.id,
      difficulty: 'beginner' as const,
      points: 1,
      explanation: 'O is the chemical symbol for Oxygen, element number 8 on the periodic table.',
      options: [
        { optionText: 'Gold', isCorrect: false, order: 1 },
        { optionText: 'Oxygen', isCorrect: true, order: 2 },
        { optionText: 'Osmium', isCorrect: false, order: 3 },
        { optionText: 'Iron', isCorrect: false, order: 4 }
      ]
    }
  ]

  // Insert questions and their options
  const createdQuestions = []
  for (const questionData of questionsData) {
    const { options, ...questionFields } = questionData

    const [question] = await db
      .insert(questions)
      .values(questionFields)
      .returning()

    // Insert options for this question
    const optionsToInsert = options.map((opt) => ({
      questionId: question.id,
      optionText: opt.optionText,
      isCorrect: opt.isCorrect,
      order: opt.order
    }))

    await db.insert(questionOptions).values(optionsToInsert)
    createdQuestions.push(question)

    console.log(`Created question: ${question.questionText}`)
  }

  // Create exam categories (for formal certification exams)
  const [nursingCategory] = await db
    .insert(categories)
    .values({
      name: 'Nursing Board Exam',
      description: 'Prepare for the Philippine Nursing Licensure Examination',
      slug: 'nursing-board-exam'
    })
    .returning()

  const [letCategory] = await db
    .insert(categories)
    .values({
      name: 'Licensure Exam for Teachers',
      description: 'Practice for the LET Professional and Elementary levels',
      slug: 'let-exam'
    })
    .returning()

  const [tesdaCategory] = await db
    .insert(categories)
    .values({
      name: 'TESDA Assessments',
      description: 'Technical Education and Skills Development Authority certification exams',
      slug: 'tesda-assessments'
    })
    .returning()

  console.log('Created exam categories: Nursing, LET, TESDA')

  // Create exams for question categories
  const exam1 = await db
    .insert(exams)
    .values({
      title: 'General Knowledge Exam',
      slug: 'general-knowledge-exam',
      description: 'Test your general knowledge',
      type: 'practice' as const,
      difficulty: 'beginner' as const,
      categoryId: category1.id,
      createdBy: user.id,
      duration: 30,
      passingScore: 60,
      totalPoints: 10,
      attemptsAllowed: null,
      isPublished: true,
      showAnswersAfter: 'after_submit' as const,
      randomizeQuestions: false
    })
    .returning()

  const exam2 = await db
    .insert(exams)
    .values({
      title: 'Science Exam',
      slug: 'science-exam',
      description: 'Test your science knowledge',
      type: 'practice' as const,
      difficulty: 'beginner' as const,
      categoryId: category2.id,
      createdBy: user.id,
      duration: 30,
      passingScore: 60,
      totalPoints: 10,
      attemptsAllowed: null,
      isPublished: true,
      showAnswersAfter: 'after_submit' as const,
      randomizeQuestions: false
    })
    .returning()

  // Create Nursing Board Exam
  const nursingExam = await db
    .insert(exams)
    .values({
      title: 'Nursing Board Exam - Practice Test',
      slug: 'nursing-board-practice',
      description: 'Comprehensive practice test for the Philippine Nursing Licensure Examination',
      type: 'mock' as const,
      difficulty: 'intermediate' as const,
      categoryId: nursingCategory.id,
      createdBy: user.id,
      duration: 120,
      passingScore: 75,
      totalPoints: 100,
      attemptsAllowed: null,
      isPublished: true,
      showAnswersAfter: 'after_submit' as const,
      randomizeQuestions: true
    })
    .returning()

  // Create LET Exam
  const letExam = await db
    .insert(exams)
    .values({
      title: 'LET Professional Level - Practice Test',
      slug: 'let-professional-practice',
      description: 'Practice exam for Licensure Examination for Teachers (Professional Level)',
      type: 'mock' as const,
      difficulty: 'intermediate' as const,
      categoryId: letCategory.id,
      createdBy: user.id,
      duration: 150,
      passingScore: 75,
      totalPoints: 150,
      attemptsAllowed: null,
      isPublished: true,
      showAnswersAfter: 'after_submit' as const,
      randomizeQuestions: true
    })
    .returning()

  // Create TESDA Exam
  const tesdaExam = await db
    .insert(exams)
    .values({
      title: 'TESDA NC II Assessment - Practice',
      slug: 'tesda-nc2-practice',
      description: 'Practice assessment for TESDA National Certification Level II',
      type: 'mock' as const,
      difficulty: 'beginner' as const,
      categoryId: tesdaCategory.id,
      createdBy: user.id,
      duration: 90,
      passingScore: 70,
      totalPoints: 100,
      attemptsAllowed: null,
      isPublished: true,
      showAnswersAfter: 'after_submit' as const,
      randomizeQuestions: false
    })
    .returning()

  console.log(`Created exams: General Knowledge, Science, Nursing, LET, TESDA`)

  // Add questions to exams
  const category1Questions = createdQuestions.filter(q => q.categoryId === category1.id)
  const category2Questions = createdQuestions.filter(q => q.categoryId === category2.id)

  let order = 1
  for (const question of category1Questions) {
    await db.insert(examQuestions).values({
      examId: exam1[0].id,
      questionId: question.id,
      order: order++,
      points: question.points,
      isRequired: true
    })
  }

  order = 1
  for (const question of category2Questions) {
    await db.insert(examQuestions).values({
      examId: exam2[0].id,
      questionId: question.id,
      order: order++,
      points: question.points,
      isRequired: true
    })
  }

  // Add all questions to certification exams (for demo purposes)
  // In production, you'd have specific questions for each exam
  order = 1
  for (const question of createdQuestions) {
    await db.insert(examQuestions).values({
      examId: nursingExam[0].id,
      questionId: question.id,
      order: order++,
      points: question.points,
      isRequired: true
    })
  }

  order = 1
  for (const question of createdQuestions) {
    await db.insert(examQuestions).values({
      examId: letExam[0].id,
      questionId: question.id,
      order: order++,
      points: question.points,
      isRequired: true
    })
  }

  order = 1
  for (const question of createdQuestions) {
    await db.insert(examQuestions).values({
      examId: tesdaExam[0].id,
      questionId: question.id,
      order: order++,
      points: question.points,
      isRequired: true
    })
  }

  console.log('Added questions to all exams')
  console.log('Seeding completed successfully!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seeding failed:', err)
  process.exit(1)
})
