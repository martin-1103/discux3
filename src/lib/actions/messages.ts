"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import {
  createMessageSchema,
  type CreateMessageInput
} from "@/lib/validations"
import { storeConversationMessage } from "../vector-store"
import { incrementAgentUsage } from "./agents"
import { generateAgentResponse } from "./ai"
import { getVectorStore } from "../vector-store"

/**
 * Get messages for a room
 */
export async function getMessages(roomId: string, userId: string, limit: number = 50) {
  try {
    // Verify user has access to the room
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
      }
    })

    if (!room) {
      return { success: false, error: "Room not found or unauthorized" }
    }

    const messages = await prisma.message.findMany({
      where: {
        roomId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        mentions: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                emoji: true,
                color: true
              }
            }
          }
        }
      },
      orderBy: {
        timestamp: "desc"
      },
      take: limit
    })

    // Reverse to get chronological order
    const orderedMessages = messages.reverse()

    // Convert Decimal objects to numbers for Client Component compatibility
    const serializedMessages = orderedMessages.map(message => ({
      ...message,
      processingTime: message.processingTime ? Number(message.processingTime) : null,
      agentConfidence: message.agentConfidence ? Number(message.agentConfidence) : null,
      timestamp: message.timestamp
    }))

    return { success: true, data: serializedMessages }
  } catch (error) {
    console.error("Error fetching messages:", error)
    return { success: false, error: "Failed to fetch messages" }
  }
}

/**
 * Create a new message
 */
export async function createMessage(userId: string, data: CreateMessageInput) {
  try {
    // Validate input
    const validatedData = createMessageSchema.parse(data)

    // Verify user has access to the room
    const room = await prisma.room.findFirst({
      where: {
        id: validatedData.roomId,
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
        agents: {
          include: {
            agent: true
          }
        }
      }
    })

    if (!room) {
      return { success: false, error: "Room not found or unauthorized" }
    }

    // Extract agent mentions from message content
    const agentMentions = extractAgentMentions(validatedData.content, room.agents)

    // Create message with mentions
    const message = await prisma.$transaction(async (tx) => {
      const newMessage = await tx.message.create({
        data: {
          roomId: validatedData.roomId,
          content: validatedData.content,
          type: "USER",
          senderId: userId,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          },
          mentions: {
            include: {
              agent: {
                select: {
                  id: true,
                  name: true,
                  emoji: true,
                  color: true
                }
              }
            }
          }
        }
      })

      // Create agent mentions if any
      if (agentMentions.length > 0) {
        await tx.messageMention.createMany({
          data: agentMentions.map(agentId => ({
            messageId: newMessage.id,
            mentionedAgentId: agentId
          }))
        })
      }

      return newMessage
    })

    // Convert Decimal objects to numbers for Client Component compatibility
    const serializedMessage = {
      ...message,
      processingTime: message.processingTime ? Number(message.processingTime) : null,
      agentConfidence: message.agentConfidence ? Number(message.agentConfidence) : null,
      timestamp: message.timestamp
    }

    // Store message in vector database for context
    if (serializedMessage.sender) {
      try {
        await storeConversationMessage(
          validatedData.roomId,
          serializedMessage.id,
          validatedData.content,
          serializedMessage.sender.name || "Anonymous",
          "user"
        )
      } catch (error) {
        console.error("Error storing message in vector DB:", error)
        // Don't throw error to avoid breaking chat functionality
      }
    }

    // Increment usage for mentioned agents
    for (const agentMention of agentMentions) {
      await incrementAgentUsage(agentMention)
    }

    // Trigger agent responses asynchronously (server-side)
    if (agentMentions.length > 0) {
      console.log(`[Messages] Triggering agent responses for ${agentMentions.length} agents`)

      // Check if this should be a discussion (multiple agents or explicit discussion command)
      const isDiscussionMode = agentMentions.length >= 2 ||
        validatedData.content.toLowerCase().includes('discuss') ||
        validatedData.content.toLowerCase().includes('debate') ||
        validatedData.content.toLowerCase().includes('analyze')

      if (isDiscussionMode && agentMentions.length >= 2) {
        // Start a multi-agent discussion
        console.log(`[Messages] Starting multi-agent discussion with ${agentMentions.length} agents`)

        // Determine intensity based on content and agent types
        const intensity = determineDiscussionIntensity(validatedData.content, agentMentions, room.agents)

        try {
          const { createDiscussion } = await import("@/lib/services/discussion-orchestrator")
          const discussionResult = await createDiscussion(
            validatedData.roomId,
            message.id,
            agentMentions,
            extractTopic(validatedData.content),
            intensity
          )

          if (discussionResult.success) {
            console.log(`[Messages] Discussion created: ${discussionResult.data.id}`)

            // Execute discussion asynchronously
            const { executeDiscussion } = await import("@/lib/services/discussion-orchestrator")
            executeDiscussion(
              discussionResult.data.id,
              validatedData.senderId,
              message.sender?.name || "User"
            ).catch(error => {
              console.error("[Messages] Failed to execute discussion:", error)
            })
          }
        } catch (error) {
          console.error("[Messages] Failed to create discussion:", error)
          // Fallback to individual agent responses
          triggerIndividualAgentResponses(agentMentions, validatedData, message)
        }
      } else {
        // Individual agent responses (existing behavior)
        triggerIndividualAgentResponses(agentMentions, validatedData, message)
      }
    }

    revalidatePath(`/rooms/${validatedData.roomId}/chat`)
    return { success: true, data: serializedMessage }
  } catch (error) {
    console.error("Error creating message:", error)
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "Failed to create message" }
  }
}

/**
 * Create an agent message
 */
export async function createAgentMessage(
  roomId: string,
  agentId: string,
  content: string,
  processingTime?: number,
  agentConfidence?: number,
  contextLength?: number
) {
  try {
    // Get agent information
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { createdBy: true, name: true, emoji: true, color: true, style: true }
    })

    if (!agent) {
      return { success: false, error: "Agent not found" }
    }

    // Prepend agent info to content for parsing in the frontend
    const contentWithAgentInfo = `[AGENT:${agentId}:${agent.name}:${agent.emoji}:${agent.color}:${agent.style}]\n${content}`

    // Create message as agent (using agent's creator as sender for now)
    const message = await prisma.message.create({
      data: {
        roomId,
        content: contentWithAgentInfo,
        type: "AGENT",
        senderId: agent.createdBy,
        processingTime,
        agentConfidence,
        contextLength,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        mentions: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                emoji: true,
                color: true
              }
            }
          }
        }
      }
    })

    // Convert Decimal objects to numbers for Client Component compatibility
    const serializedMessage = {
      ...message,
      processingTime: message.processingTime ? Number(message.processingTime) : null,
      agentConfidence: message.agentConfidence ? Number(message.agentConfidence) : null,
      timestamp: message.timestamp
    }

      // Store agent message in vector database for context (without agent info prefix)
    try {
      await storeConversationMessage(
        roomId,
        message.id,
        content,
        agent.name,
        "agent"
      )
    } catch (error) {
      console.error("Error storing agent message in vector DB:", error)
      // Don't throw error to avoid breaking chat functionality
    }

    revalidatePath(`/rooms/${roomId}/chat`)
    return { success: true, data: serializedMessage }
  } catch (error) {
    console.error("Error creating agent message:", error)
    return { success: false, error: "Failed to create agent message" }
  }
}

/**
 * Delete a message (owner or sender only)
 */
export async function deleteMessage(messageId: string, userId: string) {
  try {
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        OR: [
          { senderId: userId },
          { 
            room: {
              createdBy: userId
            }
          }
        ]
      }
    })

    if (!message) {
      return { success: false, error: "Message not found or unauthorized" }
    }

    await prisma.message.delete({
      where: { id: messageId }
    })

    return { success: true, message: "Message deleted successfully" }
  } catch (error) {
    console.error("Error deleting message:", error)
    return { success: false, error: "Failed to delete message" }
  }
}

/**
 * Extract agent mentions from message content
 */
function extractAgentMentions(content: string, roomAgents: Array<{ agent: { id: string, name: string } }>): string[] {
  const mentions: string[] = []

  console.log(`[Messages] Extracting mentions from content: "${content}"`)
  console.log(`[Messages] Available room agents:`, roomAgents.map(ra => ({ id: ra.agent.id, name: ra.agent.name })))

  // Find @mentions in the content (supports emojis and spaces)
  const mentionRegex = /@([^\s]+)/g
  let match

  while ((match = mentionRegex.exec(content)) !== null) {
    const mentionName = match[1].toLowerCase()
    console.log(`[Messages] Found mention: @${mentionName}`)

    // Check for @all mention
    if (mentionName === 'all') {
      // Add all agents in the room
      const allAgentIds = roomAgents.map(roomAgent => roomAgent.agent.id)
      console.log(`[Messages] @all mention - adding all agent IDs:`, allAgentIds)
      mentions.push(...allAgentIds)
    } else {
      // Remove emojis and extra spaces from mention for matching
      const cleanMentionName = mentionName.replace(/[\p{Emoji_Presentation}\p{Emoji}\u200D]+/gu, '').trim()
      console.log(`[Messages] Cleaned mention name: "${cleanMentionName}"`)

      // Find matching agent in room (try both original mention and cleaned version)
      const agent = roomAgents.find(roomAgent =>
        roomAgent.agent.name.toLowerCase() === cleanMentionName ||
        roomAgent.agent.name.toLowerCase() === mentionName
      )

      if (agent) {
        console.log(`[Messages] Found matching agent: ${agent.name} (${agent.agent.id})`)
        mentions.push(agent.agent.id)
      } else {
        console.log(`[Messages] No agent found with name: "${mentionName}" or "${cleanMentionName}"`)
        console.log(`[Messages] Available agents:`, roomAgents.map(ra => ra.agent.name.toLowerCase()))
      }
    }
  }

  const uniqueMentions = [...new Set(mentions)]
  console.log(`[Messages] Final extracted agent IDs:`, uniqueMentions)
  return uniqueMentions
}

/**
 * Trigger individual agent responses (fallback for non-discussion mode)
 */
function triggerIndividualAgentResponses(
  agentMentions: string[],
  validatedData: CreateMessageInput,
  message: any
) {
  console.log(`[Messages] Triggering individual agent responses for ${agentMentions.length} agents`)

  // Generate responses for each mentioned agent
  agentMentions.forEach(async (agentId) => {
    try {
      await generateAgentResponse(
        agentId,
        validatedData.roomId,
        validatedData.content,
        validatedData.senderId,
        message.sender?.name || "User"
      )
      console.log(`[Messages] Agent response generated for agent: ${agentId}`)
    } catch (error) {
      console.error(`[Messages] Failed to generate response for agent ${agentId}:`, error)
    }
  })
}

/**
 * Determine discussion intensity based on content and agent types
 */
function determineDiscussionIntensity(
  content: string,
  agentIds: string[],
  roomAgents: Array<{ agent: { id: string, style: string } }>
): 'NORMAL' | 'BRUTAL' | 'INTENSE' | 'EXTREME' {
  const contentLower = content.toLowerCase()

  // Check for brutal mode keywords
  const brutalKeywords = [
    'brutal', 'harsh', 'unfiltered', 'honest', 'truth', 'no bullshit',
    'critical', 'reality check', 'call me out', 'challenge me'
  ]

  // Check for intense mode keywords
  const intenseKeywords = [
    'intense', 'deep dive', 'analyze thoroughly', 'examine', 'critique',
    'detailed analysis', 'break it down', 'serious discussion'
  ]

  // Check if any mentioned agents are brutal advisors
  const mentionedAgents = roomAgents
    .filter(ra => agentIds.includes(ra.agent.id))
    .map(ra => ra.agent.style)

  const hasBrutalAgents = mentionedAgents.some(style =>
    ['BRUTAL_MENTOR', 'STRATEGIC_CHALLENGER', 'GROWTH_ACCELERATOR',
     'EXECUTION_DRILL_SERGEANT', 'TRUTH_TELLER'].includes(style)
  )

  // Determine intensity
  if (brutalKeywords.some(keyword => contentLower.includes(keyword)) || hasBrutalAgents) {
    return 'BRUTAL'
  } else if (intenseKeywords.some(keyword => contentLower.includes(keyword))) {
    return 'INTENSE'
  } else if (contentLower.includes('extreme') || contentLower.includes('no limits')) {
    return 'EXTREME'
  }

  return 'NORMAL'
}

/**
 * Extract topic from message content
 */
function extractTopic(content: string): string | undefined {
  // Simple topic extraction - can be enhanced with AI
  const topicPatterns = [
    /about (.+?)(?:\?|$|\.|!)/i,
    /regarding (.+?)(?:\?|$|\.|!)/i,
    /discuss (.+?)(?:\?|$|\.|!)/i,
    /analyze (.+?)(?:\?|$|\.|!)/i
  ]

  for (const pattern of topicPatterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  // If no specific topic found, use first 50 characters
  if (content.length > 20) {
    return content.substring(0, 50).trim() + (content.length > 50 ? '...' : '')
  }

  return undefined
}

/**
 * Get room statistics
 */
export async function getRoomStats(roomId: string, userId: string) {
  try {
    // Verify user has access to the room
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
      }
    })

    if (!room) {
      return { success: false, error: "Room not found or unauthorized" }
    }

    const stats = await prisma.message.groupBy({
      by: ['type'],
      where: {
        roomId
      },
      _count: {
        id: true
      }
    })

    const totalMessages = await prisma.message.count({
      where: {
        roomId
      }
    })

    const messageCountByType = stats.reduce((acc, stat) => {
      acc[stat.type] = stat._count.id
      return acc
    }, {} as Record<string, number>)

    return {
      success: true,
      data: {
        totalMessages,
        ...messageCountByType
      }
    }
  } catch (error) {
    console.error("Error fetching room stats:", error)
    return { success: false, error: "Failed to fetch room stats" }
  }
}

/**
 * Clear all messages in a room (Admin/Owner only)
 */
export async function clearRoomHistory(roomId: string, userId: string) {
  try {
    // Verify user has admin or owner permissions
    const room = await prisma.room.findFirst({
      where: {
        id: roomId,
        participants: {
          some: {
            userId,
            role: { in: ["OWNER", "ADMIN"] }
          }
        }
      },
      include: {
        participants: {
          where: {
            userId,
            role: { in: ["OWNER", "ADMIN"] }
          },
          select: {
            role: true
          }
        }
      }
    })

    if (!room) {
      return { success: false, error: "Room not found or insufficient permissions" }
    }

    const userRole = room.participants[0]?.role

    // Get all message IDs for vector cleanup before deletion
    const messages = await prisma.message.findMany({
      where: { roomId },
      select: { id: true }
    })

    const messageIds = messages.map(msg => msg.id)
    console.log(`[ClearHistory] Found ${messageIds.length} messages to delete from room ${roomId}`)

    // Delete from MySQL in transaction
    await prisma.$transaction(async (tx) => {
      // Delete in proper order to respect foreign key constraints
      await tx.discussionResponse.deleteMany({
        where: {
          message: {
            roomId
          }
        }
      })

      await tx.discussion.deleteMany({
        where: { roomId }
      })

      await tx.messageMention.deleteMany({
        where: {
          message: {
            roomId
          }
        }
      })

      await tx.message.deleteMany({
        where: { roomId }
      })
    })

    console.log(`[ClearHistory] Successfully deleted ${messageIds.length} messages from MySQL`)

    // Clean up vector database
    try {
      const vectorStore = getVectorStore()
      await vectorStore.deleteRoomMessages(roomId)
      console.log(`[ClearHistory] Successfully deleted messages from vector database`)
    } catch (vectorError) {
      console.error("[ClearHistory] Failed to delete from vector database:", vectorError)
      // Don't fail the operation if vector cleanup fails
    }

    // Clean up vector ID mappings for deleted messages
    try {
      if (messageIds.length > 0) {
        await prisma.vectorIdMapping.deleteMany({
          where: {
            cuidId: { in: messageIds }
          }
        })
        console.log(`[ClearHistory] Successfully cleaned up ${messageIds.length} vector ID mappings`)
      }
    } catch (mappingError) {
      console.error("[ClearHistory] Failed to clean up vector ID mappings:", mappingError)
      // Don't fail the operation if mapping cleanup fails
    }

    revalidatePath(`/rooms/${roomId}/chat`)

    return {
      success: true,
      message: `Successfully cleared ${messageIds.length} messages from room history`,
      deletedCount: messageIds.length,
      clearedBy: userRole
    }
  } catch (error) {
    console.error("[ClearHistory] Error clearing room history:", error)
    return { success: false, error: "Failed to clear room history" }
  }
}
