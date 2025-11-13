# WebSocket Real-Time Communication Guide

## Overview

The application includes full WebSocket support for real-time bidirectional communication. WebSocket is running on the same port as the HTTP server.

**WebSocket URL:** `ws://localhost:3000/ws`

---

## Features

- ✅ Real-time messaging
- ✅ Room-based communication
- ✅ JWT authentication
- ✅ Broadcast to all clients
- ✅ Private user messaging
- ✅ Connection management
- ✅ Automatic client tracking

---

## Message Types

### Client → Server

#### 1. Authenticate
```json
{
  "type": "authenticate",
  "token": "your-jwt-token-here"
}
```

#### 2. Join Room
```json
{
  "type": "join-room",
  "roomId": "room-123"
}
```

#### 3. Leave Room
```json
{
  "type": "leave-room",
  "roomId": "room-123"
}
```

#### 4. Send Message (Broadcast)
```json
{
  "type": "message",
  "message": "Hello everyone!"
}
```

#### 5. Send Message to Room
```json
{
  "type": "message",
  "roomId": "room-123",
  "message": "Hello room!"
}
```

#### 6. Ping
```json
{
  "type": "ping"
}
```

---

### Server → Client

#### 1. Connected
```json
{
  "type": "connected",
  "clientId": "uuid-here",
  "message": "Connected to WebSocket server"
}
```

#### 2. Authenticated
```json
{
  "type": "authenticated",
  "userId": 1,
  "email": "user@example.com"
}
```

#### 3. Authentication Error
```json
{
  "type": "auth-error",
  "message": "Invalid token"
}
```

#### 4. Room Joined
```json
{
  "type": "room-joined",
  "roomId": "room-123"
}
```

#### 5. User Joined (sent to others in room)
```json
{
  "type": "user-joined",
  "clientId": "uuid-here"
}
```

#### 6. Room Left
```json
{
  "type": "room-left",
  "roomId": "room-123"
}
```

#### 7. User Left (sent to others in room)
```json
{
  "type": "user-left",
  "clientId": "uuid-here"
}
```

#### 8. Message Received
```json
{
  "type": "message",
  "from": "client-uuid",
  "message": "Hello!",
  "timestamp": "2025-11-13T12:00:00.000Z"
}
```

#### 9. Pong
```json
{
  "type": "pong"
}
```

#### 10. Error
```json
{
  "type": "error",
  "message": "Error description"
}
```

---

## JavaScript/Browser Client Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>WebSocket Test</title>
</head>
<body>
  <h1>WebSocket Test Client</h1>

  <div>
    <h3>Connection</h3>
    <button id="connect">Connect</button>
    <button id="disconnect">Disconnect</button>
    <p>Status: <span id="status">Disconnected</span></p>
    <p>Client ID: <span id="clientId">-</span></p>
  </div>

  <div>
    <h3>Authentication</h3>
    <input type="text" id="token" placeholder="JWT Token" style="width: 400px">
    <button id="auth">Authenticate</button>
  </div>

  <div>
    <h3>Rooms</h3>
    <input type="text" id="roomId" placeholder="Room ID">
    <button id="joinRoom">Join Room</button>
    <button id="leaveRoom">Leave Room</button>
  </div>

  <div>
    <h3>Send Message</h3>
    <input type="text" id="message" placeholder="Message">
    <input type="text" id="messageRoomId" placeholder="Room ID (optional)">
    <button id="send">Send</button>
  </div>

  <div>
    <h3>Messages</h3>
    <div id="messages" style="border: 1px solid #ccc; padding: 10px; height: 300px; overflow-y: auto;"></div>
  </div>

  <script>
    let ws = null
    let clientId = null

    const statusEl = document.getElementById('status')
    const clientIdEl = document.getElementById('clientId')
    const messagesEl = document.getElementById('messages')

    function addMessage(msg) {
      const div = document.createElement('div')
      div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`
      messagesEl.appendChild(div)
      messagesEl.scrollTop = messagesEl.scrollHeight
    }

    document.getElementById('connect').addEventListener('click', () => {
      ws = new WebSocket('ws://localhost:3000/ws')

      ws.onopen = () => {
        statusEl.textContent = 'Connected'
        addMessage('Connected to server')
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        addMessage(`Received: ${JSON.stringify(data, null, 2)}`)

        if (data.type === 'connected') {
          clientId = data.clientId
          clientIdEl.textContent = clientId
        }
      }

      ws.onclose = () => {
        statusEl.textContent = 'Disconnected'
        addMessage('Disconnected from server')
      }

      ws.onerror = (error) => {
        addMessage(`Error: ${error}`)
      }
    })

    document.getElementById('disconnect').addEventListener('click', () => {
      if (ws) {
        ws.close()
      }
    })

    document.getElementById('auth').addEventListener('click', () => {
      const token = document.getElementById('token').value
      if (ws && token) {
        ws.send(JSON.stringify({
          type: 'authenticate',
          token: token
        }))
      }
    })

    document.getElementById('joinRoom').addEventListener('click', () => {
      const roomId = document.getElementById('roomId').value
      if (ws && roomId) {
        ws.send(JSON.stringify({
          type: 'join-room',
          roomId: roomId
        }))
      }
    })

    document.getElementById('leaveRoom').addEventListener('click', () => {
      const roomId = document.getElementById('roomId').value
      if (ws && roomId) {
        ws.send(JSON.stringify({
          type: 'leave-room',
          roomId: roomId
        }))
      }
    })

    document.getElementById('send').addEventListener('click', () => {
      const message = document.getElementById('message').value
      const roomId = document.getElementById('messageRoomId').value

      if (ws && message) {
        const payload = {
          type: 'message',
          message: message
        }

        if (roomId) {
          payload.roomId = roomId
        }

        ws.send(JSON.stringify(payload))
        document.getElementById('message').value = ''
      }
    })
  </script>
</body>
</html>
```

---

## Node.js Client Example

```javascript
const WebSocket = require('ws')

// Connect to WebSocket server
const ws = new WebSocket('ws://localhost:3000/ws')

ws.on('open', () => {
  console.log('Connected to WebSocket server')

  // Authenticate with JWT token
  ws.send(JSON.stringify({
    type: 'authenticate',
    token: 'your-jwt-token-here'
  }))
})

ws.on('message', (data) => {
  const message = JSON.parse(data.toString())
  console.log('Received:', message)

  // Handle different message types
  switch (message.type) {
    case 'connected':
      console.log('Client ID:', message.clientId)
      break

    case 'authenticated':
      console.log('Authenticated as user:', message.userId)

      // Join a room after authentication
      ws.send(JSON.stringify({
        type: 'join-room',
        roomId: 'lobby'
      }))
      break

    case 'room-joined':
      console.log('Joined room:', message.roomId)

      // Send a message to the room
      ws.send(JSON.stringify({
        type: 'message',
        roomId: 'lobby',
        message: 'Hello from Node.js!'
      }))
      break

    case 'message':
      console.log(`Message from ${message.from}: ${message.message}`)
      break
  }
})

ws.on('close', () => {
  console.log('Disconnected from server')
})

ws.on('error', (error) => {
  console.error('WebSocket error:', error)
})
```

---

## React Hook Example

```typescript
import { useEffect, useRef, useState } from 'react'

interface WebSocketMessage {
  type: string
  [key: string]: any
}

export function useWebSocket(url: string = 'ws://localhost:3000/ws') {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<WebSocketMessage[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setMessages((prev) => [...prev, data])
    }

    ws.onclose = () => {
      setIsConnected(false)
      console.log('WebSocket disconnected')
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    // Cleanup on unmount
    return () => {
      ws.close()
    }
  }, [url])

  const send = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }

  const authenticate = (token: string) => {
    send({ type: 'authenticate', token })
  }

  const joinRoom = (roomId: string) => {
    send({ type: 'join-room', roomId })
  }

  const leaveRoom = (roomId: string) => {
    send({ type: 'leave-room', roomId })
  }

  const sendMessage = (message: string, roomId?: string) => {
    send({ type: 'message', message, roomId })
  }

  return {
    isConnected,
    messages,
    send,
    authenticate,
    joinRoom,
    leaveRoom,
    sendMessage
  }
}

// Usage in component
function ChatComponent() {
  const { isConnected, messages, authenticate, joinRoom, sendMessage } =
    useWebSocket() // Uses default: 'ws://localhost:3000/ws'

  useEffect(() => {
    if (isConnected) {
      // Authenticate when connected
      const token = localStorage.getItem('token')
      if (token) {
        authenticate(token)
      }
    }
  }, [isConnected])

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={() => joinRoom('lobby')}>Join Lobby</button>
      <button onClick={() => sendMessage('Hello!', 'lobby')}>Send Message</button>

      <div>
        {messages.map((msg, i) => (
          <div key={i}>{JSON.stringify(msg)}</div>
        ))}
      </div>
    </div>
  )
}
```

---

## Testing with wscat

```bash
# Install wscat globally
npm install -g wscat

# Connect to WebSocket server
wscat -c ws://localhost:3000/ws

# Send messages (paste these one at a time)
{"type":"ping"}
{"type":"authenticate","token":"your-jwt-token"}
{"type":"join-room","roomId":"test"}
{"type":"message","roomId":"test","message":"Hello room!"}
{"type":"message","message":"Broadcast to all!"}
{"type":"leave-room","roomId":"test"}
```

---

## Server-Side WebSocket Manager API

You can use the WebSocket manager in your server code:

```typescript
import { wsManager } from './websocket/websocket-manager'

// Send message to specific client
wsManager.sendToClient('client-id', { type: 'notification', text: 'Hello!' })

// Send message to specific user (by userId)
wsManager.sendToUser(userId, { type: 'notification', text: 'Hello user!' })

// Send message to all clients in a room
wsManager.sendToRoom('room-123', { type: 'update', data: {...} })

// Broadcast to all connected clients
wsManager.broadcast({ type: 'announcement', text: 'Server maintenance in 5 min' })

// Get client info
const client = wsManager.getClient('client-id')

// Get room members
const members = wsManager.getRoom('room-123')

// Get statistics
const totalClients = wsManager.getClientCount()
const totalRooms = wsManager.getRoomCount()
```

---

## Use Cases

### 1. Real-Time Chat
- Users join chat rooms
- Send/receive messages instantly
- See who's online

### 2. Live Notifications
- Push notifications to specific users
- Real-time alerts

### 3. Collaborative Editing
- Multiple users editing the same document
- See changes in real-time

### 4. Live Dashboard
- Real-time data updates
- Live statistics

### 5. Gaming
- Multiplayer game state synchronization
- Real-time player actions

### 6. Live Tracking
- Track user locations
- Delivery tracking

---

## Security

- ✅ JWT authentication required for protected actions
- ✅ Token verification before associating userId
- ✅ Connection tracking per client
- ✅ Automatic cleanup on disconnect

---

## Best Practices

1. **Always authenticate** after connecting
2. **Handle reconnection** logic in your client
3. **Validate messages** before processing
4. **Use rooms** for targeted communication
5. **Implement heartbeat** (ping/pong) to detect dead connections
6. **Clean up** resources when leaving rooms
7. **Error handling** for all message types

---

## Troubleshooting

### Connection refused
- Make sure the server is running: `docker compose ps`
- Check the server logs: `docker compose logs backend`

### Authentication fails
- Verify your JWT token is valid
- Check token expiration
- Ensure token format is: `Bearer <token>`

### Messages not received
- Check WebSocket connection status
- Verify message format (must be valid JSON)
- Check browser console for errors

### Room messages not working
- Ensure you've joined the room first
- Verify roomId matches exactly
- Check if other clients are in the same room
