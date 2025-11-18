import { db } from './client'
import { users } from './schema'

async function queryUsers() {
  const allUsers = await db.select().from(users)
  console.log('All users in database:')
  console.log(JSON.stringify(allUsers, null, 2))
  process.exit(0)
}

queryUsers().catch((err) => {
  console.error('Query failed:', err)
  process.exit(1)
})
