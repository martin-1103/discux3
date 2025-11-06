"use server"

import { getZAIClient } from "@/lib/zai"
import { prisma } from "@/lib/db"
import { createAgentMessage } from "./messages"
import { getConversationContext, getVectorStore, storeConversationMessage } from "../vector-store"
import logger from "@/lib/logger"
import { generateCorrelationId } from "@/lib/logger"
import { debugLog } from "@/lib/utils/debug-logger"

// Truth Teller Enhancement - ensure Indonesian language compliance for all agents
const TRUTH_TELLER_ENHANCEMENT = `
Communication Style:
- Berbahasa Indonesia dalam semua response
- Singkat, padat, jelas, to the point
- Tidak bertele-tele kecuali user minta detail
- Brutally honest, no sugar-coating
- Langsung ke inti masalah
- Focus pada solusi yang actionable
`

/**
 * Clean message content by removing agent metadata and mentions
 */
function cleanMessageContent(content: string): string {
  // Remove [AGENT:...] prefixes if present
  let cleaned = content.replace(/^\[AGENT:[^\]]*\]\n/, '').trim()
  // Remove @mentions for AI processing
  cleaned = cleaned.replace(/@([^\s]+)/g, '').trim()
  return cleaned
}

/**
 * Generate AI response for an agent in a room
 */
export async function generateAgentResponse(
  agentId: string,
  roomId: string,
  userMessage: string,
  userId: string,
  userName?: string
) {
  const correlationId = generateCorrelationId()
  const startTime = Date.now()

  logger.aiRequest(correlationId, {
    endpoint: 'generateAgentResponse',
    agentId,
    roomId,
    userId,
    userName,
    userMessageLength: userMessage.length,
    userMessagePreview: userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : ''),
    purpose: 'Agent response generation'
  })

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
      const error = new Error("Agent not found")
      logger.aiError(correlationId, 'Agent lookup failed', error, {
        agentId,
        roomId,
        userId
      })

      return {
        success: false,
        error: error.message
      }
    }

    // Use provided userName or fallback to a default
    const currentUser = { name: userName || "User" }

    // Get relevant context from vector database
    logger.aiContext(correlationId, {
      query: userMessage,
      purpose: 'Get conversation context',
      roomId
    })

    const relevantContext = await getConversationContext(roomId, userMessage, 5)

    logger.aiContext(correlationId, {
      query: userMessage,
      resultCount: relevantContext.length,
      contextUsed: relevantContext.length > 0,
      searchDuration: Date.now() - startTime
    })

    // Build enhanced prompt with context and Indonesian language enhancement
    debugLog('AI', `Building prompt for agent: ${agent.name}`)

    // Use agent's base prompt from database
    let basePrompt = agent.prompt
    debugLog('AI', `Base prompt: "${basePrompt}"`)
    debugLog('AI', `Base prompt length: ${basePrompt.length} chars`)

    // Apply truth teller enhancement for all agents
    basePrompt += "\n\n" + TRUTH_TELLER_ENHANCEMENT
    debugLog('AI', `Adding Indonesian language enhancement: "${TRUTH_TELLER_ENHANCEMENT}"`)
    debugLog('AI', `Final prompt with enhancement length: ${basePrompt.length} chars`)

    let enhancedPrompt = basePrompt
    let contextLines = ''

    if (relevantContext.length > 0) {
      contextLines = relevantContext.map((ctx: any) =>
        `[${new Date(ctx.timestamp).toLocaleTimeString()}] ${ctx.author_name}: ${cleanMessageContent(ctx.content)}`
      ).join('\n')

      enhancedPrompt = `${basePrompt}

Recent conversation in this room:
${contextLines}

Current message: ${currentUser?.name || "Anonymous"}: ${userMessage}

Please respond considering who is asking and the conversation flow.`
    }

    debugLog('AI', `Final complete prompt for ${agent.name}:`, {
      totalLength: enhancedPrompt.length,
      hasIndonesianInstruction: enhancedPrompt.includes('Berbahasa Indonesia'),
      contextSections: {
        basePrompt: basePrompt.length,
        contextLines: relevantContext.length > 0 ? contextLines.length : 0,
        userMessage: userMessage.length
      }
    })
    debugLog('AI', `Full prompt content: "${enhancedPrompt}"`)

    // Generate response using Z.ai with enhanced prompt
    const zaiClient = getZAIClient()
    const response = await zaiClient.generateAgentResponse(
      enhancedPrompt,
      agent.style,
      userMessage,
      [], // No need for manual conversation history with vector context
      userId
    )

    logger.aiResponse(correlationId, {
      status: 200,
      statusText: 'Agent response generated successfully',
      duration: Date.now() - startTime,
      model: response.model,
      usage: response.usage,
      processingTime: response.processingTime,
      contextLength: relevantContext.length,
      promptLength: enhancedPrompt.length
    })

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
      const error = new Error("Failed to create agent message")
      logger.aiError(correlationId, 'Message creation failed', error, {
        agentId: agent.id,
        agentName: agent.name,
        roomId,
        responseLength: response.content.length
      })

      return {
        success: false,
        error: error.message
      }
    }

    const totalProcessingTime = Date.now() - startTime

    logger.aiIntent(correlationId, {
      query: userMessage,
      intent: {
        agentName: agent.name,
        agentStyle: agent.style,
        responseGenerated: true,
        contextUsed: relevantContext.length > 0,
        totalProcessingTime
      },
      confidence: 0.9,
      fallback: false
    })

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
    const processingTime = Date.now() - startTime

    // Replace console.error with proper logging
    logger.aiError(correlationId, 'Agent response generation failed', error instanceof Error ? error : new Error(String(error)), {
      agentId,
      roomId,
      userId,
      userMessageLength: userMessage.length,
      processingTime
    })

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate agent response"
    }
  }
}

/**
 * Batch generate responses for multiple agents mentioned in a message (SEQUENTIAL)
 * Processes agents one by one to create natural discussion flow
 */
export async function generateBatchAgentResponses(
  agentIds: string[],
  roomId: string,
  userMessage: string,
  userId: string
) {
  const correlationId = generateCorrelationId()
  const startTime = Date.now()

  logger.aiRequest(correlationId, {
    endpoint: 'generateBatchAgentResponses',
    roomId,
    userId,
    agentCount: agentIds.length,
    userMessageLength: userMessage.length,
    userMessagePreview: userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : ''),
    processingType: 'sequential',
    purpose: 'Batch agent response generation'
  })

  const responses = []
  const failedResponses = []

  // Process agents sequentially for natural discussion flow
  for (let i = 0; i < agentIds.length; i++) {
    const agentId = agentIds[i]

    try {
      logger.aiRequest(`${correlationId}_agent_${i}`, {
        endpoint: 'batchResponse',
        agentId,
        sequenceNumber: i + 1,
        totalAgents: agentIds.length,
        purpose: `Generate response for agent ${i + 1}/${agentIds.length}`
      })

      // Generate response for current agent
      const result = await generateAgentResponse(agentId, roomId, userMessage, userId)

      if (result.success) {
        responses.push(result.data)

        // Store the agent response in vector store immediately for next agents to use
        if (result.data?.message) {
          await storeConversationMessage(
            roomId,
            result.data.message.id,
            result.data.message.content,
            result.data.agent.name,
            "agent"
          )

          logger.aiContext(`${correlationId}_agent_${i}`, {
            query: userMessage,
            purpose: 'Store agent response in vector store',
            agentName: result.data.agent.name,
            storedForContext: true
          })
        }
      } else {
        failedResponses.push({
          agentId,
          error: result.error || "Unknown error"
        })

        logger.aiError(`${correlationId}_agent_${i}`, 'Batch agent response failed', new Error(result.error || "Unknown error"), {
          agentId,
          sequenceNumber: i + 1,
          totalAgents: agentIds.length
        })
      }

      // Small delay between agents to feel more natural (optional)
      await new Promise(resolve => setTimeout(resolve, 500))

    } catch (error) {
      failedResponses.push({
        agentId,
        error: error instanceof Error ? error.message : "Unknown error"
      })

      logger.aiError(`${correlationId}_agent_${i}`, 'Unexpected error in batch processing', error instanceof Error ? error : new Error(String(error)), {
        agentId,
        sequenceNumber: i + 1,
        totalAgents: agentIds.length
      })
    }
  }

  const totalProcessingTime = Date.now() - startTime

  logger.aiIntent(correlationId, {
    query: userMessage,
    intent: {
      batchProcessing: true,
      agentCount: agentIds.length,
      successCount: responses.length,
      failureCount: failedResponses.length,
      processingType: 'sequential',
      totalProcessingTime
    },
    confidence: responses.length > 0 ? 0.8 : 0.2,
    fallback: failedResponses.length === agentIds.length
  })

  return {
    success: true,
    data: {
      responses: responses,
      failures: failedResponses.length,
      total: agentIds.length,
      processingType: "sequential" // Indicate sequential processing
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
  const correlationId = generateCorrelationId()

  logger.aiRequest(correlationId, {
    endpoint: 'getAIUsageStats',
    userId,
    purpose: 'Get AI usage statistics'
  })

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

    logger.aiResponse(correlationId, {
      status: 200,
      statusText: 'Usage statistics retrieved successfully',
      stats: {
        totalMessages,
        totalAIResponses,
        agentCount: agentUsage.length,
        aiResponseRate: totalMessages > 0 ? (totalAIResponses / totalMessages) * 100 : 0
      }
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
    logger.aiError(correlationId, 'Failed to get AI usage statistics', error instanceof Error ? error : new Error(String(error)), {
      userId
    })

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

/**
 * Test vector context retrieval
 */
export async function testVectorContext(roomId: string, query: string) {
  try {
    const vectorStore = getVectorStore()
    const context = await vectorStore.getRelevantContext(roomId, query, 3)

    return {
      success: true,
      data: {
        contextCount: context.length,
        context: context.map((ctx: any, index: number) => ({
          rank: index + 1,
          author: ctx.author_name,
          content: ctx.content,
          score: ctx.score,
          timestamp: ctx.timestamp
        }))
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to test vector context retrieval"
    }
  }
}

/**
 * Test vector conversation history
 */
export async function testVectorHistory(roomId: string) {
  try {
    const vectorStore = getVectorStore()
    const history = await vectorStore.getConversationHistory(roomId, 5)

    return {
      success: true,
      data: {
        messageCount: history.length,
        history: history.map((msg: any, index: number) => ({
          sequence: index + 1,
          author: msg.author_name,
          content: msg.content,
          type: msg.message_type,
          timestamp: msg.timestamp
        }))
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to test vector conversation history"
    }
  }
}
