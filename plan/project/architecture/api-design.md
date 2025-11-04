# WebSocket & Server Actions Design

## 🔌 WebSocket Events (Socket.io)

### Client to Server Events
```typescript
interface ClientToServerEvents {
  join_room: (room_id: string) => void
  leave_room: (room_id: string) => void
  send_message: (data: {
    room_id: string
    content: string
    mentions: string[]
  }) => void
  typing_start: (room_id: string) => void
  typing_stop: (room_id: string) => void
}
```

### Server to Client Events
```typescript
interface ServerToClientEvents {
  message_received: (message: Message) => void
  agent_typing: (data: { agent_id: string; room_id: string }) => void
  agent_response: (message: Message) => void
  user_joined: (user_id: string) => void
  user_left: (user_id: string) => void
  room_updated: (room: Room) => void
}
```

### WebSocket Implementation (Next.js Integration)
```typescript
// src/app/api/socket/route.ts
import { Server } from "socket.io"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const io = new Server({
  cors: { origin: process.env.NEXTAUTH_URL },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
  compression: true
});

// NextAuth.js authentication middleware
io.use(async (socket, next) => {
  try {
    // Extract session from request using NextAuth.js
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return next(new Error("Unauthorized: No session found"));
    }

    // Attach user info to socket
    socket.userId = session.user.id;
    socket.userEmail = session.user.email;
    socket.userName = session.user.name;

    next();
  } catch (error) {
    next(new Error("Authentication failed"));
  }
});

// Room-based connection management
io.on('connection', (socket) => {
  socket.on('join_room', async (roomId) => {
    // Validate user access to room
    const hasAccess = await roomService.userHasAccess(socket.userId, roomId);
    if (!hasAccess) {
      socket.emit('error', { message: 'Access denied' });
      return;
    }

    socket.join(roomId);
    socket.currentRoom = roomId;

    // Notify other users
    socket.to(roomId).emit('user_joined', {
      userId: socket.userId,
      userName: socket.userName,
      timestamp: new Date()
    });
  });

  socket.on('send_message', async (data) => {
    try {
      // Process message with AI if mentions exist
      const message = await messageService.processMessage({
        ...data,
        sender_id: socket.userId,
        type: 'user'
      });

      // Broadcast to room
      io.to(data.room_id).emit('message_received', message);

      // Trigger AI responses for mentioned agents
      if (data.mentions && data.mentions.length > 0) {
        await aiService.handleAgentMentions(message, data.mentions);
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
});
```

## 🎯 Server Actions (Direct Database Access)

### Agent Server Actions
```typescript
// src/lib/actions/agents.ts
"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function getAgents(userId: string) {
  return await prisma.agent.findMany({
    where: { created_by: userId },
    orderBy: { created_at: "desc" }
  })
}

export async function createAgent(data: CreateAgentInput) {
  const agent = await prisma.agent.create({
    data: {
      ...data,
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

### Room Server Actions
```typescript
// src/lib/actions/rooms.ts
"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function getRooms(userId: string) {
  return await prisma.room.findMany({
    where: {
      participants: {
        some: { user_id: userId }
      }
    },
    include: {
      participants: {
        include: { user: true }
      },
      agents: true,
      _count: {
        select: { messages: true }
      }
    }
  })
}

export async function createRoom(data: CreateRoomInput) {
  const room = await prisma.room.create({
    data: {
      ...data,
      created_by: data.userId,
      participants: {
        create: {
          user_id: data.userId,
          role: "owner"
        }
      }
    }
  })

  revalidatePath("/rooms")
  return room
}

export async function joinRoom(roomId: string, userId: string) {
  const participant = await prisma.roomParticipant.create({
    data: {
      room_id: roomId,
      user_id: userId,
      role: "member"
    }
  })

  revalidatePath(`/rooms/${roomId}`)
  return participant
}
```

### Message Server Actions
```typescript
// src/lib/actions/messages.ts
"use server"

import { prisma } from "@/lib/db"

export async function getRoomMessages(roomId: string, limit = 50, offset = 0) {
  return await prisma.message.findMany({
    where: { room_id: roomId },
    include: {
      mentions: {
        include: { agent: true }
      }
    },
    orderBy: { timestamp: "desc" },
    take: limit,
    skip: offset
  })
}

export async function createMessage(data: CreateMessageInput) {
  const message = await prisma.message.create({
    data: {
      ...data,
      mentions: data.mentions ? {
        create: data.mentions.map(agentId => ({
          mentioned_agent_id: agentId
        }))
      } : undefined
    },
    include: {
      mentions: {
        include: { agent: true }
      }
    }
  })

  // Trigger AI responses via WebSocket
  // This would be handled by the Socket.io server
  return message
}
```

## 🔄 Room Management Operations (Server Actions)

### Create Room Component Usage
```typescript
// src/app/rooms/create/page.tsx
import { createRoom } from "@/lib/actions/rooms"

export default function CreateRoomPage() {
  return (
    <form action={createRoom}>
      <input name="name" placeholder="Room Name" required />
      <textarea name="description" placeholder="Description" />
      <button type="submit">Create Room</button>
    </form>
  )
}
```

### Direct Data Access
```typescript
// Server Components can directly access data
export default async function RoomsPage() {
  const rooms = await getRooms(userId) // Direct Server Action call

  return (
    <div>
      {rooms.map(room => (
        <RoomCard key={room.id} room={room} />
      ))}
    </div>
  )
}
```

### Join Room with Server Action
```typescript
// src/components/JoinRoomButton.tsx
"use client"

import { joinRoom } from "@/lib/actions/rooms"
import { useSession } from "next-auth/react"

export function JoinRoomButton({ roomId }: { roomId: string }) {
  const { data: session } = useSession()

  const handleJoin = async () => {
    if (!session?.user) return

    await joinRoom(roomId, session.user.id)
    // Revalidation happens automatically
  }

  return <button onClick={handleJoin}>Join Room</button>
}
```

### Room Page with Direct Data
```typescript
// src/app/rooms/[id]/page.tsx
import { getRoom, getRoomMessages } from "@/lib/actions/rooms"

export default async function RoomPage({ params }: { params: { id: string } }) {
  const room = await getRoom(params.id)
  const messages = await getRoomMessages(params.id)

  if (!room) return <div>Room not found</div>

  return (
    <div>
      <h1>{room.name}</h1>
      <MessageList messages={messages} />
      <MessageInput roomId={params.id} />
    </div>
  )
}
```

## 💬 Message Handling Architecture

### Send Message with WebSocket + Server Action
```typescript
// src/components/MessageInput.tsx
"use client"

import { useState } from "react"
import { useSocket } from "@/hooks/useSocket"
import { createMessage } from "@/lib/actions/messages"

export function MessageInput({ roomId }: { roomId: string }) {
  const [message, setMessage] = useState("")
  const socket = useSocket()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    // Create message in database
    await createMessage({
      room_id: roomId,
      content: message,
      type: "user",
      sender_id: getCurrentUserId(), // Get from session
      mentions: extractMentions(message)
    })

    // Emit to WebSocket for real-time updates
    socket?.emit("send_message", {
      room_id: roomId,
      content: message,
      mentions: extractMentions(message)
    })

    setMessage("")
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
      />
      <button type="submit">Send</button>
    </form>
  )
}
```

### Real-time Message Updates
```typescript
// src/hooks/useSocket.ts
"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import io, { Socket } from "socket.io-client"

export function useSocket() {
  const { data: session } = useSession()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    if (!session) return

    const newSocket = io("/", {
      auth: { session }
    })

    newSocket.on("message_received", (message: Message) => {
      setMessages(prev => [...prev, message])
    })

    newSocket.on("agent_response", (message: Message) => {
      setMessages(prev => [...prev, message])
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [session])

  return { socket, messages }
}
```

### Message Processing Flow (Simplified)
```typescript
// src/lib/actions/messages.ts
export async function createMessage(data: CreateMessageInput) {
  const message = await prisma.message.create({
    data: {
      ...data,
      mentions: data.mentions ? {
        create: data.mentions.map(agentId => ({
          mentioned_agent_id: agentId
        }))
      } : undefined
    },
    include: {
      mentions: {
        include: { agent: true }
      }
    }
  })

  // Trigger AI responses via WebSocket event
  // The Socket.io server will handle AI processing
  if (data.mentions && data.mentions.length > 0) {
    // Emit to AI processing service
    await triggerAIResponses(message, data.mentions)
  }

  return message
}

// AI Response Trigger (called from WebSocket server)
async function triggerAIResponses(message: Message, agentIds: string[]) {
  const agents = await prisma.agent.findMany({
    where: { id: { in: agentIds } }
  })

  // Process each agent response
  const responses = await Promise.allSettled(
    agents.map(agent => aiService.generateResponse(agent, message))
  )

  // Broadcast successful responses via WebSocket
  responses.forEach((response, index) => {
    if (response.status === 'fulfilled') {
      socketServer.to(message.room_id).emit('agent_response', response.value)
    }
  })
}
```

## 🎟️ Simple Invitation System

### Generate Invitation (Server Action)
```typescript
// src/lib/actions/invitations.ts
"use server"

import { prisma } from "@/lib/db"
import crypto from "crypto"

export async function generateInvitation(roomId: string, userId: string) {
  // Verify user has permission to invite
  const room = await prisma.room.findFirst({
    where: {
      id: roomId,
      participants: {
        some: {
          user_id: userId,
          role: { in: ["owner", "admin"] }
        }
      }
    }
  })

  if (!room) {
    throw new Error("No permission to invite users")
  }

  // Generate unique token
  const token = crypto.randomBytes(32).toString('hex')
  const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`

  const invitation = await prisma.roomInvitation.create({
    data: {
      room_id: roomId,
      invited_by: userId,
      invite_token: token
    }
  })

  return { ...invitation, invitation_url: invitationUrl }
}
```

### Join via Invitation
```typescript
// src/app/invite/[token]/page.tsx
import { joinViaInvitation } from "@/lib/actions/invitations"
import { getServerSession } from "next-auth"

export default async function InvitePage({ params }: { params: { token: string } }) {
  const session = await getServerSession()

  if (!session) {
    return <div>Please sign in to join this room</div>
  }

  try {
    const participant = await joinViaInvitation(params.token, session.user.id)

    return (
      <div>
        <h1>Successfully joined room!</h1>
        <a href={`/rooms/${participant.room_id}`}>Go to Room</a>
      </div>
    )
  } catch (error) {
    return <div>Invalid or expired invitation</div>
  }
}
```

## 🔒 Server Actions Security

### Authentication in Server Actions
```typescript
// src/lib/actions/agents.ts
"use server"

import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

export async function getAgents() {
  const session = await getServerSession()

  if (!session?.user?.id) {
    redirect("/login")
  }

  return await prisma.agent.findMany({
    where: { created_by: session.user.id }
  })
}

export async function createAgent(data: CreateAgentInput) {
  const session = await getServerSession()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  // Validate input with Zod
  const validatedData = createAgentSchema.parse(data)

  return await prisma.agent.create({
    data: {
      ...validatedData,
      created_by: session.user.id
    }
  })
}
```

### Input Validation
```typescript
// src/lib/validations.ts
import { z } from "zod"

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  prompt: z.string().min(10).max(4000),
  emoji: z.string().emoji().optional().default("🤖"),
  style: z.enum(["professional", "direct", "friendly", "creative", "analytical"])
})

export const createMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  mentions: z.array(z.string().uuid()).optional()
})
```

### WebSocket Authentication
```typescript
// src/app/api/socket/route.ts
import { getToken } from "next-auth/jwt"

io.use(async (socket, next) => {
  try {
    const token = await getToken({
      req: socket.request as any,
      secret: process.env.NEXTAUTH_SECRET
    });

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    socket.userId = token.sub;
    socket.userName = token.name;
    next();
  } catch (error) {
    next(new Error("Authentication failed"));
  }
});
```

### Client-side Usage
```typescript
// src/components/AgentForm.tsx
"use client"

import { useSession } from "next-auth/react"
import { createAgent } from "@/lib/actions/agents"

export function AgentForm() {
  const { data: session } = useSession()

  const handleSubmit = async (formData: FormData) => {
    if (!session) return

    const result = await createAgent({
      name: formData.get("name") as string,
      prompt: formData.get("prompt") as string,
      userId: session.user.id
    })

    // Handle result
  }

  return (
    <form action={handleSubmit}>
      {/* Form fields */}
    </form>
  )
}
```

---

**Related Files:**
- [Authentication Overview](../auth/overview.md) - NextAuth.js configuration and setup
- [Architecture Overview](./overview.md) - System architecture and component relationships
- [Database Schema](./database-schema.md) - MySQL database design and interfaces
- [Invitation System](./invitation-system.md) - Simple link-based invitation flow
- [Performance Optimization](./performance-optimization.md) - Server Actions and WebSocket performance strategies
