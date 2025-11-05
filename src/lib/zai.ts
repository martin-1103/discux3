/**
 * Z.ai API Client for Discux3
 * Handles chat completion requests with proper authentication and error handling
 */

import logger, { generateCorrelationId } from './logger'

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
  request_id?: string
  created?: number
  model: string
  // New ZAI format - content array
  content?: Array<{
    type: string
    text: string
  }>
  // Legacy OpenAI format - choices array
  choices?: Array<{
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
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
    input_tokens?: number
    output_tokens?: number
    cache_read_input_tokens?: number
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
  type?: string
  role?: string
  stop_reason?: string
  stop_sequence?: string
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
    const correlationId = generateCorrelationId()
    const startTime = Date.now()

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

    // Log the request
    logger.aiRequest(correlationId, {
      endpoint,
      model: request.model || this.defaultModel,
      temperature: request.temperature,
      maxTokens: request.max_tokens,
      messageCount: request.messages.length,
      userId: request.user_id,
      requestId: request.request_id,
      isAnthropicStyle,
      promptPreview: request.messages[request.messages.length - 1]?.content?.substring(0, 100) + '...'
    })

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": "en-US,en",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      })

      const responseTime = Date.now() - startTime

      // Get response text for logging
      const responseText = await response.text()

      // Log the response
      logger.aiResponse(correlationId, {
        status: response.status,
        statusText: response.statusText,
        duration: responseTime,
        rawBody: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''),
        headers: {
          contentType: response.headers.get('content-type'),
          requestId: response.headers.get('x-request-id')
        }
      })

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        let errorDetails: any = {}

        try {
          const errorData = JSON.parse(responseText)
          if (errorData.error?.message) {
            errorMessage = errorData.error.message
            errorDetails = errorData.error
          } else if (errorData.message) {
            errorMessage = errorData.message
            errorDetails = errorData
          } else if (typeof errorData === 'string') {
            errorMessage = errorData
          }
        } catch (e) {
          // Use default error message if JSON parsing fails
          errorDetails = { rawResponse: responseText.substring(0, 200) }
        }

        const apiError = new Error(`Z.ai API Error: ${errorMessage}`)

        // Log the error with full context
        logger.aiError(correlationId, 'API request failed', apiError, {
          request: {
            endpoint,
            model: request.model || this.defaultModel,
            body: requestBody
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            body: errorDetails
          }
        })

        throw apiError
      }

      // Parse successful response
      let parsedResponse: ZAIChatResponse
      try {
        parsedResponse = JSON.parse(responseText)
      } catch (parseError) {
        const jsonError = new Error(`Failed to parse API response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)

        logger.aiError(correlationId, 'JSON parsing failed', jsonError, {
          request: { endpoint, model: request.model || this.defaultModel },
          response: {
            status: response.status,
            rawBody: responseText.substring(0, 1000)
          }
        })

        throw jsonError
      }

      return parsedResponse

    } catch (error) {
      const responseTime = Date.now() - startTime

      if (error instanceof Error && error.message.includes('Z.ai API Error:')) {
        // Already logged above, just re-throw
        throw error
      }

      // Log unexpected errors
      logger.aiError(correlationId, 'Unexpected error during API call', error instanceof Error ? error : new Error(String(error)), {
        request: {
          endpoint,
          model: request.model || this.defaultModel,
          duration: responseTime
        }
      })

      throw error
    }
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
    const correlationId = generateCorrelationId()
    const startTime = Date.now()

    // Build system message based on agent style
    const systemPrompt = this.buildSystemPrompt(agentPrompt)

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

    // Log the agent request
    logger.aiRequest(correlationId, {
      endpoint: 'generateAgentResponse',
      model: this.defaultModel,
      temperature: this.getTemperatureForStyle(),
      messageCount: messages.length,
      userId,
      agentStyle,
      userMessagePreview: userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : ''),
      conversationHistoryLength: conversationHistory.length,
      systemPromptLength: systemPrompt.length
    })

    try {
      const response = await this.createChatCompletion({
        model: this.defaultModel,
        messages,
        temperature: this.getTemperatureForStyle(),
        user_id: userId,
        request_id: `discux3_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })

      const processingTime = Date.now() - startTime

      // Extract content from Z.AI API response (handle multiple formats)
      let content: string
      let model: string
      let usage: any
      let isFallback = false

      // Handle ZAI's new format with content array
      if (response.content && Array.isArray(response.content) && response.content.length > 0) {
        // New ZAI format: content is an array of objects
        const textContent = response.content.find((item: any) => item.type === 'text')
        if (textContent && textContent.text) {
          content = textContent.text
          model = response.model || "unknown"
          usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }

          logger.aiResponse(correlationId, {
            status: 200,
            statusText: 'OK (ZAI array format)',
            duration: processingTime,
            rawBody: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
            model,
            usage,
            responseType: 'content_array',
            fallback: false
          })
        } else {
          // Fallback for empty content array
          content = "I apologize, but I couldn't generate a proper response."
          model = "unknown"
          usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
          isFallback = true

          logger.aiError(correlationId, 'Empty content array in ZAI response', new Error('No text content found in content array'), {
            response: {
              rawResponse: JSON.stringify(response).substring(0, 500)
            },
            fallback: true
          })
        }
      } else if (response.choices && response.choices[0]?.message) {
        // OpenAI API format - matches the ZAIChatResponse interface
        const message = response.choices[0].message
        content = message.content || message.reasoning_content || "I apologize, but I couldn't generate a proper response."
        model = response.model
        usage = response.usage

        logger.aiResponse(correlationId, {
          status: 200,
          statusText: 'OK (OpenAI format)',
          duration: processingTime,
          rawBody: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
          model,
          usage,
          responseType: 'choices_message',
          fallback: false
        })
      } else {
        // Fallback for unexpected response format
        content = "I apologize, but I couldn't generate a proper response."
        model = "unknown"
        usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
        isFallback = true

        logger.aiError(correlationId, 'Unexpected response format from API', new Error('Response format not recognized'), {
          response: {
            rawResponse: JSON.stringify(response).substring(0, 1000)
          },
          expectedFormats: ['content array with text objects', 'choices.message format'],
          fallback: true
        })
      }

      return {
        content: content,
        model: model,
        usage: usage,
        processingTime
      }
    } catch (error) {
      const processingTime = Date.now() - startTime

      // Replace console.error with proper logging
      logger.aiError(correlationId, 'Agent response generation failed', error instanceof Error ? error : new Error(String(error)), {
        agentStyle,
        userMessageLength: userMessage.length,
        conversationHistoryLength: conversationHistory.length,
        duration: processingTime
      })

      // Check for specific error types
      let fallbackMessage = this.getFallbackResponse()
      let errorType = 'unknown'

      if (error instanceof Error) {
        if (error.message.includes("Insufficient balance") || error.message.includes("1113")) {
          fallbackMessage = "I apologize, but the AI service is currently unavailable due to insufficient balance. Please contact the administrator to recharge the account."
          errorType = 'insufficient_balance'
        } else if (error.message.includes("Unknown Model") || error.message.includes("1211")) {
          fallbackMessage = "I apologize, but there's a configuration issue with the AI model. Please contact the administrator."
          errorType = 'model_configuration_error'
        }
      }

      // Log fallback usage
      logger.aiIntent(correlationId, {
        query: userMessage,
        fallback: true,
        errorType,
        fallbackMessage: fallbackMessage.substring(0, 100) + (fallbackMessage.length > 100 ? '...' : ''),
        processingTime
      })

      // Fallback response if API fails
      return {
        content: fallbackMessage,
        model: "fallback",
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        processingTime
      }
    }
  }

  /**
   * Build system prompt based on agent style
   */
  private buildSystemPrompt(basePrompt: string): string {
    return `${basePrompt}

PEDOMAN RESPONSE:
- Gunakan bahasa Indonesia dalam semua response
- Format teks biasa saja, tanpa markdown (*, #, \`, dll)
- Singkat, padat, dan jelas - tidak bertele-tele
- Tidak perlu penjelasan berlebihan atau omong kosong
- Berikan wawasan yang tajam dan bisa langsung ditindaklanjuti
- Fokus pada kebenaran dan solusi praktis
- Lawan asumsi yang salah jika perlu
- Tetap langsung dan berdampak
- Bersikap brutal jujur, tidak ada basa-basi`
  }

  /**
   * Get temperature setting based on agent style
   */
  private getTemperatureForStyle(): number {
    return 0.1
  }

  
  /**
   * Get fallback response if API fails
   */
  private getFallbackResponse(): string {
    return "Tidak bisa memberikan respon sekarang. Coba lagi."
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    const correlationId = generateCorrelationId()

    logger.aiRequest(correlationId, {
      endpoint: 'testConnection',
      model: this.defaultModel,
      purpose: 'API connection test'
    })

    try {
      await this.createChatCompletion({
        model: this.defaultModel,
        messages: [
          { role: "user", content: "Hello, this is a test message." }
        ],
        max_tokens: 50
      })

      logger.aiResponse(correlationId, {
        status: 200,
        statusText: 'Connection test successful'
      })

      return {
        success: true,
        message: "Z.ai API connection successful"
      }
    } catch (error) {
      logger.aiError(correlationId, 'API connection test failed', error instanceof Error ? error : new Error(String(error)), {
        baseURL: this.baseURL,
        model: this.defaultModel
      })

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
