# Vector Database Integration

## 🧠 Qdrant Vector Database Integration

### Configuration
```typescript
const QDRANT_CONFIG = {
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
  collections: {
    agent_memory: 'agent_memory',
    message_embeddings: 'message_embeddings',
    agent_knowledge: 'agent_knowledge'
  }
}
```

### Qdrant Service Implementation
```typescript
class QdrantService {
  private client: QdrantClient;

  constructor() {
    this.client = new QdrantClient({
      url: QDRANT_CONFIG.url,
      apiKey: QDRANT_CONFIG.apiKey,
    });
  }

  // Initialize collections if they don't exist
  async initializeCollections() {
    const collections = [
      {
        name: QDRANT_CONFIG.collections.agent_memory,
        vector_size: 1536, // OpenAI embedding size
        distance: 'Cosine'
      },
      {
        name: QDRANT_CONFIG.collections.message_embeddings,
        vector_size: 1536,
        distance: 'Cosine'
      },
      {
        name: QDRANT_CONFIG.collections.agent_knowledge,
        vector_size: 1536,
        distance: 'Cosine'
      }
    ];

    for (const collection of collections) {
      try {
        await this.client.getCollection(collection.name);
        console.log(`Collection ${collection.name} already exists`);
      } catch (error) {
        await this.client.createCollection(collection.name, {
          vectors: {
            size: collection.vector_size,
            distance: collection.distance
          }
        });
        console.log(`Created collection ${collection.name}`);
      }
    }
  }

  // Store agent memory vectors
  async storeAgentMemory(
    agentId: string,
    conversationContext: string,
    embedding: number[],
    metadata: any
  ) {
    await this.client.upsert(QDRANT_CONFIG.collections.agent_memory, {
      points: [{
        id: `${agentId}_${Date.now()}`,
        vector: embedding,
        payload: {
          agent_id: agentId,
          context: conversationContext,
          timestamp: new Date().toISOString(),
          ...metadata
        }
      }]
    });
  }

  // Retrieve relevant agent memory
  async getAgentMemory(
    agentId: string,
    queryEmbedding: number[],
    limit: number = 5
  ) {
    const results = await this.client.search(QDRANT_CONFIG.collections.agent_memory, {
      vector: queryEmbedding,
      query_filter: {
        must: [
          { key: 'agent_id', match: { value: agentId } }
        ]
      },
      limit: limit,
      with_payload: true
    });

    return results.map(result => ({
      context: result.payload?.context,
      timestamp: result.payload?.timestamp,
      score: result.score,
      metadata: result.payload
    }));
  }

  // Store message embeddings for semantic search
  async storeMessageEmbedding(
    messageId: string,
    content: string,
    embedding: number[],
    roomId: string,
    senderId: string
  ) {
    await this.client.upsert(QDRANT_CONFIG.collections.message_embeddings, {
      points: [{
        id: messageId,
        vector: embedding,
        payload: {
          message_id: messageId,
          content_preview: content.substring(0, 200),
          room_id: roomId,
          sender_id: senderId,
          timestamp: new Date().toISOString()
        }
      }]
    });
  }

  // Semantic search across messages
  async searchMessages(
    queryEmbedding: number[],
    roomId?: string,
    limit: number = 10
  ) {
    const filter = roomId ? {
      must: [
        { key: 'room_id', match: { value: roomId } }
      ]
    } : undefined;

    const results = await this.client.search(QDRANT_CONFIG.collections.message_embeddings, {
      vector: queryEmbedding,
      query_filter: filter,
      limit: limit,
      with_payload: true
    });

    return results.map(result => ({
      message_id: result.payload?.message_id,
      content_preview: result.payload?.content_preview,
      room_id: result.payload?.room_id,
      sender_id: result.payload?.sender_id,
      timestamp: result.payload?.timestamp,
      score: result.score
    }));
  }

  // Store agent knowledge base
  async storeAgentKnowledge(
    agentId: string,
    documentId: string,
    chunkText: string,
    embedding: number[],
    source: string
  ) {
    await this.client.upsert(QDRANT_CONFIG.collections.agent_knowledge, {
      points: [{
        id: `${agentId}_${documentId}_${Date.now()}`,
        vector: embedding,
        payload: {
          agent_id: agentId,
          document_id: documentId,
          chunk_text: chunkText,
          source: source,
          timestamp: new Date().toISOString()
        }
      }]
    });
  }

  // Retrieve agent knowledge
  async getAgentKnowledge(
    agentId: string,
    queryEmbedding: number[],
    limit: number = 5
  ) {
    const results = await this.client.search(QDRANT_CONFIG.collections.agent_knowledge, {
      vector: queryEmbedding,
      query_filter: {
        must: [
          { key: 'agent_id', match: { value: agentId } }
        ]
      },
      limit: limit,
      with_payload: true
    });

    return results.map(result => ({
      chunk_text: result.payload?.chunk_text,
      source: result.payload?.source,
      document_id: result.payload?.document_id,
      score: result.score
    }));
  }
}
```

## 🔄 Enhanced AI Service with Qdrant Integration

### Context-Aware AI Service
```typescript
class EnhancedAIService extends AIService {
  private qdrantService: QdrantService;
  private embeddingService: EmbeddingService;

  constructor() {
    super();
    this.qdrantService = new QdrantService();
    this.embeddingService = new EmbeddingService();
  }

  async generateContextAwareAgentResponse(
    agent: Agent,
    messages: Message[],
    newMessage: string
  ): Promise<string> {
    // Generate embedding for new message
    const messageEmbedding = await this.embeddingService.generateEmbedding(newMessage);

    // Retrieve relevant agent memory
    const agentMemory = await this.qdrantService.getAgentMemory(
      agent.id,
      messageEmbedding,
      3
    );

    // Retrieve relevant knowledge base
    const agentKnowledge = await this.qdrantService.getAgentKnowledge(
      agent.id,
      messageEmbedding,
      2
    );

    // Build enhanced context
    const context = this.buildEnhancedContext(
      messages,
      agentMemory,
      agentKnowledge,
      newMessage
    );

    // Generate response with enhanced context
    const response = await this.generateAgentResponse(agent, messages.slice(-5), newMessage);

    // Store this interaction in agent memory
    await this.qdrantService.storeAgentMemory(
      agent.id,
      `User: ${newMessage}\nAssistant: ${response}`,
      await this.embeddingService.generateEmbedding(`User: ${newMessage}\nAssistant: ${response}`),
      {
        user_message: newMessage,
        agent_response: response,
        room_context: messages.slice(-3).map(m => m.content).join('\n')
      }
    );

    return response;
  }

  private buildEnhancedContext(
    recentMessages: Message[],
    agentMemory: any[],
    agentKnowledge: any[],
    newMessage: string
  ): string {
    const recentContext = recentMessages
      .slice(-3)
      .map(m => `${m.sender_id}: ${m.content}`)
      .join('\n');

    const memoryContext = agentMemory
      .map(mem => `Previous relevant context: ${mem.context}`)
      .join('\n');

    const knowledgeContext = agentKnowledge
      .map(know => `Reference: ${know.chunk_text} (Source: ${know.source})`)
      .join('\n');

    return `Recent conversation:\n${recentContext}\n\n${memoryContext}\n\n${knowledgeContext}\n\nNew message: ${newMessage}`;
  }
}
```

## 🔍 Hybrid Search Implementation

### Combined SQL + Vector Search
```typescript
class HybridSearchService {
  async searchWithContext(
    query: string,
    roomId?: string,
    userId?: string
  ) {
    // Generate query embedding
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    // Parallel search: SQL + Vector
    const [sqlResults, vectorResults] = await Promise.all([
      // SQL-based exact matches
      this.mysqlSearch(query, roomId, userId),
      // Vector-based semantic search
      this.qdrantService.searchMessages(queryEmbedding, roomId, 10)
    ]);

    // Merge and rank results
    return this.mergeSearchResults(sqlResults, vectorResults);
  }

  private async mysqlSearch(query: string, roomId?: string, userId?: string) {
    let sql = `
      SELECT m.*, u.name as sender_name, a.name as agent_name
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      LEFT JOIN agents a ON m.sender_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (roomId) {
      sql += ` AND m.room_id = ?`;
      params.push(roomId);
    }

    if (userId) {
      sql += ` AND m.sender_id = ?`;
      params.push(userId);
    }

    sql += ` AND m.content LIKE ? ORDER BY m.timestamp DESC LIMIT 20`;
    params.push(`%${query}%`);

    return await this.mysql.query(sql, params);
  }

  private mergeSearchResults(sqlResults: any[], vectorResults: any[]) {
    const mergedResults = new Map();

    // Add SQL results with exact match bonus
    sqlResults.forEach(result => {
      mergedResults.set(result.id, {
        ...result,
        score: 1.0,
        match_type: 'exact'
      });
    });

    // Add/merge vector results
    vectorResults.forEach(result => {
      if (mergedResults.has(result.message_id)) {
        const existing = mergedResults.get(result.message_id);
        existing.score = Math.max(existing.score, result.score * 0.8);
        existing.match_type = 'hybrid';
      } else {
        mergedResults.set(result.message_id, {
          ...result,
          score: result.score * 0.8,
          match_type: 'semantic'
        });
      }
    });

    return Array.from(mergedResults.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }
}
```

### Semantic Search Examples
```typescript
class SemanticSearchExamples {
  // Find similar conversations
  async findSimilarConversations(messageId: string, limit: number = 5) {
    const message = await this.getMessage(messageId);
    const embedding = await this.embeddingService.generateEmbedding(message.content);

    return await this.qdrantService.searchMessages(embedding, message.room_id, limit);
  }

  // Agent expertise search
  async searchByExpertise(agentId: string, topic: string, limit: number = 10) {
    const embedding = await this.embeddingService.generateEmbedding(topic);

    return await this.qdrantService.getAgentKnowledge(agentId, embedding, limit);
  }

  // Cross-room topic search
  async searchTopicAcrossRooms(topic: string, userId: string, limit: number = 20) {
    const embedding = await this.embeddingService.generateEmbedding(topic);

    // Get all rooms for user
    const userRooms = await this.getUserRooms(userId);
    const results = [];

    for (const room of userRooms) {
      const roomResults = await this.qdrantService.searchMessages(
        embedding,
        room.id,
        Math.ceil(limit / userRooms.length)
      );
      results.push(...roomResults);
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // Memory-based conversation continuity
  async getConversationalContext(agentId: string, currentMessage: string) {
    const embedding = await this.embeddingService.generateEmbedding(currentMessage);

    // Get relevant past interactions
    const relevantMemory = await this.qdrantService.getAgentMemory(agentId, embedding, 3);

    return relevantMemory.map(mem => ({
      context: mem.context,
      timestamp: mem.timestamp,
      relevance: mem.score
    }));
  }
}
```

## 📚 Knowledge Base Management

### Document Ingestion
```typescript
class KnowledgeBaseManager {
  async ingestDocument(
    agentId: string,
    documentUrl: string,
    documentType: 'pdf' | 'text' | 'webpage'
  ) {
    // Extract text content
    const content = await this.extractContent(documentUrl, documentType);

    // Split into chunks
    const chunks = this.splitIntoChunks(content, 500); // 500 character chunks

    // Generate embeddings for each chunk
    const embeddingPromises = chunks.map(chunk =>
      this.embeddingService.generateEmbedding(chunk)
    );

    const embeddings = await Promise.all(embeddingPromises);

    // Store in Qdrant
    for (let i = 0; i < chunks.length; i++) {
      await this.qdrantService.storeAgentKnowledge(
        agentId,
        `${documentUrl}_chunk_${i}`,
        chunks[i],
        embeddings[i],
        documentUrl
      );
    }

    return {
      documentId: documentUrl,
      chunksProcessed: chunks.length,
      agentId
    };
  }

  private splitIntoChunks(text: string, chunkSize: number): string[] {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, i + chunkSize));
    }
    return chunks;
  }

  private async extractContent(url: string, type: string): Promise<string> {
    switch (type) {
      case 'pdf':
        return await this.extractPDFContent(url);
      case 'text':
        return await this.fetchTextContent(url);
      case 'webpage':
        return await this.extractWebpageContent(url);
      default:
        throw new Error(`Unsupported document type: ${type}`);
    }
  }
}
```

### Memory Management
```typescript
class AgentMemoryManager {
  async cleanupOldMemory(agentId: string, daysToKeep: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // This would need to be implemented in Qdrant
    // using date-based filtering and deletion
    console.log(`Cleaning up memory for agent ${agentId} older than ${cutoffDate}`);
  }

  async getMemoryStatistics(agentId: string) {
    // Get memory usage statistics
    return {
      totalMemories: 0, // Would query Qdrant
      oldestMemory: new Date(),
      newestMemory: new Date(),
      averageRelevanceScore: 0.0
    };
  }

  async exportAgentMemory(agentId: string) {
    // Export all memory for backup or analysis
    const memories = await this.qdrantService.getAgentMemory(
      agentId,
      new Array(1536).fill(0), // Zero vector to get all
      1000
    );

    return {
      agentId,
      exportDate: new Date().toISOString(),
      memories: memories.map(mem => ({
        context: mem.context,
        timestamp: mem.timestamp,
        metadata: mem.metadata
      }))
    };
  }
}
```

## ⚡ Performance Optimization

### Batch Operations
```typescript
class BatchQdrantOperations {
  async batchStoreMessageEmbeddings(messages: Message[]) {
    const points = await Promise.all(
      messages.map(async (message) => {
        const embedding = await this.embeddingService.generateEmbedding(message.content);

        return {
          id: message.id,
          vector: embedding,
          payload: {
            message_id: message.id,
            content_preview: message.content.substring(0, 200),
            room_id: message.room_id,
            sender_id: message.sender_id,
            timestamp: message.timestamp
          }
        };
      })
    );

    await this.qdrantService.client.upsert('message_embeddings', { points });
  }

  async batchSearch(
    queries: string[],
    collection: string,
    limit: number = 5
  ) {
    const embeddings = await Promise.all(
      queries.map(query => this.embeddingService.generateEmbedding(query))
    );

    const searchPromises = embeddings.map(embedding =>
      this.qdrantService.client.search(collection, {
        vector: embedding,
        limit: limit,
        with_payload: true
      })
    );

    return await Promise.all(searchPromises);
  }
}
```

---

**Related Files:**
- [Architecture Overview](./overview.md) - System architecture and component relationships
- [AI Integration](./ai-integration.md) - AI services and agent response logic
- [Performance Optimization](./performance-optimization.md) - Vector database performance strategies
- [Migration & Deployment](./migration-deployment.md) - Vector database migration and setup