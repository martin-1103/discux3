# Performance Optimization

## 🔒 Security & Performance Measures

### Security Measures
1. **Authentication**: NextAuth.js dengan secure session management
2. **Authorization**: Room-based access control
3. **Input Validation**: Zod schemas untuk API validation
4. **Rate Limiting**: Prevent API abuse
5. **CORS**: Proper cross-origin configuration
6. **Environment Variables**: Secure configuration management

## ⚡ Database Performance Optimization

### Strategic Indexing
```sql
-- Primary performance indexes
CREATE INDEX idx_room_timestamp ON messages(room_id, timestamp DESC);
CREATE INDEX idx_sender_type ON messages(sender_id, type);
CREATE INDEX idx_user_rooms ON room_participants(user_id, room_id);
CREATE INDEX idx_room_agents ON room_agents(room_id, agent_id);
CREATE INDEX idx_agent_usage ON agents(usage_count DESC);
CREATE INDEX idx_user_subscription ON users(subscription, last_active);

-- Full-text search indexes
CREATE FULLTEXT INDEX idx_message_content ON messages(content);
CREATE FULLTEXT INDEX idx_agent_prompt ON agents(prompt);

-- Composite indexes for complex queries
CREATE INDEX idx_room_participants_role ON room_participants(room_id, role);
CREATE INDEX idx_message_sender_timestamp ON messages(sender_id, timestamp DESC);
CREATE INDEX idx_agent_created_usage ON agents(created_by, usage_count);
```

### Query Optimization
```typescript
// Optimized room message retrieval
async getRoomMessagesOptimized(roomId: string, limit: number = 50, offset: number = 0) {
  // Use index hints for consistent performance
  const query = `
    SELECT m.*,
           CASE
             WHEN m.type = 'user' THEN u.name
             WHEN m.type = 'agent' THEN a.name
             ELSE 'System'
           END as sender_name,
           CASE
             WHEN m.type = 'agent' THEN a.emoji
             ELSE '👤'
           END as sender_emoji
    FROM messages m
    LEFT JOIN users u ON m.type = 'user' AND m.sender_id = u.id
    LEFT JOIN agents a ON m.type = 'agent' AND m.sender_id = a.id
    WHERE m.room_id = ?
    ORDER BY m.timestamp DESC
    LIMIT ? OFFSET ?
  `;

  return await this.mysql.execute(query, [roomId, limit, offset]);
}

// Optimized user room listing with pagination
async getUserRoomsOptimized(userId: string, limit: number = 20, offset: number = 0) {
  const query = `
    SELECT DISTINCT r.*,
           rp.role as user_role,
           ra.agent_count,
           msg.message_count,
           msg.last_message_time
    FROM rooms r
    JOIN room_participants rp ON r.id = rp.room_id
    LEFT JOIN (
      SELECT room_id, COUNT(*) as agent_count
      FROM room_agents
      GROUP BY room_id
    ) ra ON r.id = ra.room_id
    LEFT JOIN (
      SELECT room_id, COUNT(*) as message_count, MAX(timestamp) as last_message_time
      FROM messages
      GROUP BY room_id
    ) msg ON r.id = msg.room_id
    WHERE rp.user_id = ?
    ORDER BY msg.last_message_time DESC, r.updated_at DESC
    LIMIT ? OFFSET ?
  `;

  return await this.mysql.execute(query, [userId, limit, offset]);
}

// Optimized agent performance analytics
async getAgentPerformanceStats(agentId: string, timeRange: number = 30) {
  const query = `
    SELECT
      COUNT(m.id) as total_messages,
      AVG(m.processing_time) as avg_processing_time,
      AVG(m.agent_confidence) as avg_confidence,
      COUNT(DISTINCT m.room_id) as unique_rooms,
      DATE(m.timestamp) as message_date
    FROM messages m
    WHERE m.sender_id = ?
      AND m.type = 'agent'
      AND m.timestamp >= DATE_SUB(NOW(), INTERVAL ? DAY)
    GROUP BY DATE(m.timestamp)
    ORDER BY message_date DESC
  `;

  return await this.mysql.execute(query, [agentId, timeRange]);
}
```

### Connection Pool Management
```typescript
// MySQL connection pool configuration
const mysqlPool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectionLimit: 20,        // Max connections in pool
  acquireTimeout: 60000,      // Max time to acquire connection
  timeout: 60000,             // Max time for query
  reconnect: true,            // Auto-reconnect on connection loss
  charset: 'utf8mb4',         // UTF-8 support
  timezone: '+00:00',         // UTC timezone
  multipleStatements: false,  // Security: prevent SQL injection
  flags: '+FOUND_ROWS'        // Efficient count queries
});

// Connection pool monitoring
setInterval(() => {
  const poolInfo = {
    totalConnections: mysqlPool._allConnections.length,
    freeConnections: mysqlPool._freeConnections.length,
    acquiringConnections: mysqlPool._acquiringConnections.length,
    connectionQueue: mysqlPool._connectionQueue.length
  };

  console.log('MySQL Pool Status:', poolInfo);

  // Alert if pool is under stress
  if (poolInfo.freeConnections < 2) {
    console.warn('MySQL connection pool running low on connections');
  }
}, 30000); // Check every 30 seconds
```

### Multi-tier Caching Strategy
```typescript
class OptimizedCacheService {
  private redis: Redis;
  private localCache = new Map();
  private cacheStats = {
    hits: 0,
    misses: 0,
    redisHits: 0,
    localHits: 0
  };

  // Multi-tier caching: Local → Redis → Database
  async getCachedRoom(roomId: string): Promise<Room | null> {
    // Try local cache first (fastest)
    const localKey = `room:${roomId}`;
    if (this.localCache.has(localKey)) {
      this.cacheStats.hits++;
      this.cacheStats.localHits++;
      return this.localCache.get(localKey);
    }

    // Try Redis cache (medium speed)
    const redisKey = `room:${roomId}:complete`;
    const cached = await this.redis.get(redisKey);
    if (cached) {
      this.cacheStats.hits++;
      this.cacheStats.redisHits++;
      const room = JSON.parse(cached);

      // Store in local cache for 5 minutes
      this.localCache.set(localKey, room);
      setTimeout(() => this.localCache.delete(localKey), 300000);

      return room;
    }

    // Fetch from database (slowest)
    this.cacheStats.misses++;
    return null;
  }

  async setCachedRoom(roomId: string, room: Room, ttl: number = 3600) {
    // Set in Redis with TTL
    await this.redis.setex(`room:${roomId}:complete`, ttl, JSON.stringify(room));

    // Set in local cache
    this.localCache.set(`room:${roomId}`, room);
    setTimeout(() => this.localCache.delete(`room:${roomId}`), 300000);
  }

  getCacheStats() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    return {
      hitRate: total > 0 ? (this.cacheStats.hits / total * 100).toFixed(2) + '%' : '0%',
      ...this.cacheStats
    };
  }
}
```

## 🚀 Real-time Performance

### WebSocket Optimization
```typescript
// Optimized Socket.io configuration
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
  compression: true
});

// Room-based message broadcasting optimization
class OptimizedMessageBroadcaster {
  private roomConnections = new Map<string, Set<string>>();

  async broadcastToRoom(roomId: string, event: string, data: any) {
    const connections = this.roomConnections.get(roomId);
    if (!connections || connections.size === 0) return;

    // Batch socket emissions for performance
    const sockets = Array.from(connections);
    const batchSize = 100;

    for (let i = 0; i < sockets.length; i += batchSize) {
      const batch = sockets.slice(i, i + batchSize);

      batch.forEach(socketId => {
        io.to(socketId).emit(event, data);
      });

      // Yield control to prevent blocking
      if (i + batchSize < sockets.length) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }
  }

  // Track room connections for optimization
  trackRoomConnection(roomId: string, socketId: string) {
    if (!this.roomConnections.has(roomId)) {
      this.roomConnections.set(roomId, new Set());
    }
    this.roomConnections.get(roomId)!.add(socketId);
  }

  removeRoomConnection(roomId: string, socketId: string) {
    const connections = this.roomConnections.get(roomId);
    if (connections) {
      connections.delete(socketId);
      if (connections.size === 0) {
        this.roomConnections.delete(roomId);
      }
    }
  }
}
```

### AI Request Optimization
```typescript
class AIOptimizer {
  private requestQueue = new Map<string, Promise<any>>();
  private rateLimiter = new Map<string, number[]>();

  // Deduplicate identical AI requests within time window
  async deduplicateRequest(
    agentId: string,
    context: string,
    message: string,
    windowMs: number = 5000
  ): Promise<string> {
    const key = `${agentId}:${this.hashContext(context)}:${this.hashContext(message)}`;

    // Check if same request is already in progress
    if (this.requestQueue.has(key)) {
      return this.requestQueue.get(key);
    }

    // Rate limiting per agent
    await this.checkRateLimit(agentId);

    // Create and cache the request
    const request = this.makeAIRequest(agentId, context, message);
    this.requestQueue.set(key, request);

    // Clean up after request completes
    request.finally(() => {
      setTimeout(() => this.requestQueue.delete(key), windowMs);
    });

    return request;
  }

  private async checkRateLimit(agentId: string, limit: number = 10, windowMs: number = 60000) {
    const now = Date.now();
    const requests = this.rateLimiter.get(agentId) || [];

    // Remove old requests outside time window
    const validRequests = requests.filter(time => now - time < windowMs);

    if (validRequests.length >= limit) {
      const oldestRequest = Math.min(...validRequests);
      const waitTime = windowMs - (now - oldestRequest);
      throw new Error(`Rate limit exceeded. Wait ${Math.ceil(waitTime/1000)} seconds`);
    }

    validRequests.push(now);
    this.rateLimiter.set(agentId, validRequests);
  }

  private hashContext(context: string): string {
    // Simple hash for deduplication
    return require('crypto').createHash('md5').update(context).digest('hex').substring(0, 8);
  }
}
```

## 🎨 Frontend Performance

### Component Optimization
```typescript
// Memoized message components for performance
const MemoizedMessageCard = React.memo(MessageCard, (prevProps, nextProps) => {
  // Only re-render if message content or mentions changed
  return prevProps.message.content === nextProps.message.content &&
         prevProps.message.id === nextProps.message.id &&
         JSON.stringify(prevProps.message.mentions) === JSON.stringify(nextProps.message.mentions);
});

// Virtual scrolling for large message lists
import { FixedSizeList as List } from 'react-window';

const MessageList = ({ messages, onLoadMore }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <MemoizedMessageCard message={messages[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={messages.length}
      itemSize={120}
      onItemsRendered={({ visibleStopIndex }) => {
        // Load more messages when nearing bottom
        if (visibleStopIndex >= messages.length - 5) {
          onLoadMore();
        }
      }}
    >
      {Row}
    </List>
  );
};
```

### API Response Optimization
```typescript
// Compressed API responses
class OptimizedAPIResponse {
  static compressMessage(message: Message) {
    return {
      id: message.id,
      content: message.content,
      type: message.type,
      sender: message.sender_name || message.sender_id,
      emoji: message.sender_emoji,
      timestamp: message.timestamp,
      mentions: message.mentions?.map(m => ({
        id: m.mentioned_agent_id,
        name: m.name,
        emoji: m.emoji
      })) || []
    };
  }

  // Batch multiple message updates
  static batchMessageUpdates(updates: MessageUpdate[]) {
    return {
      type: 'batch_update',
      updates: updates.map(update => ({
        messageId: update.messageId,
        changes: this.compressMessage(update.message)
      })),
      timestamp: Date.now()
    };
  }
}
```

## 📊 Performance Monitoring

### Real-time Performance Monitoring
```typescript
// Real-time performance monitoring
class PerformanceMonitor {
  private metrics = {
    queries: new Map<string, number[]>(),
    cacheHitRate: { hits: 0, misses: 0 },
    aiRequests: { count: 0, avgResponseTime: 0 },
    websocketConnections: 0
  };

  trackQuery(query: string, duration: number) {
    if (!this.metrics.queries.has(query)) {
      this.metrics.queries.set(query, []);
    }

    const times = this.metrics.queries.get(query)!;
    times.push(duration);

    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }

    // Alert on slow queries
    if (duration > 1000) {
      console.warn(`Slow query detected (${duration}ms):`, query);
    }
  }

  getPerformanceReport() {
    const queryStats = new Map();

    for (const [query, times] of this.metrics.queries) {
      queryStats.set(query, {
        count: times.length,
        avgTime: times.reduce((a, b) => a + b, 0) / times.length,
        maxTime: Math.max(...times),
        minTime: Math.min(...times)
      });
    }

    return {
      queries: Object.fromEntries(queryStats),
      cacheHitRate: this.metrics.cacheHitRate.hits /
        (this.metrics.cacheHitRate.hits + this.metrics.cacheHitRate.misses) * 100,
      aiRequests: this.metrics.aiRequests,
      websocketConnections: this.metrics.websocketConnections
    };
  }
}
```

### Database Performance Dashboard
```typescript
class DatabasePerformanceDashboard {
  async getPerformanceMetrics() {
    const queries = [
      'SHOW STATUS LIKE "Threads_connected"',
      'SHOW STATUS LIKE "Queries"',
      'SHOW STATUS LIKE "Slow_queries"',
      'SELECT COUNT(*) as total_messages FROM messages',
      'SELECT COUNT(*) as total_users FROM users',
      'SELECT AVG(processing_time) as avg_ai_response FROM messages WHERE type = "agent"'
    ];

    const results = await Promise.all(
      queries.map(query => this.mysql.execute(query))
    );

    return {
      connections: results[0][0][0]?.Value || 0,
      totalQueries: results[1][0][0]?.Value || 0,
      slowQueries: results[2][0][0]?.Value || 0,
      messageCount: results[3][0][0]?.total_messages || 0,
      userCount: results[4][0][0]?.total_users || 0,
      avgAIResponseTime: results[5][0][0]?.avg_ai_response || 0,
      timestamp: new Date().toISOString()
    };
  }

  async getSlowQueries(limit: number = 10) {
    const query = `
      SELECT query_time, lock_time, rows_sent, rows_examined, sql_text
      FROM mysql.slow_log
      ORDER BY query_time DESC
      LIMIT ?
    `;

    return await this.mysql.execute(query, [limit]);
  }
}
```

## 🛠️ Error Handling & Monitoring

### Global Error Handler
```typescript
class ErrorHandler {
  handle(error: Error, context: string): void {
    console.error(`[${context}] ${error.name}: ${error.message}`);

    // Send to monitoring service
    this.sendToMonitoring(error, context);

    // User-friendly error response
    this.notifyUser(error);
  }

  private async sendToMonitoring(error: Error, context: string): Promise<void> {
    // Integration dengan error monitoring service
    // (Sentry, LogRocket, etc.)
  }

  private notifyUser(error: Error): void {
    // Generate user-friendly error messages
    const userMessage = this.generateUserFriendlyMessage(error);
    // Send to client via WebSocket or API response
  }

  private generateUserFriendlyMessage(error: Error): string {
    const errorMap = {
      'ConnectionTimeoutError': 'Server is taking too long to respond. Please try again.',
      'ValidationError': 'Invalid input. Please check your data and try again.',
      'AuthenticationError': 'Please log in to continue.',
      'RateLimitError': 'Too many requests. Please wait and try again.',
      'DatabaseError': 'Database issue. Our team has been notified.'
    };

    return errorMap[error.constructor.name] || 'An unexpected error occurred. Please try again.';
  }
}
```

---

**Related Files:**
- [Architecture Overview](./overview.md) - System architecture and component relationships
- [Database Schema](./database-schema.md) - MySQL database design and interfaces
- [API Design](./api-design.md) - REST and WebSocket API specifications
- [AI Integration](./ai-integration.md) - AI services and performance optimization