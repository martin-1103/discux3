"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { 
  createRoomSchema, 
  updateRoomSchema, 
  roomSettingsSchema,
  createInvitationSchema,
  type CreateRoomInput, 
  type UpdateRoomInput,
  type RoomSettingsInput,
  type CreateInvitationInput
} from "@/lib/validations"
// Simple ID generator
function generateId(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Get all rooms for the current user
 */
export async function getRooms(userId: string) {
  try {
    const rooms = await prisma.room.findMany({
      where: {
        OR: [
          { createdBy: userId },
          { 
            participants: {
              some: { userId }
            }
          }
        ]
      },
      include: {
        creator: {
          select: { name: true, email: true }
        },
        participants: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
        agents: {
          include: {
            agent: {
              select: { 
                id: true, 
                name: true, 
                emoji: true, 
                color: true, 
                style: true 
              }
            }
          }
        },
        settings: true,
        _count: {
          select: {
            participants: true,
            agents: true,
            messages: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    })

    return { success: true, data: rooms }
  } catch (error) {
    console.error("Error fetching rooms:", error)
    return { success: false, error: "Failed to fetch rooms" }
  }
}

/**
 * Get user role in a room
 */
export async function getUserRoleInRoom(roomId: string, userId: string): Promise<"OWNER" | "ADMIN" | "MEMBER" | null> {
  try {
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        OR: [
          { createdBy: userId },
          {
            participants: {
              some: { userId }
            }
          }
        ]
      },
      include: {
        participants: {
          where: { userId },
          select: { role: true }
        }
      }
    })

    if (!room) {
      return null
    }

    // If user created the room, they are OWNER
    if (room.createdBy === userId) {
      return "OWNER"
    }

    // Otherwise, check participant role
    if (room.participants.length > 0) {
      return room.participants[0].role
    }

    return null
  } catch (error) {
    console.error("Error getting user role:", error)
    return null
  }
}

/**
 * Get a single room by ID (if user has access)
 */
export async function getRoom(id: string, userId: string) {
  try {
    const room = await prisma.room.findFirst({
      where: {
        id,
        OR: [
          { createdBy: userId },
          { 
            participants: {
              some: { userId }
            }
          }
        ]
      },
      include: {
        creator: {
          select: { name: true, email: true }
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        agents: {
          include: {
            agent: {
              select: { 
                id: true, 
                name: true, 
                emoji: true, 
                color: true, 
                style: true 
              }
            }
          }
        },
        settings: true,
        _count: {
          select: {
            participants: true,
            agents: true,
            messages: true
          }
        }
      }
    })

    if (!room) {
      return { success: false, error: "Room not found" }
    }

    return { success: true, data: room }
  } catch (error) {
    console.error("Error fetching room:", error)
    return { success: false, error: "Failed to fetch room" }
  }
}

/**
 * Create a new room
 */
export async function createRoom(userId: string, data: CreateRoomInput) {
  try {
    // Validate input
    const validatedData = createRoomSchema.parse(data)

    // Check subscription limits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        subscription: true, 
        maxRooms: true,
        _count: {
          select: { 
            rooms: true
          }
        }
      },
    })

    if (!user) {
      return { success: false, error: "User not found" }
    }

    // Check if user has reached room limit
    if (user._count.rooms >= user.maxRooms) {
      return { 
        success: false, 
        error: `You've reached your room limit (${user.maxRooms}). Upgrade to create more rooms.` 
      }
    }

    // Create room and settings in a transaction
    const room = await prisma.$transaction(async (tx) => {
      const newRoom = await tx.room.create({
        data: {
          ...validatedData,
          createdBy: userId,
          settings: {
            create: roomSettingsSchema.parse({})
          }
        },
        include: {
          settings: true
        }
      })

      // Add creator as owner participant
      await tx.roomParticipant.create({
        data: {
          roomId: newRoom.id,
          userId,
          role: "OWNER"
        }
      })

      return newRoom
    })

    revalidatePath("/rooms")
    return { success: true, data: room }
  } catch (error) {
    console.error("Error creating room:", error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Failed to create room" }
  }
}

/**
 * Update an existing room
 */
export async function updateRoom(id: string, userId: string, data: UpdateRoomInput) {
  try {
    // Validate input
    const validatedData = updateRoomSchema.parse(data)

    // Verify ownership or admin role
    const room = await prisma.room.findFirst({
      where: {
        id,
        OR: [
          { createdBy: userId },
          { 
            participants: {
              some: {
                userId,
                role: { in: ["OWNER", "ADMIN"] }
              }
            }
          }
        ]
      }
    })

    if (!room) {
      return { success: false, error: "Room not found or insufficient permissions" }
    }

    // Update room
    const updatedRoom = await prisma.room.update({
      where: { id },
      data: validatedData,
      include: {
        settings: true
      }
    })

    revalidatePath("/rooms")
    revalidatePath(`/rooms/${id}`)
    return { success: true, data: updatedRoom }
  } catch (error) {
    console.error("Error updating room:", error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Failed to update room" }
  }
}

/**
 * Update room settings
 */
export async function updateRoomSettings(id: string, userId: string, data: RoomSettingsInput) {
  try {
    // Validate input
    const validatedData = roomSettingsSchema.parse(data)

    // Verify ownership
    const room = await prisma.room.findFirst({
      where: {
        id,
        OR: [
          { createdBy: userId },
          { 
            participants: {
              some: {
                userId,
                role: "OWNER"
              }
            }
          }
        ]
      }
    })

    if (!room) {
      return { success: false, error: "Room not found or insufficient permissions" }
    }

    // Update settings
    const settings = await prisma.roomSettings.upsert({
      where: { roomId: id },
      update: validatedData,
      create: {
        roomId: id,
        ...validatedData
      }
    })

    revalidatePath("/rooms")
    revalidatePath(`/rooms/${id}`)
    return { success: true, data: settings }
  } catch (error) {
    console.error("Error updating room settings:", error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Failed to update room settings" }
  }
}

/**
 * Delete a room (owner only)
 */
export async function deleteRoom(id: string, userId: string) {
  try {
    // Verify ownership
    const room = await prisma.room.findFirst({
      where: {
        id,
        createdBy: userId
      }
    })

    if (!room) {
      return { success: false, error: "Room not found or unauthorized" }
    }

    // Delete room (cascade delete will handle related records)
    await prisma.room.delete({
      where: { id }
    })

    revalidatePath("/rooms")
    return { success: true, message: "Room deleted successfully" }
  } catch (error) {
    console.error("Error deleting room:", error)
    return { success: false, error: "Failed to delete room" }
  }
}

/**
 * Add participant to room
 */
export async function addParticipant(roomId: string, userId: string, participantEmail: string, role: "ADMIN" | "MEMBER" = "MEMBER") {
  try {
    // Verify permissions (owner or admin)
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        OR: [
          { createdBy: userId },
          { 
            participants: {
              some: {
                userId,
                role: { in: ["OWNER", "ADMIN"] }
              }
            }
          }
        ]
      }
    })

    if (!room) {
      return { success: false, error: "Room not found or insufficient permissions" }
    }

    // Find participant user by email
    const participantUser = await prisma.user.findUnique({
      where: { email: participantEmail }
    })

    if (!participantUser) {
      return { success: false, error: "User not found" }
    }

    // Check if participant already exists
    const existingParticipant = await prisma.roomParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: participantUser.id
        }
      }
    })

    if (existingParticipant) {
      return { success: false, error: "User is already a participant" }
    }

    // Add participant
    const participant = await prisma.roomParticipant.create({
      data: {
        roomId,
        userId: participantUser.id,
        role
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    })

    revalidatePath("/rooms")
    revalidatePath(`/rooms/${roomId}`)
    return { success: true, data: participant }
  } catch (error) {
    console.error("Error adding participant:", error)
    return { success: false, error: "Failed to add participant" }
  }
}

/**
 * Remove participant from room
 */
export async function removeParticipant(roomId: string, userId: string, participantId: string) {
  try {
    // Verify permissions (owner or admin, or removing self)
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        OR: [
          { createdBy: userId },
          { 
            participants: {
              some: {
                userId,
                role: { in: ["OWNER", "ADMIN"] }
              }
            }
          }
        ]
      }
    })

    if (!room) {
      return { success: false, error: "Room not found or insufficient permissions" }
    }

    // Don't allow removing the owner
    const participant = await prisma.roomParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: participantId
        }
      },
      include: {
        user: {
          select: { id: true, email: true }
        }
      }
    })

    if (!participant) {
      return { success: false, error: "Participant not found" }
    }

    if (participant.role === "OWNER") {
      return { success: false, error: "Cannot remove room owner" }
    }

    // Remove participant
    await prisma.roomParticipant.delete({
      where: {
        roomId_userId: {
          roomId,
          userId: participantId
        }
      }
    })

    revalidatePath("/rooms")
    revalidatePath(`/rooms/${roomId}`)
    return { success: true, message: "Participant removed successfully" }
  } catch (error) {
    console.error("Error removing participant:", error)
    return { success: false, error: "Failed to remove participant" }
  }
}

/**
 * Add agent to room
 */
export async function addAgentToRoom(roomId: string, userId: string, agentId: string) {
  try {
    // Verify permissions (owner or admin)
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        OR: [
          { createdBy: userId },
          { 
            participants: {
              some: {
                userId,
                role: { in: ["OWNER", "ADMIN"] }
              }
            }
          }
        ]
      },
      include: {
        settings: true,
        _count: {
          select: {
            agents: true
          }
        }
      }
    })

    if (!room) {
      return { success: false, error: "Room not found or insufficient permissions" }
    }

    // Check agent limit
    if (room._count.agents >= (room.settings?.maxAgents || 5)) {
      return { 
        success: false, 
        error: `Room has reached maximum agent limit (${room.settings?.maxAgents || 5})` 
      }
    }

    // Verify agent exists and user has access
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        createdBy: userId
      }
    })

    if (!agent) {
      return { success: false, error: "Agent not found or unauthorized" }
    }

    // Check if agent already in room
    const existingRoomAgent = await prisma.roomAgent.findUnique({
      where: {
        roomId_agentId: {
          roomId,
          agentId
        }
      }
    })

    if (existingRoomAgent) {
      return { success: false, error: "Agent is already in this room" }
    }

    // Add agent to room
    const roomAgent = await prisma.roomAgent.create({
      data: {
        roomId,
        agentId,
        addedBy: userId
      },
      include: {
        agent: {
          select: { 
            id: true, 
            name: true, 
            emoji: true, 
            color: true, 
            style: true 
          }
        }
      }
    })

    revalidatePath("/rooms")
    revalidatePath(`/rooms/${roomId}`)
    return { success: true, data: roomAgent }
  } catch (error) {
    console.error("Error adding agent to room:", error)
    return { success: false, error: "Failed to add agent to room" }
  }
}

/**
 * Remove agent from room
 */
export async function removeAgentFromRoom(roomId: string, userId: string, agentId: string) {
  try {
    // Verify permissions (owner or admin)
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        OR: [
          { createdBy: userId },
          { 
            participants: {
              some: {
                userId,
                role: { in: ["OWNER", "ADMIN"] }
              }
            }
          }
        ]
      }
    })

    if (!room) {
      return { success: false, error: "Room not found or insufficient permissions" }
    }

    // Remove agent from room
    await prisma.roomAgent.delete({
      where: {
        roomId_agentId: {
          roomId,
          agentId
        }
      }
    })

    revalidatePath("/rooms")
    revalidatePath(`/rooms/${roomId}`)
    return { success: true, message: "Agent removed from room successfully" }
  } catch (error) {
    console.error("Error removing agent from room:", error)
    return { success: false, error: "Failed to remove agent from room" }
  }
}

/**
 * Create room invitation
 */
export async function createRoomInvitation(userId: string, data: CreateInvitationInput) {
  try {
    const validatedData = createInvitationSchema.parse(data)

    // Verify permissions (owner or admin)
    const room = await prisma.room.findFirst({
      where: {
        id: validatedData.roomId,
        OR: [
          { createdBy: userId },
          { 
            participants: {
              some: {
                userId,
                role: { in: ["OWNER", "ADMIN"] }
              }
            }
          }
        ]
      }
    })

    if (!room) {
      return { success: false, error: "Room not found or insufficient permissions" }
    }

    // Generate invitation token
    const inviteToken = generateId(32)
    const expiresAt = validatedData.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create invitation
    const invitation = await prisma.roomInvitation.create({
      data: {
        roomId: validatedData.roomId,
        invitedBy: userId,
        inviteToken,
        email: validatedData.email,
        expiresAt
      },
      include: {
        room: {
          select: { name: true }
        },
        inviter: {
          select: { name: true, email: true }
        }
      }
    })

    revalidatePath("/rooms")
    return { success: true, data: invitation }
  } catch (error) {
    console.error("Error creating invitation:", error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Failed to create invitation" }
  }
}

/**
 * Join room via invitation token
 */
export async function joinRoomViaInvitation(inviteToken: string, userId: string) {
  try {
    // Find valid invitation
    const invitation = await prisma.roomInvitation.findUnique({
      where: { inviteToken },
      include: {
        room: true
      }
    })

    if (!invitation) {
      return { success: false, error: "Invalid invitation token" }
    }

    if (invitation.usedAt) {
      return { success: false, error: "Invitation has already been used" }
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      return { success: false, error: "Invitation has expired" }
    }

    // Check if user is already a participant
    const existingParticipant = await prisma.roomParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId: invitation.roomId,
          userId
        }
      }
    })

    if (existingParticipant) {
      return { success: false, error: "You are already a participant in this room" }
    }

    // Add user as participant and mark invitation as used
    await prisma.$transaction(async (tx) => {
      await tx.roomParticipant.create({
        data: {
          roomId: invitation.roomId,
          userId,
          role: "MEMBER"
        }
      })

      await tx.roomInvitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date() }
      })
    })

    revalidatePath("/rooms")
    revalidatePath(`/rooms/${invitation.roomId}`)
    return { success: true, message: "Successfully joined the room" }
  } catch (error) {
    console.error("Error joining room:", error)
    return { success: false, error: "Failed to join room" }
  }
}
