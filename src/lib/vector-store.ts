/**
 * Qdrant Vector Store for Discux3
 * Handles conversation context storage and retrieval for AI agents
 * 
 * ID Mapping: Converts cuid2 IDs to UUID format for Qdrant compatibility
 */

import { QdrantClient } from '@qdrant/js-client-rest'
import { embedText, embedTexts, getEmbeddingDimension } from './embeddings'
import { getIdMapper } from './id-mapper'

interface VectorMessage {
  id: string
  room_id: string
  content: string
  author_name: string
  message_type: "user" | "agent" | "system"
  timestamp: string
}

interface SearchResult {
  id: string
  room_id: string
  content: string
  author_name: string
  message_type: string
  timestamp: string
  score: number
}

export class VectorStore {
  private client: QdrantClient
  private collectionName: string
  private enabled: boolean
  private idMapper = getIdMapper() // ID mapper for cuid2 <-> UUID conversion

  constructor() {
    const url = process.env.QDRANT_URL || "http://localhost:6333"
    const apiKey = process.env.QDRANT_API_KEY
    const enabled = process.env.VECTOR_DB_ENABLED === "true"
    
    if (!enabled) {
      this.client = null as any
      this.enabled = false
      this.collectionName = process.env.QDRANT_COLLECTION || "discux3_conversations"
      return
    }

    this.client = new QdrantClient({ url, apiKey })
    this.collectionName = process.env.QDRANT_COLLECTION || "discux3_conversations"
    this.enabled = enabled
  }

  /**
   * Initialize collection
   */
  async initializeCollection(): Promise<void> {
    if (!this.enabled) return

    try {
      // Get embedding dimension from Google service
      const embeddingDimension = getEmbeddingDimension()

      // Check if collection exists
      const collections = await this.client.getCollections()
      const exists = collections.collections.some((c: any) => c.name === this.collectionName)

      if (!exists) {
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: embeddingDimension, // Google embedding dimensions (768 for text-embedding-004)
            distance: "Cosine"
          }
        })
        console.log(`Created collection: ${this.collectionName} with dimension ${embeddingDimension}`)
      }
    } catch (error) {
      console.error("Error initializing collection:", error)
      throw error
    }
  }

  /**
   * Store a message in vector database
   * Converts cuid2 ID to UUID for Qdrant compatibility
   */
  async storeMessage(message: VectorMessage): Promise<void> {
    if (!this.enabled) return

    try {
      const embedding = await embedText(message.content)

      // Convert cuid2 to UUID for Qdrant
      const qdrantId = await this.idMapper.cuidToUuid(message.id)

      await this.client.upsert(this.collectionName, {
        points: [{
          id: qdrantId, // Use UUID instead of cuid2
          vector: embedding,
          payload: {
            cuid_id: message.id, // Keep original cuid2 for reference
            room_id: message.room_id,
            content: message.content,
            author_name: message.author_name,
            message_type: message.message_type,
            timestamp: message.timestamp
          }
        }]
      })
    } catch (error) {
      console.error("Error storing message:", error)
      // Don't throw error to avoid breaking chat functionality
    }
  }

  /**
   * Store multiple messages (batch operation)
   * Converts cuid2 IDs to UUIDs for Qdrant compatibility
   */
  async storeBatchMessages(messages: VectorMessage[]): Promise<void> {
    if (!this.enabled || messages.length === 0) return

    try {
      const texts = messages.map(m => m.content)
      const embeddings = await embedTexts(texts)
      
      // Batch convert cuid2 IDs to UUIDs
      const cuids = messages.map(m => m.id)
      const qdrantIds = await this.idMapper.batchCuidToUuid(cuids)

      const points = messages.map((message, index) => ({
        id: qdrantIds[index], // Use UUID instead of cuid2
        vector: embeddings[index],
        payload: {
          cuid_id: message.id, // Keep original cuid2 for reference
          room_id: message.room_id,
          content: message.content,
          author_name: message.author_name,
          message_type: message.message_type,
          timestamp: message.timestamp
        }
      }))

      await this.client.upsert(this.collectionName, { points: points as any })
    } catch (error) {
      console.error("Error storing batch messages:", error)
    }
  }

  /**
   * Get relevant context for AI response
   */
  async getRelevantContext(
    roomId: string, 
    query: string, 
    limit: number = 5
  ): Promise<SearchResult[]> {
    if (!this.enabled) return []

    try {
      const queryEmbedding = await embedText(query)

      const searchResult = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        filter: {
          must: [
            { key: "room_id", match: { value: roomId } }
          ]
        },
        limit: limit,
        with_payload: true
      })

      return (searchResult as any).map((point: any) => ({
        id: point.payload?.cuid_id || point.id as string, // Use original cuid2 if available
        room_id: point.payload?.room_id as string,
        content: point.payload?.content as string,
        author_name: point.payload?.author_name as string,
        message_type: point.payload?.message_type as "user" | "agent" | "system",
        timestamp: point.payload?.timestamp as string,
        score: point.score || 0
      }))
    } catch (error) {
      console.error("Error searching context:", error)
      return []
    }
  }

  /**
   * Get conversation history for a room
   */
  async getConversationHistory(
    roomId: string, 
    limit: number = 20
  ): Promise<SearchResult[]> {
    if (!this.enabled) return []

    try {
      const searchResult = await this.client.scroll(this.collectionName, {
        filter: {
          must: [
            { key: "room_id", match: { value: roomId } }
          ]
        },
        limit: limit,
        with_payload: true
      })

      return (searchResult as any).points.map((point: any) => ({
        id: point.payload?.cuid_id || point.id as string, // Use original cuid2 if available
        room_id: point.payload?.room_id as string,
        content: point.payload?.content as string,
        author_name: point.payload?.author_name as string,
        message_type: point.payload?.message_type as "user" | "agent" | "system",
        timestamp: point.payload?.timestamp as string,
        score: 1.0
      })).reverse() // Reverse to get chronological order
    } catch (error) {
      console.error("Error getting conversation history:", error)
      return []
    }
  }

  /**
   * Delete old messages (cleanup)
   */
  async cleanupOldMessages(roomId: string, olderThanDays: number = 30): Promise<void> {
    if (!this.enabled) return

    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

      await this.client.delete(this.collectionName, {
        filter: {
          must: [
            { key: "room_id", match: { value: roomId } },
            { key: "timestamp", range: { lt: cutoffDate.toISOString() } }
          ]
        }
      })
    } catch (error) {
      console.error("Error cleaning up old messages:", error)
    }
  }

  /**
   * Get vector database statistics
   */
  async getStats(): Promise<{ enabled: boolean; collection: string; total_points: number }> {
    if (!this.enabled) {
      return {
        enabled: false,
        collection: this.collectionName,
        total_points: 0
      }
    }

    try {
      const collectionInfo = await this.client.getCollection(this.collectionName)
      return {
        enabled: true,
        collection: this.collectionName,
        total_points: collectionInfo.points_count || 0
      }
    } catch (error) {
      return {
        enabled: true,
        collection: this.collectionName,
        total_points: 0
      }
    }
  }

  /**
   * Test vector store connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.enabled) {
      return {
        success: false,
        message: "Vector database is disabled"
      }
    }

    try {
      await this.initializeCollection()
      const stats = await this.getStats()
      return {
        success: true,
        message: `Vector store connected. Collection: ${stats.collection}, Points: ${stats.total_points}`
      }
    } catch (error) {
      return {
        success: false,
        message: `Vector store error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

// Global vector store instance
let vectorStore: VectorStore | null = null

/**
 * Get or create vector store instance
 */
export function getVectorStore(): VectorStore {
  if (!vectorStore) {
    vectorStore = new VectorStore()
  }

  return vectorStore
}

/**
 * Reset vector store instance
 */
export function resetVectorStore(): void {
  vectorStore = null
}

/**
 * Helper functions for common operations
 */
export async function storeConversationMessage(
  roomId: string,
  messageId: string,
  content: string,
  authorName: string,
  messageType: "user" | "agent" | "system" = "user"
): Promise<void> {
  const store = getVectorStore()
  
  const vectorMessage: VectorMessage = {
    id: messageId,
    room_id: roomId,
    content,
    author_name: authorName,
    message_type: messageType,
    timestamp: new Date().toISOString()
  }

  await store.storeMessage(vectorMessage)
}

export async function getConversationContext(
  roomId: string,
  query: string,
  limit?: number
): Promise<SearchResult[]> {
  const store = getVectorStore()
  return store.getRelevantContext(roomId, query, limit)
}
