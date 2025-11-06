import { getVectorStore } from "@/lib/vector-store"
import { getZAIClient } from "@/lib/zai"
import logger from "@/lib/logger"

export interface QueryIntent {
  primaryIntent: 'retrieve' | 'summarize' | 'analyze' | 'compare' | 'find_decisions'
  timeReference: 'recent' | 'yesterday' | 'last_week' | 'specific_date' | 'all_time'
  topicFocus?: string
  participantFocus?: string[]
  responseFormat: 'summary' | 'detailed' | 'bullet_points' | 'action_items'
  confidence: number
}

export interface EnhancedQuery {
  originalQuery: string
  enhancedQuery: string
  intent: QueryIntent
  timeWeight: number
  semanticWeight: number
  topicWeight: number
  filters: {
    timeRange?: { start: Date; end: Date }
    participants?: string[]
    messageTypes?: string[]
    topicKeywords?: string[]
  }
}

export interface ContextResult {
  query: EnhancedQuery
  messages: Array<{
    id: string
    content: string
    author: string
    timestamp: Date
    relevanceScore: number
    temporalScore: number
    topicScore: number
    combinedScore: number
  }>
  summary?: string
  keyTopics: string[]
  participants: string[]
  timeSpan: { start: Date; end: Date }
  totalRelevanceScore: number
}

/**
 * AI-Driven Vector Search Enhancement Service
 *
 * This service analyzes user queries to understand intent and generates
 * optimized vector search queries with temporal and topic awareness.
 */
export class EnhancedVectorSearch {
  private zaiClient = getZAIClient()
  private vectorStore = getVectorStore()

  /**
   * Analyze user query and generate enhanced search parameters
   */
  async analyzeQuery(userQuery: string, roomId: string, userId: string): Promise<EnhancedQuery> {
    try {
      // Use conversation-aware intent analysis
      const intentAnalysis = await this.analyzeUserIntentWithContext(userQuery, roomId, userId)

      // Generate enhanced query based on intent
      const enhancedQuery = await this.generateEnhancedQuery(userQuery, intentAnalysis)

      // Calculate weights based on intent
      const weights = this.calculateWeights(intentAnalysis)

      // Build filters based on intent
      const filters = await this.buildFilters(intentAnalysis, roomId)

      return {
        originalQuery: userQuery,
        enhancedQuery,
        intent: intentAnalysis,
        ...weights,
        filters
      }
    } catch (error) {
      console.error("Error analyzing query:", error)

      // Fallback to basic query
      return {
        originalQuery: userQuery,
        enhancedQuery: userQuery,
        intent: {
          primaryIntent: 'retrieve',
          timeReference: 'all_time',
          responseFormat: 'detailed',
          confidence: 0.5
        },
        timeWeight: 0.2,
        semanticWeight: 0.8,
        topicWeight: 0.0,
        filters: {}
      }
    }
  }

  /**
   * Search with enhanced context understanding
   */
  async searchWithContext(roomId: string, userQuery: string, limit: number = 10): Promise<ContextResult> {
    try {
      // Analyze query intent
      const enhancedQuery = await this.analyzeQuery(userQuery, roomId, 'system')

      // Perform hybrid search (semantic + temporal + topic)
      const semanticResults = await this.vectorStore.getRelevantContext(roomId, enhancedQuery.enhancedQuery, limit * 2)

      // Apply temporal weighting
      const temporalResults = await this.applyTemporalWeighting(semanticResults, enhancedQuery)

      // Apply topic weighting
      const topicResults = await this.applyTopicWeighting(temporalResults, enhancedQuery)

      // Apply participant filtering
      const filteredResults = await this.applyParticipantFiltering(topicResults, enhancedQuery)

      // Calculate combined scores
      const scoredResults = this.calculateCombinedScores(filteredResults, enhancedQuery)

      // Sort by combined score and limit results
      const finalResults = scoredResults
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, limit)

      // Generate summary if requested
      let summary
      if (enhancedQuery.intent.responseFormat === 'summary' || enhancedQuery.intent.primaryIntent === 'summarize') {
        summary = await this.generateContextSummary(finalResults, enhancedQuery)
      }

      // Extract key topics
      const keyTopics = this.extractKeyTopics(finalResults)

      // Get unique participants
      const participants = [...new Set(finalResults.map(r => r.author))]

      // Calculate time span
      const timestamps = finalResults.map(r => r.timestamp)
      const timeSpan = {
        start: new Date(Math.min(...timestamps.map(t => t.getTime()))),
        end: new Date(Math.max(...timestamps.map(t => t.getTime())))
      }

      return {
        query: enhancedQuery,
        messages: finalResults,
        summary,
        keyTopics,
        participants,
        timeSpan,
        totalRelevanceScore: finalResults.reduce((sum, r) => sum + r.combinedScore, 0)
      }
    } catch (error) {
      console.error("Error in enhanced search:", error)

      // Fallback to basic search
      const basicResults = await this.vectorStore.getRelevantContext(roomId, userQuery, limit)

      return {
        query: {
          originalQuery: userQuery,
          enhancedQuery: userQuery,
          intent: {
            primaryIntent: 'retrieve',
            timeReference: 'all_time',
            responseFormat: 'detailed',
            confidence: 0.5
          },
          timeWeight: 0.2,
          semanticWeight: 0.8,
          topicWeight: 0.0,
          filters: {}
        },
        messages: basicResults.map(r => ({
          id: r.id,
          content: r.content,
          author: r.author_name,
          timestamp: new Date(r.timestamp),
          relevanceScore: r.score,
          temporalScore: 1.0,
          topicScore: 1.0,
          combinedScore: r.score
        })),
        keyTopics: [],
        participants: [...new Set(basicResults.map(r => r.author_name))],
        timeSpan: { start: new Date(), end: new Date() },
        totalRelevanceScore: basicResults.reduce((sum, r) => sum + r.score, 0)
      }
    }
  }

  /**
   * Analyze user intent using AI
   */
  private async analyzeUserIntent(userQuery: string): Promise<QueryIntent> {
    const correlationId = `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const prompt = `
Analyze the user's query and determine their intent. Respond ONLY with a valid JSON object containing:

1. primaryIntent: One of - retrieve (get information), summarize (get summary), analyze (deep analysis), compare (compare different points), find_decisions (find conclusions made)
2. timeReference: When the user is asking about - recent, yesterday, last_week, specific_date, all_time
3. topicFocus: Main topic they're asking about (if any)
4. participantFocus: Specific people they want to hear from (if any)
5. responseFormat: How they want the response - summary, detailed, bullet_points, action_items
6. confidence: How confident you are in this analysis (0-1)

IMPORTANT: Your entire response must be valid JSON only. No explanations, no markdown, no "Here is the JSON:", just the JSON object itself.

User query: "${userQuery}"

Example response format:
{"primaryIntent": "retrieve", "timeReference": "recent", "topicFocus": "project updates", "participantFocus": [], "responseFormat": "detailed", "confidence": 0.8}
`

    logger.aiRequest(correlationId, {
      endpoint: 'analyzeUserIntent',
      model: 'intent-analysis',
      purpose: 'Query intent analysis',
      userQueryLength: userQuery.length,
      userQueryPreview: userQuery.substring(0, 100) + (userQuery.length > 100 ? '...' : '')
    })

    try {
      const response = await this.zaiClient.generateAgentResponse("", "PROFESSIONAL", prompt)

      // Log the raw AI response for debugging
      logger.aiResponse(correlationId, {
        status: 200,
        statusText: 'AI response received',
        rawBody: response.content.substring(0, 300) + (response.content.length > 300 ? '...' : ''),
        model: response.model,
        processingTime: response.processingTime
      })

      // Clean and validate AI response
      const intentText = response.content
        .replace(/```json\n?|\n?```/g, '') // Remove markdown code blocks
        .replace(/^[^{]*/, '') // Remove any text before first {
        .replace(/[^}]*$/, '') // Remove any text after last }
        .trim()

      // Check if response looks like JSON
      if (!intentText.startsWith('{') || !intentText.endsWith('}')) {
        logger.aiIntent(correlationId, {
          query: userQuery,
          fallback: true,
          reason: 'Response does not appear to be JSON',
          rawResponse: response.content.substring(0, 200)
        })

        return {
          primaryIntent: 'retrieve',
          timeReference: 'all_time',
          responseFormat: 'detailed',
          confidence: 0.3
        }
      }

      let intent: QueryIntent
      try {
        intent = JSON.parse(intentText) as QueryIntent
      } catch (parseError) {
        logger.aiError(correlationId, 'JSON parsing failed for intent analysis', parseError instanceof Error ? parseError : new Error(String(parseError)), {
          request: {
            userQuery: userQuery.substring(0, 100),
            promptLength: prompt.length
          },
          response: {
            rawContent: response.content.substring(0, 500),
            cleanedText: intentText.substring(0, 500)
          }
        })

        return {
          primaryIntent: 'retrieve',
          timeReference: 'all_time',
          responseFormat: 'detailed',
          confidence: 0.3
        }
      }

      // Validate and fix intent
      const validatedIntent: QueryIntent = {
        primaryIntent: ['retrieve', 'summarize', 'analyze', 'compare', 'find_decisions'].includes(intent.primaryIntent)
          ? intent.primaryIntent
          : 'retrieve',
        timeReference: ['recent', 'yesterday', 'last_week', 'specific_date', 'all_time'].includes(intent.timeReference)
          ? intent.timeReference
          : 'all_time',
        topicFocus: intent.topicFocus,
        participantFocus: Array.isArray(intent.participantFocus) ? intent.participantFocus : [],
        responseFormat: ['summary', 'detailed', 'bullet_points', 'action_items'].includes(intent.responseFormat)
          ? intent.responseFormat
          : 'detailed',
        confidence: Math.max(0.1, Math.min(1.0, typeof intent.confidence === 'number' ? intent.confidence : 0.5))
      }

      logger.aiIntent(correlationId, {
        query: userQuery,
        intent: validatedIntent,
        confidence: validatedIntent.confidence,
        fallback: false
      })

      return validatedIntent

    } catch (error) {
      // Replace console.error with proper logging
      logger.aiError(correlationId, 'Intent analysis failed', error instanceof Error ? error : new Error(String(error)), {
        userQueryLength: userQuery.length,
        userQueryPreview: userQuery.substring(0, 100)
      })

      // Return default intent
      const fallbackIntent = {
        primaryIntent: 'retrieve' as const,
        timeReference: 'all_time' as const,
        responseFormat: 'detailed' as const,
        confidence: 0.3
      }

      logger.aiIntent(correlationId, {
        query: userQuery,
        intent: fallbackIntent,
        fallback: true,
        reason: 'AI request failed'
      })

      return fallbackIntent
    }
  }

  /**
   * Analyze user intent with conversation context
   */
  private async analyzeUserIntentWithContext(userQuery: string, _roomId: string, _userId: string): Promise<QueryIntent> {
    try {
      // Get conversation-aware intent analysis - simplified fallback
      const enhancedIntent = {
        primary: 'general_discussion',
        context: userQuery,
        confidence: 0.8
      }

      // Convert enhanced intent to QueryIntent format
      const intentMapping: Record<string, 'retrieve' | 'summarize' | 'analyze' | 'compare' | 'find_decisions'> = {
        'strategic_advice': 'analyze',
        'opinion_request': 'retrieve',
        'problem_solution': 'analyze',
        'help_request': 'retrieve',
        'decision_support': 'compare',
        'information_request': 'retrieve',
        'general_discussion': 'retrieve'
      }

      const primaryIntent = intentMapping[enhancedIntent.primary] || 'retrieve'

      return {
        primaryIntent,
        timeReference: 'recent', // Default to recent for conversation context
        topicFocus: enhancedIntent.context.split(' ').slice(0, 3).join(' '),
        participantFocus: [],
        responseFormat: 'detailed',
        confidence: enhancedIntent.confidence
      }

    } catch (error) {
      // Fallback to original intent analysis
      logger.aiError('context-intent', 'Conversation context analysis failed', error instanceof Error ? error : new Error(String(error)))
      return this.analyzeUserIntent(userQuery)
    }
  }

  /**
   * Generate enhanced query based on intent
   */
  private async generateEnhancedQuery(originalQuery: string, intent: QueryIntent): Promise<string> {
    let enhancedQuery = originalQuery

    // Add temporal context
    switch (intent.timeReference) {
      case 'recent':
        enhancedQuery += " recent messages latest conversation"
        break
      case 'yesterday':
        enhancedQuery += " yesterday previous day discussion"
        break
      case 'last_week':
        enhancedQuery += " past week last seven days"
        break
    }

    // Add topic focus
    if (intent.topicFocus) {
      enhancedQuery += ` ${intent.topicFocus} topic discussion`
    }

    // Add intent-specific keywords
    switch (intent.primaryIntent) {
      case 'summarize':
        enhancedQuery += " summary key points main takeaways conclusions"
        break
      case 'analyze':
        enhancedQuery += " analysis breakdown detailed examination insights"
        break
      case 'find_decisions':
        enhancedQuery += " decisions conclusions agreements outcomes made"
        break
      case 'compare':
        enhancedQuery += " comparison different viewpoints alternatives pros cons"
        break
    }

    return enhancedQuery
  }

  /**
   * Calculate weights based on intent
   */
  private calculateWeights(intent: QueryIntent): {
    timeWeight: number
    semanticWeight: number
    topicWeight: number
  } {
    let timeWeight = 0.2
    let semanticWeight = 0.8
    let topicWeight = 0.0

    // Adjust weights based on time reference
    switch (intent.timeReference) {
      case 'recent':
        timeWeight = 0.5
        semanticWeight = 0.4
        topicWeight = 0.1
        break
      case 'yesterday':
        timeWeight = 0.4
        semanticWeight = 0.5
        topicWeight = 0.1
        break
      case 'last_week':
        timeWeight = 0.3
        semanticWeight = 0.6
        topicWeight = 0.1
        break
    }

    // Adjust weights based on intent
    switch (intent.primaryIntent) {
      case 'summarize':
        topicWeight = 0.3
        semanticWeight = 0.5
        timeWeight = 0.2
        break
      case 'find_decisions':
        semanticWeight = 0.6
        topicWeight = 0.3
        timeWeight = 0.1
        break
    }

    return { timeWeight, semanticWeight, topicWeight }
  }

  /**
   * Build filters based on intent
   */
  private async buildFilters(intent: QueryIntent, _roomId: string): Promise<any> {
    const filters: any = {}

    // Time range filter
    if (intent.timeReference !== 'all_time') {
      const now = new Date()
      let startDate: Date

      switch (intent.timeReference) {
        case 'recent':
          startDate = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours
          break
        case 'yesterday':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24 hours
          break
        case 'last_week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days
          break
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000) // Default to 24 hours
      }

      filters.timeRange = { start: startDate, end: now }
    }

    // Participant filter
    if (intent.participantFocus && intent.participantFocus.length > 0) {
      filters.participants = intent.participantFocus
    }

    return filters
  }

  /**
   * Apply temporal weighting to search results
   */
  private async applyTemporalWeighting(
    results: any[],
    enhancedQuery: EnhancedQuery
  ): Promise<any[]> {
    if (enhancedQuery.timeWeight === 0) return results

    const now = new Date()
    const timeRange = enhancedQuery.filters.timeRange

    return results.map(result => {
      const messageDate = new Date(result.timestamp)
      let temporalScore = 1.0

      if (timeRange) {
        // Calculate recency score within time range
        const timeDiff = now.getTime() - messageDate.getTime()
        const rangeDiff = timeRange.end.getTime() - timeRange.start.getTime()

        if (timeDiff <= rangeDiff) {
          // Messages within time range get higher scores
          temporalScore = 1.0 + (1.0 - timeDiff / rangeDiff) * 0.5
        } else {
          // Messages outside time range get lower scores
          temporalScore = 0.5
        }
      }

      return {
        ...result,
        temporalScore
      }
    })
  }

  /**
   * Apply topic weighting to search results
   */
  private async applyTopicWeighting(
    results: any[],
    enhancedQuery: EnhancedQuery
  ): Promise<any[]> {
    if (enhancedQuery.topicWeight === 0) return results

    const topicKeywords = enhancedQuery.filters.topicKeywords || []

    return results.map(result => {
      let topicScore = 1.0

      if (topicKeywords.length > 0) {
        const content = result.content.toLowerCase()
        const keywordMatches = topicKeywords.filter(keyword =>
          content.includes(keyword.toLowerCase())
        ).length

        // Boost score based on keyword matches
        topicScore = 1.0 + (keywordMatches / topicKeywords.length) * 0.5
      }

      return {
        ...result,
        topicScore
      }
    })
  }

  /**
   * Apply participant filtering
   */
  private async applyParticipantFiltering(
    results: any[],
    enhancedQuery: EnhancedQuery
  ): Promise<any[]> {
    const participants = enhancedQuery.filters.participants

    if (!participants || participants.length === 0) {
      return results
    }

    // Ensure participants is an array
    const participantsArray = Array.isArray(participants) ? participants : [participants]

    return results.filter(result =>
      participantsArray.some(participant =>
        result.author_name.toLowerCase().includes(String(participant).toLowerCase())
      )
    )
  }

  /**
   * Calculate combined scores
   */
  private calculateCombinedScores(
    results: any[],
    enhancedQuery: EnhancedQuery
  ): any[] {
    return results.map(result => ({
      id: result.id,
      content: result.content,
      author: result.author_name,
      timestamp: new Date(result.timestamp),
      relevanceScore: result.score || 0,
      temporalScore: result.temporalScore || 1.0,
      topicScore: result.topicScore || 1.0,
      combinedScore:
        (result.score || 0) * enhancedQuery.semanticWeight +
        (result.temporalScore || 1.0) * enhancedQuery.timeWeight +
        (result.topicScore || 1.0) * enhancedQuery.topicWeight
    }))
  }

  /**
   * Generate context summary using AI
   */
  private async generateContextSummary(
    results: any[],
    enhancedQuery: EnhancedQuery
  ): Promise<string> {
    if (results.length === 0) return "No relevant context found."

    const contextText = results
      .slice(0, 5) // Limit to top 5 results for summary
      .map(r => `[${r.author}]: ${r.content}`)
      .join('\n')

    const prompt = `
Based on the user's query and the conversation context provided, generate a concise summary.

User's query: "${enhancedQuery.originalQuery}"
User's intent: ${enhancedQuery.intent.primaryIntent}
Response format requested: ${enhancedQuery.intent.responseFormat}

Conversation context:
${contextText}

Generate a ${enhancedQuery.intent.responseFormat} summary that directly addresses the user's query:
`

    try {
      const response = await this.zaiClient.generateAgentResponse("", "PROFESSIONAL", prompt)
      return response.content
    } catch (error) {
      console.error("Error generating summary:", error)
      return "Summary unavailable."
    }
  }

  /**
   * Extract key topics from results
   */
  private extractKeyTopics(results: any[]): string[] {
    // Simple keyword extraction - can be enhanced with NLP
    const allText = results.map(r => r.content).join(' ').toLowerCase()

    // Common business/tech topics to look for
    const topicKeywords = [
      'api', 'database', 'frontend', 'backend', 'design', 'strategy',
      'marketing', 'sales', 'product', 'development', 'testing',
      'deployment', 'security', 'performance', 'user experience',
      'revenue', 'growth', 'team', 'hiring', 'funding', 'investment'
    ]

    return topicKeywords
      .filter(keyword => allText.includes(keyword))
      .slice(0, 5) // Limit to top 5 topics
  }
}

// Global instance
let enhancedSearch: EnhancedVectorSearch | null = null

/**
 * Get enhanced vector search instance
 */
export function getEnhancedVectorSearch(): EnhancedVectorSearch {
  if (!enhancedSearch) {
    enhancedSearch = new EnhancedVectorSearch()
  }
  return enhancedSearch
}