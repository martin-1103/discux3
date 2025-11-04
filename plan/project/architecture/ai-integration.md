# AI Integration Architecture

## 🤖 Z.ai API Integration

### Configuration
```typescript
const ZAI_CONFIG = {
  apiKey: process.env.ZAI_API_KEY,
  model: "glm-4.6",
  baseURL: "https://api.z.ai/v1",
  timeout: 30000,
  maxRetries: 3
}
```

### Core AI Service
```typescript
class AIService {
  async generateAgentResponse(
    agent: Agent,
    context: Message[],
    message: string
  ): Promise<string> {
    const response = await fetch(`${ZAI_CONFIG.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ZAI_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: ZAI_CONFIG.model,
        messages: [
          { role: 'system', content: agent.prompt },
          { role: 'user', content: this.buildContextPrompt(context, message) }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`AI Service Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private buildContextPrompt(context: Message[], newMessage: string): string {
    const contextMessages = context
      .slice(-5) // Last 5 messages for context
      .map(msg => `${msg.sender_id}: ${msg.content}`)
      .join('\n');

    return `Recent conversation:\n${contextMessages}\n\nNew message: ${newMessage}`;
  }
}
```

### Enhanced AI Service with Retry Logic
```typescript
class EnhancedAIService extends AIService {
  async generateAgentResponseWithRetry(
    agent: Agent,
    context: Message[],
    message: string,
    maxRetries: number = 3
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const response = await this.generateAgentResponse(agent, context, message);
        const processingTime = (Date.now() - startTime) / 1000;

        // Log performance metrics
        this.logAgentPerformance(agent.id, processingTime, true, attempt);

        return response;
      } catch (error) {
        lastError = error as Error;
        console.warn(`AI Service attempt ${attempt} failed for agent ${agent.id}:`, error);

        // Exponential backoff
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }

        // Log failure
        this.logAgentPerformance(agent.id, 0, false, attempt);
      }
    }

    throw lastError || new Error('All AI service attempts failed');
  }

  private logAgentPerformance(
    agentId: string,
    processingTime: number,
    success: boolean,
    attempt: number
  ) {
    console.log(`Agent Performance: ${agentId}`, {
      processingTime,
      success,
      attempt,
      timestamp: new Date().toISOString()
    });
  }
}
```

## 🎯 Moderator Agent System

### Context Synthesis
```typescript
class ModeratorAgent {
  async synthesizeContext(
    room: Room,
    messages: Message[],
    mentionedAgents: Agent[]
  ): Promise<{ [agentId: string]: string }> {
    const context = this.extractKeyTopics(messages);
    const synthesis: { [agentId: string]: string } = {};

    for (const agent of mentionedAgents) {
      synthesis[agent.id] = await this.generateContextForAgent(
        agent,
        context,
        messages
      );
    }

    return synthesis;
  }

  private async generateContextForAgent(
    agent: Agent,
    context: string,
    messages: Message[]
  ): Promise<string> {
    // Customize context based on agent's expertise area
    const relevantMessages = this.filterRelevantMessages(agent, messages);

    return `Context for ${agent.name}:
Expertise: ${this.getAgentExpertise(agent)}
Recent relevant discussion: ${relevantMessages.map(m => m.content).join('. ')}
Key topics: ${context}
Please respond based on your expertise area.`;
  }

  private filterRelevantMessages(agent: Agent, messages: Message[]): Message[] {
    // Filter messages based on agent's style and expertise
    const keywords = this.getAgentKeywords(agent);

    return messages.filter(message => {
      const messageContent = message.content.toLowerCase();
      return keywords.some(keyword =>
        messageContent.includes(keyword.toLowerCase())
      );
    }).slice(-3); // Last 3 relevant messages
  }

  private getAgentExpertise(agent: Agent): string {
    const expertiseMap = {
      'professional': 'business strategy, planning, and professional advice',
      'direct': 'straightforward, actionable advice and solutions',
      'friendly': 'supportive guidance and encouragement',
      'creative': 'innovative thinking and creative problem-solving',
      'analytical': 'data-driven analysis and logical reasoning'
    };

    return expertiseMap[agent.style] || 'general advice and support';
  }

  private getAgentKeywords(agent: Agent): string[] {
    const keywordMap = {
      'professional': ['strategy', 'business', 'plan', 'goal', 'professional'],
      'direct': ['how', 'solution', 'action', 'step', 'directly'],
      'friendly': ['help', 'support', 'encourage', 'together', 'friendly'],
      'creative': ['idea', 'innovative', 'creative', 'imagine', 'design'],
      'analytical': ['analyze', 'data', 'logic', 'reason', 'evidence']
    };

    return keywordMap[agent.style] || ['help', 'advice', 'support'];
  }
}
```

### Agent Response Orchestration
```typescript
class AgentOrchestrator {
  private aiService: EnhancedAIService;
  private moderatorAgent: ModeratorAgent;

  constructor() {
    this.aiService = new EnhancedAIService();
    this.moderatorAgent = new ModeratorAgent();
  }

  async handleAgentMentions(
    message: Message,
    mentionedAgentIds: string[]
  ): Promise<void> {
    // Get agents information
    const agents = await this.getAgentsByIds(mentionedAgentIds);

    // Get recent message context
    const recentMessages = await this.getRecentMessages(message.room_id, 10);

    // Generate contextual synthesis for each agent
    const contextSynthesis = await this.moderatorAgent.synthesizeContext(
      await this.getRoom(message.room_id),
      recentMessages,
      agents
    );

    // Process agent responses in parallel
    const responsePromises = agents.map(async (agent) => {
      try {
        // Generate custom context for this agent
        const customContext = contextSynthesis[agent.id];

        // Create enhanced context with custom synthesis
        const enhancedContext = this.buildEnhancedContext(
          recentMessages,
          customContext,
          message.content
        );

        // Generate response
        const response = await this.aiService.generateAgentResponseWithRetry(
          agent,
          enhancedContext,
          message.content
        );

        // Create message record
        const agentMessage = await this.createAgentMessage({
          room_id: message.room_id,
          content: response,
          agent_id: agent.id,
          context_length: enhancedContext.length,
          processing_time: 0, // Will be filled by AI service
          agent_confidence: 0 // Will be calculated based on response
        });

        // Broadcast via WebSocket
        this.broadcastAgentResponse(agentMessage);

        return { success: true, agent: agent.name, response };
      } catch (error) {
        console.error(`Failed to generate response for agent ${agent.name}:`, error);
        return { success: false, agent: agent.name, error: error.message };
      }
    });

    // Wait for all responses
    const results = await Promise.allSettled(responsePromises);

    // Log results
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Agent ${agents[index].name} processing failed:`, result.reason);
      }
    });
  }

  private buildEnhancedContext(
    recentMessages: Message[],
    customContext: string,
    newMessage: string
  ): Message[] {
    // Create a synthetic message with custom context
    const contextMessage: Message = {
      id: 'context_synthesis',
      room_id: recentMessages[0]?.room_id || '',
      content: `Context for this response: ${customContext}`,
      type: 'system',
      sender_id: 'moderator',
      timestamp: new Date()
    };

    // Return context + recent messages + new message
    return [contextMessage, ...recentMessages.slice(-5)];
  }

  private async createAgentMessage(messageData: any): Promise<Message> {
    // Implementation for creating agent message in database
    // This would interact with your message service
    return {} as Message; // Placeholder
  }

  private broadcastAgentResponse(message: Message): void {
    // Implementation for broadcasting via WebSocket
    // This would interact with your WebSocket service
  }
}
```

## 🔧 Agent Style Configuration

### Style Templates
```typescript
interface AgentStyleTemplate {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  responsePattern: string;
}

const AGENT_STYLES: Record<string, AgentStyleTemplate> = {
  professional: {
    systemPrompt: `You are a professional advisor providing expert guidance.
    Your responses should be:
    - Well-structured and thoughtful
    - Based on established best practices
    - Practical and actionable
    - Professional in tone but approachable`,
    temperature: 0.7,
    maxTokens: 500,
    responsePattern: 'analytical → recommendation → next steps'
  },

  direct: {
    systemPrompt: `You provide direct, actionable advice without fluff.
    Your responses should be:
    - Straight to the point
    - Action-oriented
    - Clear and concise
    - Focused on practical solutions`,
    temperature: 0.5,
    maxTokens: 300,
    responsePattern: 'problem → solution → action items'
  },

  friendly: {
    systemPrompt: `You are a supportive and encouraging advisor.
    Your responses should be:
    - Warm and approachable
    - Encouraging and positive
    - Empathetic to user needs
    - Supportive while maintaining helpfulness`,
    temperature: 0.8,
    maxTokens: 400,
    responsePattern: 'empathy → support → encouragement'
  },

  creative: {
    systemPrompt: `You are a creative problem-solver and innovator.
    Your responses should be:
    - Innovative and original
    - Outside-the-box thinking
    - Imaginative and inspiring
    - Creative while remaining practical`,
    temperature: 0.9,
    maxTokens: 500,
    responsePattern: 'exploration → creativity → innovative solution'
  },

  analytical: {
    systemPrompt: `You are an analytical thinker who relies on data and logic.
    Your responses should be:
    - Data-driven and evidence-based
    - Logical and systematic
    - Thorough and well-reasoned
    - Objective and factual`,
    temperature: 0.4,
    maxTokens: 600,
    responsePattern: 'analysis → evidence → logical conclusion'
  }
};
```

### Dynamic Prompt Enhancement
```typescript
class PromptEnhancer {
  enhancePrompt(agent: Agent, context: string, message: string): string {
    const styleTemplate = AGENT_STYLES[agent.style];

    return `${styleTemplate.systemPrompt}

Agent Name: ${agent.name}
Agent Emoji: ${agent.emoji}

Current Context: ${context}

User Message: ${message}

Please respond in your ${agent.style} style, keeping your response within ${styleTemplate.maxTokens} tokens.
${this.getResponseGuidance(agent.style)}`;
  }

  private getResponseGuidance(style: string): string {
    const guidanceMap = {
      professional: "Structure your response with clear headings and actionable advice.",
      direct: "Provide the most direct solution or answer to the user's question.",
      friendly: "Start with an empathetic acknowledgment before providing help.",
      creative: "Think of multiple innovative approaches before settling on the best one.",
      analytical: "Break down the problem systematically before providing your analysis."
    };

    return guidanceMap[style] || "";
  }
}
```

## 📊 Agent Performance Monitoring

### Response Quality Metrics
```typescript
interface AgentMetrics {
  responseTime: number;
  confidence: number;
  relevanceScore: number;
  userFeedback: number;
  usageCount: number;
  errorRate: number;
}

class AgentPerformanceMonitor {
  private metrics = new Map<string, AgentMetrics[]>();

  recordResponse(
    agentId: string,
    responseTime: number,
    confidence: number,
    userFeedback?: number
  ) {
    if (!this.metrics.has(agentId)) {
      this.metrics.set(agentId, []);
    }

    const metrics: AgentMetrics = {
      responseTime,
      confidence,
      relevanceScore: this.calculateRelevanceScore(agentId),
      userFeedback: userFeedback || 0,
      usageCount: 1,
      errorRate: 0
    };

    const agentMetrics = this.metrics.get(agentId)!;
    agentMetrics.push(metrics);

    // Keep only last 100 records
    if (agentMetrics.length > 100) {
      agentMetrics.shift();
    }
  }

  getAverageMetrics(agentId: string): AgentMetrics | null {
    const agentMetrics = this.metrics.get(agentId);
    if (!agentMetrics || agentMetrics.length === 0) return null;

    const sum = agentMetrics.reduce((acc, metric) => ({
      responseTime: acc.responseTime + metric.responseTime,
      confidence: acc.confidence + metric.confidence,
      relevanceScore: acc.relevanceScore + metric.relevanceScore,
      userFeedback: acc.userFeedback + metric.userFeedback,
      usageCount: acc.usageCount + metric.usageCount,
      errorRate: acc.errorRate + metric.errorRate
    }));

    const count = agentMetrics.length;

    return {
      responseTime: sum.responseTime / count,
      confidence: sum.confidence / count,
      relevanceScore: sum.relevanceScore / count,
      userFeedback: sum.userFeedback / count,
      usageCount: sum.usageCount,
      errorRate: sum.errorRate / count
    };
  }

  private calculateRelevanceScore(agentId: string): number {
    // Implementation for calculating relevance based on response quality
    // This could analyze response length, keyword matching, etc.
    return Math.random() * 0.3 + 0.7; // Placeholder: 0.7-1.0 range
  }
}
```

---

**Related Files:**
- [Architecture Overview](./overview.md) - System architecture and component relationships
- [Vector Database](./vector-database.md) - Vector storage and semantic search integration
- [API Design](./api-design.md) - REST and WebSocket API specifications
- [Performance Optimization](./performance-optimization.md) - AI performance and optimization strategies