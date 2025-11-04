# Frontend Services & Integration

## 🎯 Server Actions Usage

### Direct Database Access (No API Client Needed)
```typescript
// src/lib/actions/agents.ts
"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createAgentSchema } from "@/lib/validations"

export async function getAgents(userId: string) {
  return await prisma.agent.findMany({
    where: { created_by: userId },
    orderBy: { created_at: "desc" }
  })
}

export async function createAgent(data: CreateAgentInput) {
  const validatedData = createAgentSchema.parse(data)

  const agent = await prisma.agent.create({
    data: {
      ...validatedData,
      created_by: data.userId
    }
  })

  revalidatePath("/agents")
  return agent
}

export async function updateAgent(id: string, data: UpdateAgentInput) {
  const agent = await prisma.agent.update({
    where: { id },
    data
  })

  revalidatePath("/agents")
  revalidatePath(`/agents/${id}`)
  return agent
}

export async function deleteAgent(id: string) {
  await prisma.agent.delete({
    where: { id }
  })

  revalidatePath("/agents")
  redirect("/agents")
}
```

### Component Usage Examples
```typescript
// src/app/agents/page.tsx
import { getAgents } from "@/lib/actions/agents"
import { getServerSession } from "next-auth"
import AgentCard from "@/components/agents/AgentCard"

export default async function AgentsPage() {
  const session = await getServerSession()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const agents = await getAgents(session.user.id)

  return (
    <div>
      <h1>Your Agents</h1>
      <div className="grid">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  )
}
```

### Client Components with Server Actions
```typescript
// src/components/agents/CreateAgentForm.tsx
"use client"

import { useState } from "react"
import { createAgent } from "@/lib/actions/agents"
import { useSession } from "next-auth/react"

export function CreateAgentForm() {
  const { data: session } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    if (!session) return

    setIsSubmitting(true)
    try {
      await createAgent({
        name: formData.get("name") as string,
        prompt: formData.get("prompt") as string,
        emoji: formData.get("emoji") as string || "🤖",
        style: formData.get("style") as string,
        userId: session.user.id
      })
    } catch (error) {
      console.error("Failed to create agent:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form action={handleSubmit}>
      <input name="name" placeholder="Agent Name" required />
      <textarea name="prompt" placeholder="Agent Prompt" required />
      <select name="style">
        <option value="professional">Professional</option>
        <option value="friendly">Friendly</option>
        <option value="creative">Creative</option>
      </select>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Agent"}
      </button>
    </form>
  )
}
```

## 🔄 Socket.io Integration

### WebSocket Hook (Simplified)
```typescript
// src/hooks/useSocket.ts
"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import io, { Socket } from "socket.io-client"
import { SOCKET_EVENTS } from "@/lib/constants"

export function useSocket() {
  const { data: session } = useSession()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!session) return

    const newSocket = io("/", {
      auth: { session }
    })

    newSocket.on("connect", () => {
      console.log("Connected to WebSocket server")
      setIsConnected(true)
    })

    newSocket.on("disconnect", () => {
      console.log("Disconnected from WebSocket server")
      setIsConnected(false)
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [session])

  const joinRoom = (roomId: string) => {
    socket?.emit(SOCKET_EVENTS.JOIN_ROOM, roomId)
  }

  const leaveRoom = (roomId: string) => {
    socket?.emit(SOCKET_EVENTS.LEAVE_ROOM, roomId)
  }

  const sendMessage = (data: {
    room_id: string
    content: string
    mentions: string[]
  }) => {
    socket?.emit(SOCKET_EVENTS.SEND_MESSAGE, data)
  }

  return {
    socket,
    isConnected,
    joinRoom,
    leaveRoom,
    sendMessage
  }
}
```

### Chat Hook (Simplified)
```typescript
// src/hooks/use-chat.ts
"use client"

import { useEffect, useState, useCallback } from "react"
import { useSocket } from "@/hooks/useSocket"
import { getRoomMessages } from "@/lib/actions/messages"
import { Message } from "@/types"

export function useChat(roomId?: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [typingAgents, setTypingAgents] = useState<Set<string>>(new Set())

  const { socket, isConnected, joinRoom, leaveRoom, sendMessage } = useSocket()

  // Load initial messages and join room
  useEffect(() => {
    if (!roomId || !isConnected) return

    const loadMessages = async () => {
      setIsLoading(true)
      try {
        const roomMessages = await getRoomMessages(roomId, 50)
        setMessages(roomMessages.reverse())
        joinRoom(roomId)
      } catch (error) {
        console.error("Failed to load messages:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadMessages()

    return () => {
      leaveRoom(roomId)
    }
  }, [roomId, isConnected, joinRoom, leaveRoom])

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    socket.on("message_received", (message: Message) => {
      setMessages(prev => [...prev, message])
    })

    socket.on("agent_typing", (data: { agent_id: string; room_id: string }) => {
      if (data.room_id === roomId) {
        setTypingAgents(prev => new Set([...prev, data.agent_id]))
      }
    })

    socket.on("agent_response", (message: Message) => {
      if (message.room_id === roomId) {
        setMessages(prev => [...prev, message])
      }
    })

    socket.on("user_joined", (userId: string) => {
      console.log("User joined:", userId)
    })

    socket.on("user_left", (userId: string) => {
      console.log("User left:", userId)
    })

    return () => {
      socket.off("message_received")
      socket.off("agent_typing")
      socket.off("agent_response")
      socket.off("user_joined")
      socket.off("user_left")
    }
  }, [socket, roomId])

  // Clear typing indicators periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers(new Set())
      setTypingAgents(new Set())
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const handleSendMessage = useCallback(async (data: {
    content: string
    mentions: string[]
  }) => {
    if (!roomId) return

    try {
      sendMessage({
        room_id: roomId,
        ...data
      })
    } catch (error) {
      console.error("Failed to send message:", error)
    }
  }, [roomId, sendMessage])

  return {
    messages,
    isConnected,
    isLoading,
    typingUsers,
    typingAgents,
    sendMessage: handleSendMessage
  }
}
```

## 🧪 Testing Configuration

### Jest Setup (Simplified)
```json
// jest.config.json
{
  "preset": "ts-jest",
  "testEnvironment": "jsdom",
  "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"],
  "moduleNameMapping": {
    "^@/(.*)$": "<rootDir>/src/$1"
  }
}
```

### Test Setup
```javascript
// jest.setup.js
import '@testing-library/jest-dom';

// Mock Next.js server components
jest.mock('next/headers', () => ({
  headers: jest.fn(),
}));

// Mock Socket.io
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  })),
}));
```

## 📦 Build & Deployment

### Build Scripts
```json
// package.json scripts
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

### Vercel Configuration (Simplified)
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "env": {
    "DATABASE_URL": "@database_url",
    "NEXTAUTH_SECRET": "@nextauth_secret",
    "ZAI_API_KEY": "@zai_api_key"
  }
}
```

## 🔍 Performance Monitoring

### Error Boundary (Simplified)
```typescript
// src/components/error-boundary.tsx
import React from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export function ErrorBoundary({
  children,
  fallback
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
}
```

---

**Related Files:**
- [Development Environment](./development-environment.md) - Setup and prerequisites
- [Frontend Configuration](./configuration.md) - Configuration files and setup
- [API Design](../architecture/api-design.md) - Server Actions and WebSocket patterns