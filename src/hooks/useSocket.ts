"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { io as SocketIO } from "socket.io-client"

import {
  SocketMessage,
  TypingIndicator,
  PresenceStatus,
  DiscussionUpdate,
  AgentProgressUpdate
} from "@/lib/services/socket-service"

// Global socket instance to prevent multiple connections
let globalSocket: any = null
let globalSocketUserId: string | null = null

interface UseSocketOptions {
  autoConnect?: boolean
  reconnection?: boolean
  reconnectionAttempts?: number
  reconnectionDelay?: number
  userId?: string
  userName?: string
}

interface SocketState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
}

interface OnlineUsers {
  [roomId: string]: string[]
}

interface TypingUsers {
  [roomId: string]: TypingIndicator[]
}

/**
 * Socket.io client hook for real-time communication
 */
export function useSocket(options: UseSocketOptions = {}) {
  const { data: session } = useSession()

  const {
    autoConnect = true,
    reconnection = false, // Disable auto reconnect for stability
    reconnectionAttempts = 3,
    reconnectionDelay = 2000,
    userId: propUserId,
    userName: propUserName
  } = options

  const [state, setState] = useState<SocketState>({
    isConnected: false,
    isConnecting: false,
    error: null
  })

  const [onlineUsers, setOnlineUsers] = useState<OnlineUsers>({})
  const [typingUsers, setTypingUsers] = useState<TypingUsers>({})
  const [joinedRooms, setJoinedRooms] = useState<Set<string>>(new Set())

  const socketRef = useRef<any>(null)

  // Initialize socket connection
  const connect = useCallback(async () => {
    // Use provided props or fallback to session or hardcoded user ID for development
    const userId = propUserId || session?.user?.id || 'cmhk9lqk0000114aj3q0q8p1w'
    const userName = propUserName || session?.user?.name || 'pile'

    // Check if we already have a socket for this user
    if (globalSocket && globalSocketUserId === userId) {
      if (globalSocket.connected) {
          socketRef.current = globalSocket
        setState(prev => ({ ...prev, isConnected: true, isConnecting: false, error: null }))
        return
      } else {
            globalSocket.connect()
        socketRef.current = globalSocket
        setState(prev => ({ ...prev, isConnecting: true, error: null }))
        return
      }
    }

    // Clean up existing socket if user changed
    if (globalSocket && globalSocketUserId !== userId) {
        globalSocket.disconnect()
      globalSocket = null
      globalSocketUserId = null
    }

    // Prevent multiple socket instances for the same user
    if (socketRef.current && globalSocketUserId === userId) {
          return
    }

      setState(prev => ({ ...prev, isConnecting: true, error: null }))

    try {
      // Use statically imported SocketIO client

      const authData = {
        userId,
        userName
      }

      const socket = SocketIO(process.env.NEXT_PUBLIC_SOCKET_URL || `http://localhost:${process.env.PORT || 3000}`, {
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
        autoConnect: false,
        reconnection,
        reconnectionAttempts,
        reconnectionDelay,
        auth: authData // Send user data during handshake
      })

      // Setup event listeners
      socket.on('connect', () => {
        console.log('[Socket] Connected to server with socket ID:', socket.id)
        setState(prev => ({ ...prev, isConnected: true, isConnecting: false, error: null }))
      })

      socket.on('disconnect', (_reason: string) => {
            setState(prev => ({ ...prev, isConnected: false, isConnecting: false }))

        // Clear online users and typing indicators
        setOnlineUsers({})
        setTypingUsers({})
        setJoinedRooms(new Set())
      })

      socket.on('connect_error', (error: Error) => {
        console.error("[Socket] Connection error:", error)
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }))
      })

      // Real-time events
      socket.on('new_message', (message: SocketMessage) => {
        console.log('[Socket] Received new_message event:', message)
        // Handle new message - parent component can listen to this
        window.dispatchEvent(new CustomEvent('socket:new_message', { detail: message }))
      })

      socket.on('typing_indicator', (typing: TypingIndicator) => {
        setTypingUsers(prev => {
          const roomTyping = prev[typing.roomId] || []
          const filtered = roomTyping.filter(t => t.userId !== typing.userId)

          if (typing.isTyping) {
            return {
              ...prev,
              [typing.roomId]: [...filtered, typing]
            }
          } else {
            return {
              ...prev,
              [typing.roomId]: filtered
            }
          }
        })
      })

      socket.on('presence_update', (presence: PresenceStatus) => {
        setOnlineUsers(prev => {
          const roomUsers = prev[presence.roomId] || []

          if (presence.status === 'offline') {
            return {
              ...prev,
              [presence.roomId]: roomUsers.filter(id => id !== presence.userId)
            }
          } else if (!roomUsers.includes(presence.userId)) {
            return {
              ...prev,
              [presence.roomId]: [...roomUsers, presence.userId]
            }
          }

          return prev
        })
      })

      socket.on('user_joined', (presence: PresenceStatus) => {
        setOnlineUsers(prev => ({
          ...prev,
          [presence.roomId]: [...(prev[presence.roomId] || []), presence.userId]
        }))
      })

      socket.on('user_left', (presence: PresenceStatus) => {
        setOnlineUsers(prev => ({
          ...prev,
          [presence.roomId]: (prev[presence.roomId] || []).filter(id => id !== presence.userId)
        }))
      })

      socket.on('online_users', (users: Array<{ userId: string }>) => {
        // Handle initial online users list when joining room
        const roomId = Array.from(joinedRooms)[joinedRooms.size - 1] // Last joined room
        if (roomId) {
          setOnlineUsers(prev => ({
            ...prev,
            [roomId]: users.map(u => u.userId)
          }))
        }
      })

      socket.on('discussion_update', (update: DiscussionUpdate) => {
        // Handle discussion updates
        window.dispatchEvent(new CustomEvent('socket:discussion_update', { detail: update }))
      })

      socket.on('agent_progress', (progress: AgentProgressUpdate) => {
        // Handle agent progress updates
        window.dispatchEvent(new CustomEvent('socket:agent_progress', { detail: progress }))
      })

      socketRef.current = socket
      globalSocket = socket
      globalSocketUserId = userId

      // Connect if autoConnect is enabled
      if (autoConnect) {
        socket.connect()
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }, [reconnection, reconnectionAttempts, reconnectionDelay, session, propUserId, propUserName, autoConnect, joinedRooms])

  // Disconnect socket
  const disconnect = useCallback(() => {
    // Only disconnect if we're the ones who created it
    if (socketRef.current === globalSocket) {
          socketRef.current?.disconnect()
      socketRef.current = null
      globalSocket = null
      globalSocketUserId = null
    } else {
      socketRef.current = null
    }
  }, [])

  // Join room
  const joinRoom = useCallback((roomId: string) => {
    if (!socketRef.current?.connected) {
          return
    }

    socketRef.current.emit('join_room', { roomId })
    setJoinedRooms(prev => new Set([...prev, roomId]))
  }, [])

  // Leave room
  const leaveRoom = useCallback((roomId: string) => {
    if (!socketRef.current?.connected) {
      return
    }

    socketRef.current.emit('leave_room', { roomId })
    setJoinedRooms(prev => {
      const newRooms = new Set(prev)
      newRooms.delete(roomId)
      return newRooms
    })

    // Clear room-specific state
    setOnlineUsers(prev => {
      const newState = { ...prev }
      delete newState[roomId]
      return newState
    })
    setTypingUsers(prev => {
      const newState = { ...prev }
      delete newState[roomId]
      return newState
    })
  }, [])

  // Send typing indicator
  const sendTyping = useCallback((roomId: string, isTyping: boolean) => {
    if (!socketRef.current?.connected) {
      return
    }

    const typing: TypingIndicator = {
      userId: '', // Will be set by server from auth
      userName: '', // Will be set by server from auth
      roomId,
      isTyping
    }

    socketRef.current.emit('typing', typing)
  }, [])

  // Send presence update
  const updatePresence = useCallback((roomId: string, status: 'online' | 'away' | 'offline') => {
    if (!socketRef.current?.connected) {
      return
    }

    const presence: PresenceStatus = {
      userId: '', // Will be set by server from auth
      userName: '', // Will be set by server from auth
      roomId,
      status,
      lastSeen: new Date()
    }

    socketRef.current.emit('presence', presence)
  }, [])

  // Send message
  const sendMessage = useCallback((message: SocketMessage) => {
    if (!socketRef.current?.connected) {
          return
    }

    socketRef.current.emit('message', message)
  }, [])

  // Send discussion update
  const sendDiscussionUpdate = useCallback((update: DiscussionUpdate) => {
    if (!socketRef.current?.connected) {
            return
    }

    socketRef.current.emit('discussion_update', update)
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect().catch(console.error)
    }

    return () => {
      // Don't disconnect on unmount to keep global socket alive
      // Just clear the local reference
      socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect])

  
  return {
    // State
    socket: socketRef.current,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,

    // Room data
    joinedRooms: Array.from(joinedRooms),
    onlineUsers,
    typingUsers,

    // Actions
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendTyping,
    updatePresence,
    sendMessage,
    sendDiscussionUpdate
  }
}