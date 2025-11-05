import { Server as NetServer } from "http"
import { NextApiRequest, NextApiResponse } from "next"
import { Server as ServerIO } from "socket.io"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export interface NextApiResponseWithSocket extends NextApiResponse {
  socket: any
}

export interface SocketMessage {
  id: string
  type: 'message' | 'typing' | 'presence' | 'discussion' | 'system'
  roomId: string
  userId: string
  data: any
  timestamp: Date
}

export interface TypingIndicator {
  userId: string
  userName: string
  roomId: string
  isTyping: boolean
}

export interface PresenceStatus {
  userId: string
  userName: string
  roomId: string
  status: 'online' | 'away' | 'offline'
  lastSeen: Date
}

export interface DiscussionUpdate {
  discussionId: string
  roomId: string
  status: 'STARTED' | 'PAUSED' | 'RESUMED' | 'CONCLUDED' | 'STOPPED'
  currentTurn?: number
  currentAgent?: string
  nextAgent?: string
  intensity: string
}

/**
 * Socket.io Service for Real-time Communication
 */
export class SocketService {
  private io: ServerIO
  private typingUsers = new Map<string, Set<string>>() // roomId -> Set of userIds
  private onlineUsers = new Map<string, Set<string>>() // roomId -> Set of userIds
  private userSockets = new Map<string, string>() // userId -> socketId

  constructor(httpServer: NetServer) {
    this.io = new ServerIO(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ["https://discux3.com"])
          : ["http://localhost:3000"],
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    })

    this.setupMiddleware()
    this.setupEventHandlers()
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware(): void {
    this.io.use(async (socket, next) => {
      try {
        // Authenticate user using NextAuth session
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
          return next(new Error('Unauthorized'))
        }

        socket.data.userId = session.user.id
        socket.data.userName = session.user.name || 'Anonymous'
        next()
      } catch (error) {
        next(new Error('Authentication failed'))
      }
    })
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      const userId = socket.data.userId
      const userName = socket.data.userName

      console.log(`[Socket] User connected: ${userName} (${userId})`)

      // Store user socket mapping
      this.userSockets.set(userId, socket.id)

      // Handle room joins
      socket.on('join_room', async (data: { roomId: string }) => {
        await this.handleJoinRoom(socket, data.roomId)
      })

      // Handle room leaves
      socket.on('leave_room', async (data: { roomId: string }) => {
        await this.handleLeaveRoom(socket, data.roomId)
      })

      // Handle typing indicators
      socket.on('typing', (data: TypingIndicator) => {
        this.handleTyping(socket, data)
      })

      // Handle presence updates
      socket.on('presence', (data: PresenceStatus) => {
        this.handlePresence(socket, data)
      })

      // Handle message broadcasting
      socket.on('message', (data: SocketMessage) => {
        this.handleMessage(socket, data)
      })

      // Handle discussion updates
      socket.on('discussion_update', (data: DiscussionUpdate) => {
        this.handleDiscussionUpdate(socket, data)
      })

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket)
      })
    })
  }

  /**
   * Handle room join
   */
  private async handleJoinRoom(socket: any, roomId: string): Promise<void> {
    try {
      const userId = socket.data.userId
      const userName = socket.data.userName

      // Join socket room
      socket.join(roomId)

      // Add to online users for this room
      if (!this.onlineUsers.has(roomId)) {
        this.onlineUsers.set(roomId, new Set())
      }
      this.onlineUsers.get(roomId)!.add(userId)

      // Update presence
      const presence: PresenceStatus = {
        userId,
        userName,
        roomId,
        status: 'online',
        lastSeen: new Date()
      }

      // Broadcast to room (excluding sender)
      socket.to(roomId).emit('user_joined', presence)
      socket.to(roomId).emit('presence_update', presence)

      // Send current online users list to new user
      const roomUsers = this.onlineUsers.get(roomId) || new Set()
      const onlineUsersList = Array.from(roomUsers).map(id => ({
        userId: id,
        status: 'online'
      }))

      socket.emit('online_users', onlineUsersList)

      console.log(`[Socket] User ${userName} joined room ${roomId}`)
    } catch (error) {
      console.error('[Socket] Error handling join_room:', error)
    }
  }

  /**
   * Handle room leave
   */
  private async handleLeaveRoom(socket: any, roomId: string): Promise<void> {
    try {
      const userId = socket.data.userId
      const userName = socket.data.userName

      // Leave socket room
      socket.leave(roomId)

      // Remove from online users
      const roomUsers = this.onlineUsers.get(roomId)
      if (roomUsers) {
        roomUsers.delete(userId)
        if (roomUsers.size === 0) {
          this.onlineUsers.delete(roomId)
        }
      }

      // Remove from typing users
      const roomTyping = this.typingUsers.get(roomId)
      if (roomTyping) {
        roomTyping.delete(userId)
        if (roomTyping.size === 0) {
          this.typingUsers.delete(roomId)
        }
      }

      // Broadcast to room
      const presence: PresenceStatus = {
        userId,
        userName,
        roomId,
        status: 'offline',
        lastSeen: new Date()
      }

      socket.to(roomId).emit('user_left', presence)
      socket.to(roomId).emit('presence_update', presence)

      console.log(`[Socket] User ${userName} left room ${roomId}`)
    } catch (error) {
      console.error('[Socket] Error handling leave_room:', error)
    }
  }

  /**
   * Handle typing indicators
   */
  private handleTyping(socket: any, data: TypingIndicator): void {
    try {
      const { roomId, userId, isTyping } = data
      const userName = socket.data.userName

      // Update typing state
      if (!this.typingUsers.has(roomId)) {
        this.typingUsers.set(roomId, new Set())
      }

      const roomTyping = this.typingUsers.get(roomId)!

      if (isTyping) {
        roomTyping.add(userId)
      } else {
        roomTyping.delete(userId)
      }

      // Broadcast typing indicator to room (excluding sender)
      socket.to(roomId).emit('typing_indicator', {
        userId,
        userName,
        roomId,
        isTyping
      })

      // Clean up if no one is typing
      if (roomTyping.size === 0) {
        this.typingUsers.delete(roomId)
      }
    } catch (error) {
      console.error('[Socket] Error handling typing:', error)
    }
  }

  /**
   * Handle presence updates
   */
  private handlePresence(socket: any, data: PresenceStatus): void {
    try {
      const { roomId, status } = data
      const userId = socket.data.userId
      const userName = socket.data.userName

      const presence: PresenceStatus = {
        userId,
        userName,
        roomId,
        status,
        lastSeen: new Date()
      }

      // Broadcast to room
      socket.to(roomId).emit('presence_update', presence)

      console.log(`[Socket] User ${userName} presence updated to ${status} in room ${roomId}`)
    } catch (error) {
      console.error('[Socket] Error handling presence:', error)
    }
  }

  /**
   * Handle message broadcasting
   */
  private handleMessage(socket: any, data: SocketMessage): void {
    try {
      const { roomId } = data

      // Broadcast message to room (excluding sender)
      socket.to(roomId).emit('new_message', data)

      console.log(`[Socket] Message broadcasted to room ${roomId}`)
    } catch (error) {
      console.error('[Socket] Error handling message:', error)
    }
  }

  /**
   * Handle discussion updates
   */
  private handleDiscussionUpdate(socket: any, data: DiscussionUpdate): void {
    try {
      const { roomId, status, discussionId, currentAgent, nextAgent } = data

      // Broadcast discussion update to room
      socket.to(roomId).emit('discussion_update', {
        discussionId,
        status,
        currentAgent,
        nextAgent,
        intensity: data.intensity,
        timestamp: new Date()
      })

      console.log(`[Socket] Discussion ${discussionId} update: ${status} in room ${roomId}`)
    } catch (error) {
      console.error('[Socket] Error handling discussion_update:', error)
    }
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(socket: any): void {
    try {
      const userId = socket.data.userId
      const userName = socket.data.userName

      // Remove from user sockets mapping
      this.userSockets.delete(userId)

      // Mark user as offline in all rooms
      this.onlineUsers.forEach((users, roomId) => {
        if (users.has(userId)) {
          users.delete(userId)

          const presence: PresenceStatus = {
            userId,
            userName,
            roomId,
            status: 'offline',
            lastSeen: new Date()
          }

          socket.to(roomId).emit('user_left', presence)
          socket.to(roomId).emit('presence_update', presence)
        }
      })

      // Clean up empty rooms
      this.onlineUsers.forEach((users, roomId) => {
        if (users.size === 0) {
          this.onlineUsers.delete(roomId)
        }
      })

      this.typingUsers.forEach((typers, roomId) => {
        if (typers.has(userId)) {
          typers.delete(userId)

          socket.to(roomId).emit('typing_indicator', {
            userId,
            userName: socket.data.userName,
            roomId,
            isTyping: false
          })
        }

        if (typers.size === 0) {
          this.typingUsers.delete(roomId)
        }
      })

      console.log(`[Socket] User disconnected: ${userName} (${userId})`)
    } catch (error) {
      console.error('[Socket] Error handling disconnect:', error)
    }
  }

  /**
   * Broadcast message to specific room
   */
  public broadcastMessage(roomId: string, message: SocketMessage): void {
    this.io.to(roomId).emit('new_message', message)
  }

  /**
   * Broadcast typing indicator
   */
  public broadcastTyping(roomId: string, typing: TypingIndicator): void {
    this.io.to(roomId).emit('typing_indicator', typing)
  }

  /**
   * Broadcast discussion update
   */
  public broadcastDiscussionUpdate(roomId: string, update: DiscussionUpdate): void {
    this.io.to(roomId).emit('discussion_update', update)
  }

  /**
   * Get online users in room
   */
  public getOnlineUsers(roomId: string): string[] {
    return Array.from(this.onlineUsers.get(roomId) || [])
  }

  /**
   * Get typing users in room
   */
  public getTypingUsers(roomId: string): string[] {
    return Array.from(this.typingUsers.get(roomId) || [])
  }

  /**
   * Check if user is online
   */
  public isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId)
  }

  /**
   * Get server instance
   */
  public getIO(): ServerIO {
    return this.io
  }
}

// Global socket service instance
let socketService: SocketService | null = null

/**
 * Initialize Socket.io service
 */
export function initializeSocket(httpServer: NetServer): SocketService {
  if (!socketService) {
    socketService = new SocketService(httpServer)
  }
  return socketService
}

/**
 * Get socket service instance
 */
export function getSocketService(): SocketService | null {
  return socketService
}