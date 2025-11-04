"use server"

import { getVectorStore } from "@/lib/vector-store"
import { getEmbeddingService } from "@/lib/embeddings"

/**
 * Test vector database setup and functionality
 */
export async function testVectorSetup() {
  try {
    // Initialize vector store
    const vectorStore = getVectorStore()
    
    // Test connection
    const connectionResult = await vectorStore.testConnection()
    
    // Initialize collection
    await vectorStore.initializeCollection()
    
    // Test embedding service
    const embeddingService = getEmbeddingService()
    const embeddingResult = await embeddingService.testConnection()
    
    // Test embedding generation
    const testEmbedding = await embeddingService.generateEmbedding("test message for vector database")
    
    const stats = await vectorStore.getStats()
    
    return {
      success: connectionResult.success && embeddingResult.success && testEmbedding.length > 0,
      data: {
        connection: connectionResult.message,
        embeddings: embeddingResult.message,
        embeddingDimensions: testEmbedding.length,
        stats
      }
    }
  } catch (error) {
    console.error("Vector setup test failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }
  }
}

/**
 * Test context retrieval
 */
export async function testContextRetrieval(roomId: string, query: string) {
  try {
    const vectorStore = getVectorStore()
    
    // Get relevant context
    const context = await vectorStore.getRelevantContext(roomId, query, 3)
    
    return {
      success: true,
      data: {
        roomId,
        query,
        contextCount: context.length,
        context: context.map((ctx, index) => ({
          rank: index + 1,
          author: ctx.author_name,
          content: ctx.content,
          timestamp: ctx.timestamp,
          score: ctx.score
        }))
      }
    }
  } catch (error) {
    console.error("Context retrieval test failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }
  }
}

/**
 * Test conversation history retrieval
 */
export async function testConversationHistory(roomId: string, limit: number = 10) {
  try {
    const vectorStore = getVectorStore()
    
    const history = await vectorStore.getConversationHistory(roomId, limit)
    
    return {
      success: true,
      data: {
        roomId,
        limit,
        messageCount: history.length,
        history: history.map((msg, index) => ({
          sequence: index + 1,
          author: msg.author_name,
          content: msg.content,
          type: msg.message_type,
          timestamp: msg.timestamp
        }))
      }
    }
  } catch (error) {
    console.error("Conversation history test failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }
  }
}

/**
 * Get vector database statistics
 */
export async function getVectorStats() {
  try {
    const vectorStore = getVectorStore()
    const stats = await vectorStore.getStats()
    
    return {
      success: true,
      data: stats
    }
  } catch (error) {
    console.error("Failed to get vector stats:", error)
    return {
      success: false,
      error: "Failed to get vector database statistics"
    }
  }
}
