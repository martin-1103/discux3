import { Server as NetServer } from "http"
import { NextApiResponse } from "next"
import { Server as ServerIO } from "socket.io"
import { ServiceRegistry } from "./service-registry"

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

export interface AgentProgressUpdate {
  type: 'agent_starting' | 'agent_responding' | 'agent_complete' | 'agent_error'
  discussionId: string
  roomId: string
  agentId: string
  agentName: string
  agentEmoji: string
  turnOrder: number
  totalTurns: number
  processingTime?: number
  errorMessage?: string
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

    console.log('[Socket] Socket.io server created with config:', {
      transports: ['websocket', 'polling'],
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ["https://discux3.com"])
          : ["http://localhost:3000"]
      }
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
        // Extract user data from handshake auth sent by client
        const { userId, userName } = socket.handshake.auth

  
        if (userId && userId !== 'anonymous') {
          socket.data.userId = userId
          socket.data.userName = userName || 'Unknown User'
          } else {
          // Fallback for development - allow anonymous but with consistent ID
          socket.data.userId = 'dev-user'
          socket.data.userName = 'Development User'
          }

        next()
      } catch (error) {
        console.error('[Socket] Authentication error:', error)
        // Fallback to development user
        socket.data.userId = 'dev-user'
        socket.data.userName = 'Development User'
          next()
      }
    })
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log('[Socket] New connection attempt:', socket.id)
      console.log('[Socket] Transport:', socket.conn.transport.name)

      const userId = socket.data.userId
      const userName = socket.data.userName

      console.log('[Socket] User authenticated:', userId, userName)

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

      // Handle agent progress updates
      socket.on('agent_progress', (data: AgentProgressUpdate) => {
        this.handleAgentProgress(socket, data)
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

          } catch (error) {
      console.error('[Socket] Error handling discussion_update:', error)
    }
  }

  /**
   * Handle agent progress updates
   */
  private handleAgentProgress(socket: any, data: AgentProgressUpdate): void {
    try {
      const { roomId } = data

      // Broadcast agent progress to room (excluding sender)
      socket.to(roomId).emit('agent_progress', {
        ...data,
        timestamp: new Date()
      })

    } catch (error) {
      console.error('[Socket] Error handling agent_progress:', error)
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

        } catch (error) {
      console.error('[Socket] Error handling disconnect:', error)
    }
  }

  /**
   * Broadcast message to specific room
   */
  public broadcastMessage(roomId: string, message: SocketMessage): void {
    console.log(`[SocketService] Broadcasting message to room ${roomId}:`, {
      messageId: message.id,
      type: message.type,
      senderName: message.data?.sender?.name,
      contentPreview: message.data?.content?.substring(0, 50)
    })
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
   * Broadcast agent progress update
   */
  public broadcastAgentProgress(roomId: string, update: AgentProgressUpdate): void {
    this.io.to(roomId).emit('agent_progress', {
      ...update,
      timestamp: new Date()
    })
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

// Use global object to store socket service instance across module boundaries
declare global {
  var __socketService: SocketService | null | undefined
}

// Initialize global socket service if not already set
if (typeof globalThis !== 'undefined') {
  globalThis.__socketService = globalThis.__socketService || null
}

/**
 * Initialize Socket.io service
 */
export function initializeSocket(httpServer: NetServer): SocketService {
  console.log('[SocketService] initializeSocket() called, globalThis.__socketService:', globalThis.__socketService ? 'exists' : 'null')
  if (!globalThis.__socketService) {
    console.log('[SocketService] Creating new SocketService instance')
    globalThis.__socketService = new SocketService(httpServer)
    console.log('[SocketService] SocketService instance created')

    // Register to ServiceRegistry for cross-module sharing
    ServiceRegistry.setSocketService(globalThis.__socketService)
    console.log('[SocketService] SocketService registered to ServiceRegistry')
  }
  console.log('[SocketService] Returning socketService:', globalThis.__socketService ? 'instance' : 'null')
  return globalThis.__socketService
}

/**
 * Get socket service instance
 */
export function getSocketService(): SocketService | null {
  console.log('[SocketService] getSocketService() called, globalThis.__socketService:', globalThis.__socketService ? 'exists' : 'null')

  // Try ServiceRegistry first, fallback to globalThis
  const service = ServiceRegistry.getSocketService() || globalThis.__socketService
  console.log('[SocketService] getSocketService() returning:', service ? 'instance' : 'null')

  return service || null
}