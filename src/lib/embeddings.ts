/**
 * Google Gemini Embeddings Service for Discux3
 * Handles text embedding generation for vector search
 */

interface EmbeddingOptions {
  model?: string
  taskType?: string
}

export class GoogleEmbeddingService {
  private apiKey: string
  private baseURL: string

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY
    
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY environment variable is not set")
    }

    this.apiKey = apiKey
    this.baseURL = "https://generativelanguage.googleapis.com/v1beta"
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseURL}/models/${options?.model || process.env.GOOGLE_EMBEDDING_MODEL || "text-embedding-004"}:embedContent?key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: {
            parts: [{
              text: text
            }]
          },
          taskType: options?.taskType || "RETRIEVAL_DOCUMENT"
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Google API error: ${response.status} - ${error}`)
      }

      const data = await response.json()
      return data.embedding.values
    } catch (error) {
      console.error("Error generating embedding:", error)
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  async generateBatchEmbeddings(texts: string[], options?: EmbeddingOptions): Promise<number[][]> {
    // Google doesn't support batch embedding in single request, so we'll process them sequentially
    const results: number[][] = []
    
    for (const text of texts) {
      try {
        const embedding = await this.generateEmbedding(text, options)
        results.push(embedding)
      } catch (error) {
        console.error("Error generating embedding for text:", text, error)
        // Add empty embedding to maintain order
        results.push([])
      }
    }

    return results
  }

  /**
   * Test embedding service
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.generateEmbedding("test message")
      return {
        success: true,
        message: "Google Gemini embeddings service working correctly"
      }
    } catch (error) {
      return {
        success: false,
        message: `Google embeddings service error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Get embedding dimension for the current model
   */
  getEmbeddingDimension(): number {
    const model = process.env.GOOGLE_EMBEDDING_MODEL || "text-embedding-004"
    
    // Google embedding models dimensions
    const dimensions: Record<string, number> = {
      "text-embedding-004": 768,
      "text-multilingual-embedding-002": 768
    }
    
    return dimensions[model] || 768
  }
}

// Global embedding service instance
let embeddingService: GoogleEmbeddingService | null = null

/**
 * Get or create embedding service instance
 */
export function getEmbeddingService(): GoogleEmbeddingService {
  if (!embeddingService) {
    embeddingService = new GoogleEmbeddingService()
  }

  return embeddingService
}

/**
 * Reset embedding service instance
 */
export function resetEmbeddingService(): void {
  embeddingService = null
}

/**
 * Helper function to generate embedding
 */
export async function embedText(text: string): Promise<number[]> {
  const service = getEmbeddingService()
  return service.generateEmbedding(text)
}

/**
 * Helper function to generate batch embeddings
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const service = getEmbeddingService()
  return service.generateBatchEmbeddings(texts)
}

/**
 * Get embedding dimension for current model
 */
export function getEmbeddingDimension(): number {
  const service = getEmbeddingService()
  return service.getEmbeddingDimension()
}
