// Simple WebSocket test client for Node.js
const WebSocket = require('ws')

console.log('🔌 Connecting to ws://localhost:3000/ws...\n')

const ws = new WebSocket('ws://localhost:3000/ws')

ws.on('open', () => {
  console.log('✅ Connected!\n')

  // Test 1: Send ping
  setTimeout(() => {
    console.log('📤 Sending ping...')
    ws.send(JSON.stringify({ type: 'ping' }))
  }, 500)

  // Test 2: Join room
  setTimeout(() => {
    console.log('📤 Joining room "lobby"...')
    ws.send(JSON.stringify({ type: 'join-room', roomId: 'lobby' }))
  }, 1000)

  // Test 3: Send message to room
  setTimeout(() => {
    console.log('📤 Sending message to room...')
    ws.send(
      JSON.stringify({
        type: 'message',
        roomId: 'lobby',
        message: 'Hello from Node.js test!'
      })
    )
  }, 1500)

  // Test 4: Send broadcast
  setTimeout(() => {
    console.log('📤 Broadcasting message...')
    ws.send(
      JSON.stringify({
        type: 'message',
        message: 'Broadcast to all clients!'
      })
    )
  }, 2000)

  // Close connection after tests
  setTimeout(() => {
    console.log('\n👋 Closing connection...')
    ws.close()
  }, 3000)
})

ws.on('message', (data) => {
  const message = JSON.parse(data.toString())
  console.log('📩 Received:', JSON.stringify(message, null, 2))
})

ws.on('close', () => {
  console.log('\n❌ Disconnected')
  process.exit(0)
})

ws.on('error', (error) => {
  console.error('❌ Error:', error.message)
  process.exit(1)
})
