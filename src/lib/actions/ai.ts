"use server"

import { getZAIClient } from "@/lib/zai"
import { prisma } from "@/lib/db"
import { createAgentMessage } from "./messages"
import { getConversationContext, getVectorStore } from "../vector-store"

/**
 * Generate AI response for an agent in a room
 */
export async function generateAgentResponse(
  agentId: string,
  roomId: string,
  userMessage: string,
  userId: string
) {
  try {
    // Get agent details
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        prompt: true,
        style: true,
        color: true,
        emoji: true,
        createdBy: true
      }
    })

    if (!agent) {
      throw new Error("Agent not found")
    }

    // Get current user info
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    })

    // Get relevant context from vector database
    const relevantContext = await getConversationContext(roomId, userMessage, 5)

    // Build enhanced prompt with context
    let enhancedPrompt = agent.prompt
    
    if (relevantContext.length > 0) {
      const contextLines = relevantContext.map((ctx: any) => 
        `[${new Date(ctx.timestamp).toLocaleTimeString()}] ${ctx.author_name}: ${ctx.content}`
      ).join('\n')
      
      enhancedPrompt = `${agent.prompt}

Recent conversation in this room:
${contextLines}

Current message: ${currentUser?.name || "Anonymous"}: ${userMessage}

Please respond considering who is asking and the conversation flow.`
    }

    // Generate response using Z.ai with enhanced prompt
    const zaiClient = getZAIClient()
    const response = await zaiClient.generateAgentResponse(
      enhancedPrompt,
      agent.style,
      userMessage,
      [], // No need for manual conversation history with vector context
      userId
    )

    // Create agent message in database
    const message = await createAgentMessage(
      roomId,
      agentId,
      response.content,
      response.processingTime,
      0.9, // Default confidence score
      userMessage.length + response.content.length // Simple context length calculation
    )

    if (!message.success) {
      throw new Error("Failed to create agent message")
    }

    return {
      success: true,
      data: {
        agent: {
          id: agent.id,
          name: agent.name,
          emoji: agent.emoji,
          color: agent.color,
          style: agent.style
        },
        message: message.data,
        response: {
          content: response.content,
          model: response.model,
          usage: response.usage,
          processingTime: response.processingTime
        }
      }
    }
  } catch (error) {
    console.error("Error generating agent response:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate agent response"
    }
  }
}

/**
 * Batch generate responses for multiple agents mentioned in a message
 */
export async function generateBatchAgentResponses(
  agentIds: string[],
  roomId: string,
  userMessage: string,
  userId: string
) {
  const responses = await Promise.allSettled(
    agentIds.map(agentId => 
      generateAgentResponse(agentId, roomId, userMessage, userId)
    )
  )

  const successfulResponses = responses
    .filter((result): result is PromiseFulfilledResult<{ success: boolean; data: any }> => 
      result.status === "fulfilled" && result.value.success
    )
    .map(result => result.value.data)

  const failedResponses = responses
    .filter((result): result is PromiseRejectedResult | PromiseFulfilledResult<{ success: false; error: string }> => 
      result.status === "rejected" || 
      (result.status === "fulfilled" && !result.value.success)
    )

  return {
    success: true,
    data: {
      responses: successfulResponses,
      failures: failedResponses.length,
      total: agentIds.length
    }
  }
}

/**
 * Test AI integration
 */
export async function testAIIntegration() {
  try {
    const zaiClient = getZAIClient()
    const testResult = await zaiClient.testConnection()

    return {
      success: testResult.success,
      message: testResult.message
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    }
  }
}

/**
 * Get AI usage statistics
 */
export async function getAIUsageStats(userId: string) {
  try {
    // Get total messages sent by user
    const totalMessages = await prisma.message.count({
      where: {
        room: {
          participants: {
            some: { userId }
          }
        },
        type: "USER"
      }
    })

    // Get total AI responses
    const totalAIResponses = await prisma.message.count({
      where: {
        room: {
          participants: {
            some: { userId }
          }
        },
        type: "AGENT"
      }
    })

    // Get agent usage counts
    const agentUsage = await prisma.agent.findMany({
      where: {
        createdBy: userId
      },
      select: {
        id: true,
        name: true,
        emoji: true,
        usageCount: true
      },
      orderBy: {
        usageCount: "desc"
      },
      take: 10
    })

    return {
      success: true,
      data: {
        totalMessages,
        totalAIResponses,
        agentUsage,
        aiResponseRate: totalMessages > 0 ? (totalAIResponses / totalMessages) * 100 : 0
      }
    }
  } catch (error) {
    console.error("Error getting AI usage stats:", error)
    return {
      success: false,
      error: "Failed to get AI usage statistics"
    }
  }
}

/**
 * Test vector database integration
 */
export async function testVectorDatabase() {
  try {
    const vectorStore = getVectorStore()
    const result = await vectorStore.testConnection()
    
    // Also test embedding service
    const { getEmbeddingService } = await import("../embeddings")
    const embeddingService = getEmbeddingService()
    const embeddingResult = await embeddingService.testConnection()
    
    return {
      success: result.success && embeddingResult.success,
      message: `Vector DB: ${result.message} | Embeddings: ${embeddingResult.message}`
    }
  } catch (error) {
    return {
      success: false,
      message: `Vector DB error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Get vector database statistics
 */
export async function getVectorDatabaseStats() {
  try {
    const vectorStore = getVectorStore()
    const stats = await vectorStore.getStats()
    
    return {
      success: true,
      data: stats
    }
  } catch (error) {
    return {
      success: false,
      error: "Failed to get vector database statistics"
    }
  }
}

/**
 * Get AI model information
 */
export async function getAIModelInfo() {
  try {
    // This would be enhanced with actual model info from Z.ai API
    // For now, return known model information
    const models = [
      {
        id: "glm-4.6",
        name: "GLM-4.6",
        description: "Latest flagship model with advanced reasoning capabilities",
        maxTokens: 128000,
        supportsTools: true,
        supportsVision: false
      },
      {
        id: "glm-4.5",
        name: "GLM-4.5",
        description: "High-performance model with balanced capabilities",
        maxTokens: 96000,
        supportsTools: true,
        supportsVision: false
      },
      {
        id: "glm-4.5-flash",
        name: "GLM-4.5 Flash",
        description: "Fast and efficient model for quick responses",
        maxTokens: 8000,
        supportsTools: false,
        supportsVision: false
      },
      {
        id: "glm-4.5-air",
        name: "GLM-4.5 Air",
        description: "Lightweight model optimized for speed",
        maxTokens: 8000,
        supportsTools: false,
        supportsVision: false
      }
    ]

    return {
      success: true,
      data: {
        currentModel: process.env.ZAI_MODEL || "glm-4.5-flash",
        availableModels: models
      }
    }
  } catch (error) {
    return {
      success: false,
      error: "Failed to get AI model information"
    }
  }
}
