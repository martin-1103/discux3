/**
 * Z.ai API Client for Discux3
 * Handles chat completion requests with proper authentication and error handling
 */

interface ZAIMessage {
  role: "system" | "user" | "assistant" | "tool"
  content: string
  tool_calls?: Array<{
    id: string
    type: "function"
    function: {
      name: string
      arguments: string
    }
  }>
}

interface ZAIChatRequest {
  model: string
  messages: ZAIMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
  top_p?: number
  user_id?: string
  request_id?: string
}

interface ZAIChatResponse {
  id: string
  request_id: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
      reasoning_content?: string
      tool_calls?: Array<{
        id: string
        type: "function"
        function: {
          name: string
          arguments: string
        }
      }>
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    prompt_tokens_details?: {
      cached_tokens: number
    }
  }
  web_search?: Array<{
    title: string
    content: string
    link: string
    media: string
    icon: string
    refer: string
    publish_date: string
  }>
}

interface ZAIError {
  error: {
    message: string
    type: string
    code?: string
  }
}

export class ZAIClient {
  private apiKey: string
  private baseURL: string
  private defaultModel: string

  constructor(apiKey: string, options?: {
    baseURL?: string
    defaultModel?: string
  }) {
    this.apiKey = apiKey
    this.baseURL = options?.baseURL || "https://api.z.ai/api/paas/v4"
    this.defaultModel = options?.defaultModel || "glm-4.5-flash"
  }

  /**
   * Create a chat completion with Z.ai API
   */
  async createChatCompletion(request: ZAIChatRequest): Promise<ZAIChatResponse> {
    // Determine if using Anthropic-style endpoint (already includes full path)
    const isAnthropicStyle = this.baseURL.includes('/messages')
    const endpoint = isAnthropicStyle ? this.baseURL : `${this.baseURL}/chat/completions`

    // Build request payload based on API style
    const requestBody = isAnthropicStyle ? {
      model: request.model || this.defaultModel,
      messages: request.messages,
      max_tokens: request.max_tokens ?? 2000,
    } : {
      model: request.model || this.defaultModel,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens ?? 2000,
      stream: request.stream ?? false,
      top_p: request.top_p ?? 0.95,
      user_id: request.user_id,
      request_id: request.request_id,
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": "en-US,en",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`

      try {
        const errorData = await response.json()
        if (errorData.error?.message) {
          errorMessage = errorData.error.message
        } else if (errorData.message) {
          errorMessage = errorData.message
        } else if (typeof errorData === 'string') {
          errorMessage = errorData
        }
      } catch (e) {
        // Use default error message if JSON parsing fails
      }

      throw new Error(`Z.ai API Error: ${errorMessage}`)
    }

    return response.json()
  }

  /**
   * Generate agent response based on system prompt and user message
   */
  async generateAgentResponse(
    agentPrompt: string,
    agentStyle: string,
    userMessage: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    userId?: string
  ): Promise<{
    content: string
    model: string
    usage: {
      prompt_tokens: number
      completion_tokens: number
      total_tokens: number
    }
    processingTime?: number
  }> {
    const startTime = Date.now()

    // Build system message based on agent style
    const systemPrompt = this.buildSystemPrompt(agentPrompt, agentStyle)

    // Build messages array - Z.ai API doesn't support system role
    // so we prepend system prompt to the first user message
    const messages: ZAIMessage[] = [
      ...conversationHistory.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      })),
      {
        role: "user",
        content: systemPrompt ? `${systemPrompt}\n\nUser: ${userMessage}` : userMessage
      }
    ]

    try {
      const response = await this.createChatCompletion({
        model: this.defaultModel,
        messages,
        temperature: this.getTemperatureForStyle(agentStyle),
        max_tokens: this.getMaxTokensForStyle(agentStyle),
        user_id: userId,
        request_id: `discux3_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })

      const processingTime = Date.now() - startTime

      // Extract content from Z.AI API response
      // Check if response format is Anthropic-style or OpenAI-style
      let content: string
      let model: string
      let usage: any

      if (response.content && Array.isArray(response.content)) {
        // Anthropic API format
        content = response.content[0]?.text || "I apologize, but I couldn't generate a proper response."
        model = response.model
        usage = {
          prompt_tokens: response.usage?.input_tokens || 0,
          completion_tokens: response.usage?.output_tokens || 0,
          total_tokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
        }
      } else if (response.choices && response.choices[0]?.message) {
        // OpenAI API format
        const message = response.choices[0].message
        content = message.content || message.reasoning_content || "I apologize, but I couldn't generate a proper response."
        model = response.model
        usage = response.usage
      } else {
        // Fallback
        content = "I apologize, but I couldn't generate a proper response."
        model = "unknown"
        usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
      }

      return {
        content: content,
        model: model,
        usage: usage,
        processingTime
      }
    } catch (error) {
      console.error("Z.ai API Error:", error)

      // Check for specific error types
      let fallbackMessage = this.getFallbackResponse(agentStyle, userMessage)

      if (error instanceof Error) {
        if (error.message.includes("Insufficient balance") || error.message.includes("1113")) {
          fallbackMessage = "I apologize, but the AI service is currently unavailable due to insufficient balance. Please contact the administrator to recharge the account."
        } else if (error.message.includes("Unknown Model") || error.message.includes("1211")) {
          fallbackMessage = "I apologize, but there's a configuration issue with the AI model. Please contact the administrator."
        }
      }

      // Fallback response if API fails
      return {
        content: fallbackMessage,
        model: "fallback",
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        processingTime: Date.now() - startTime
      }
    }
  }

  /**
   * Build system prompt based on agent style
   */
  private buildSystemPrompt(basePrompt: string, style: string): string {
    const styleInstructions = {
      PROFESSIONAL: "You are a professional AI assistant. Respond with formal, well-structured answers that demonstrate expertise and analytical thinking. Use clear, concise language and provide actionable insights.",
      DIRECT: "You are a direct AI assistant. Respond with straightforward, no-nonsense answers. Get straight to the point, provide practical solutions, and avoid unnecessary elaboration.",
      FRIENDLY: "You are a friendly AI assistant. Respond with warm, conversational answers that make users feel comfortable. Use encouraging language, show empathy, and maintain a positive tone.",
      CREATIVE: "You are a creative AI assistant. Respond with innovative, imaginative answers that think outside the box. Use creative language, suggest unconventional approaches, and inspire new ideas.",
      ANALYTICAL: "You are an analytical AI assistant. Respond with data-driven, logical answers that break down complex problems. Use structured thinking, provide evidence-based reasoning, and consider multiple perspectives."
    }

    const styleInstruction = styleInstructions[style as keyof typeof styleInstructions] || styleInstructions.PROFESSIONAL

    return `${styleInstruction}\n\n${basePrompt}\n\nImportant guidelines:\n- Stay true to your defined personality and expertise\n- Provide helpful, accurate information\n- Be concise but thorough\n- Adapt your response style to match the specified tone`
  }

  /**
   * Get temperature setting based on agent style
   */
  private getTemperatureForStyle(style: string): number {
    const temperatureMap = {
      PROFESSIONAL: 0.3,
      DIRECT: 0.1,
      FRIENDLY: 0.8,
      CREATIVE: 1.0,
      ANALYTICAL: 0.2
    }

    return temperatureMap[style as keyof typeof temperatureMap] || 0.7
  }

  /**
   * Get max tokens based on agent style
   */
  private getMaxTokensForStyle(style: string): number {
    const tokenMap = {
      PROFESSIONAL: 800,
      DIRECT: 400,
      FRIENDLY: 600,
      CREATIVE: 1000,
      ANALYTICAL: 900
    }

    return tokenMap[style as keyof typeof tokenMap] || 600
  }

  /**
   * Get fallback response if API fails
   */
  private getFallbackResponse(style: string, _userMessage: string): string {
    const fallbackResponses = {
      PROFESSIONAL: "I apologize, but I'm currently experiencing technical difficulties. Please try again later for a comprehensive response to your inquiry.",
      DIRECT: "Sorry, having technical issues right now. Please try again.",
      FRIENDLY: "Oh dear! It seems I'm having a bit of technical trouble at the moment. Could you please try asking me again in a moment? 😊",
      CREATIVE: "Oops! My creative circuits are having a momentary glitch. Let's reconnect in a moment and explore some innovative ideas together!",
      ANALYTICAL: "Error detected: Unable to process request at this time. Please retry your query for a structured analysis."
    }

    return fallbackResponses[style as keyof typeof fallbackResponses] || "I'm experiencing technical difficulties. Please try again."
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`[ZAI] Testing connection to: ${this.baseURL}`)
      await this.createChatCompletion({
        model: this.defaultModel,
        messages: [
          { role: "user", content: "Hello, this is a test message." }
        ],
        max_tokens: 50
      })

      return {
        success: true,
        message: "Z.ai API connection successful"
      }
    } catch (error) {
      console.log(`[ZAI] Connection error:`, error)
      return {
        success: false,
        message: `Z.ai API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

// Global Z.ai client instance
let zaiClient: ZAIClient | null = null

/**
 * Get or create Z.ai client instance
 */
export function getZAIClient(): ZAIClient {
  if (!zaiClient) {
    const apiKey = process.env.ZAI_API_KEY
    
    if (!apiKey) {
      throw new Error("ZAI_API_KEY environment variable is not set")
    }

    zaiClient = new ZAIClient(apiKey, {
      baseURL: process.env.ZAI_API_URL,
      defaultModel: process.env.ZAI_MODEL || "glm-4.6"
    })
  }

  return zaiClient
}

/**
 * Reset Z.ai client instance (useful for testing or configuration changes)
 */
export function resetZAIClient(): void {
  zaiClient = null
}
