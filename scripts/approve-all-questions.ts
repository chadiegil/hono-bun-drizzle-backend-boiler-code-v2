/**
 * Approve all draft questions
 * This script updates all questions with status 'draft' to 'approved'
 */

import { db } from '../src/db/client'
import { questions } from '../src/db/schema'
import { eq } from 'drizzle-orm'

async function approveAllQuestions() {
  console.log('🔄 Approving all draft questions...\n')

  try {
    const result = await db
      .update(questions)
      .set({ status: 'approved' })
      .where(eq(questions.status, 'draft'))
      .returning({ id: questions.id })

    console.log(`✅ Approved ${result.length} questions\n`)
    console.log('Done!')
  } catch (error) {
    console.error('❌ Error approving questions:', error)
    throw error
  }
}

// Run the script
approveAllQuestions()
  .then(() => {
    console.log('\n✅ Script finished successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
