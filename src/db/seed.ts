import { db } from './client'
import { users } from './schema'

async function seed() {
  console.log('Starting database seeding...')

  await db.delete(users)

  await db.insert(users).values([{ name: 'Ike', email: 'ike@gmail.com', password: 'test12345' }])
  console.log('Seeding completed!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seeding failed:', err)
  process.exit(1)
})
