import { ServerWebSocket } from 'bun'

interface WebSocketClient {
  ws: ServerWebSocket<{ userId?: number; roomId?: string }>
  userId?: number
  roomId?: string
}

class WebSocketManager {
  private clients: Map<string, WebSocketClient> = new Map()
  private rooms: Map<string, Set<string>> = new Map()

  /**
   * Add a new client connection
   */
  addClient(clientId: string, ws: ServerWebSocket<{ userId?: number; roomId?: string }>) {
    this.clients.set(clientId, { ws })
    console.log(`[WebSocket] Client ${clientId} connected. Total clients: ${this.clients.size}`)
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string) {
    const client = this.clients.get(clientId)
    if (client?.roomId) {
      this.leaveRoom(clientId, client.roomId)
    }
    this.clients.delete(clientId)
    console.log(
      `[WebSocket] Client ${clientId} disconnected. Total clients: ${this.clients.size}`
    )
  }

  /**
   * Associate a user ID with a client
   */
  setUserId(clientId: string, userId: number) {
    const client = this.clients.get(clientId)
    if (client) {
      client.userId = userId
      console.log(`[WebSocket] Client ${clientId} authenticated as user ${userId}`)
    }
  }

  /**
   * Join a room
   */
  joinRoom(clientId: string, roomId: string) {
    const client = this.clients.get(clientId)
    if (!client) return

    // Leave previous room if any
    if (client.roomId) {
      this.leaveRoom(clientId, client.roomId)
    }

    // Join new room
    client.roomId = roomId
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set())
    }
    this.rooms.get(roomId)!.add(clientId)

    console.log(
      `[WebSocket] Client ${clientId} joined room ${roomId}. Room size: ${this.rooms.get(roomId)!.size}`
    )
  }

  /**
   * Leave a room
   */
  leaveRoom(clientId: string, roomId: string) {
    const room = this.rooms.get(roomId)
    if (room) {
      room.delete(clientId)
      if (room.size === 0) {
        this.rooms.delete(roomId)
      }
      console.log(`[WebSocket] Client ${clientId} left room ${roomId}`)
    }

    const client = this.clients.get(clientId)
    if (client) {
      client.roomId = undefined
    }
  }

  /**
   * Send message to a specific client
   */
  sendToClient(clientId: string, message: any) {
    const client = this.clients.get(clientId)
    if (client) {
      client.ws.send(JSON.stringify(message))
    }
  }

  /**
   * Send message to all clients in a room
   */
  sendToRoom(roomId: string, message: any, excludeClientId?: string) {
    const room = this.rooms.get(roomId)
    if (!room) return

    const messageStr = JSON.stringify(message)
    room.forEach((clientId) => {
      if (clientId !== excludeClientId) {
        const client = this.clients.get(clientId)
        if (client) {
          client.ws.send(messageStr)
        }
      }
    })
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: any, excludeClientId?: string) {
    const messageStr = JSON.stringify(message)
    this.clients.forEach((client, clientId) => {
      if (clientId !== excludeClientId) {
        client.ws.send(messageStr)
      }
    })
  }

  /**
   * Send message to a specific user (by userId)
   */
  sendToUser(userId: number, message: any) {
    this.clients.forEach((client) => {
      if (client.userId === userId) {
        client.ws.send(JSON.stringify(message))
      }
    })
  }

  /**
   * Get all clients in a room
   */
  getRoom(roomId: string): Set<string> | undefined {
    return this.rooms.get(roomId)
  }

  /**
   * Get client info
   */
  getClient(clientId: string): WebSocketClient | undefined {
    return this.clients.get(clientId)
  }

  /**
   * Get total number of connected clients
   */
  getClientCount(): number {
    return this.clients.size
  }

  /**
   * Get total number of rooms
   */
  getRoomCount(): number {
    return this.rooms.size
  }
}

// Export singleton instance
export const wsManager = new WebSocketManager()
