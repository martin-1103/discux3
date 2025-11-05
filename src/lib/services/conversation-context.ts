/**
 * Conversation Context Service
 * Analyzes user message + recent chat context to understand intent
 */

import { prisma } from "@/lib/db"

export interface ConversationContext {
  roomId: string
  userId: string
  currentMessage: string
  recentMessages: Array<{
    content: string
    type: 'USER' | 'AGENT' | 'SYSTEM'
    timestamp: Date
    agentName?: string
  }>
  themes: string[]
  intentEvolution: string[]
  contextSummary: string
}

export interface EnhancedIntent {
  primary: string
  secondary?: string
  context: string
  confidence: number
  suggestedApproach: string
}

/**
 * Get conversation context for intent analysis
 */
export async function getConversationContext(
  roomId: string,
  userId: string,
  currentMessage: string
): Promise<ConversationContext> {
  // Get recent messages from the room
  const messages = await prisma.message.findMany({
    where: { roomId },
    include: {
      agent: {
        select: {
          name: true
        }
      },
      sender: {
        select: {
          name: true
        }
      }
    },
    orderBy: { timestamp: 'desc' },
    take: 10 // Last 10 messages for context
  })

  // Format messages for analysis
  const recentMessages = messages.reverse().map(msg => ({
    content: cleanMessageContent(msg.content),
    type: msg.type,
    timestamp: msg.timestamp,
    agentName: msg.agent?.name,
    senderName: msg.sender?.name
  }))

  // Extract conversation themes
  const themes = extractConversationThemes(recentMessages)

  // Track intent evolution
  const intentEvolution = trackIntentEvolution(recentMessages)

  // Generate context summary
  const contextSummary = generateContextSummary(recentMessages, currentMessage)

  return {
    roomId,
    userId,
    currentMessage,
    recentMessages,
    themes,
    intentEvolution,
    contextSummary
  }
}

/**
 * Analyze user intent with conversation context
 */
export async function analyzeUserIntentWithContext(
  roomId: string,
  userId: string,
  currentMessage: string
): Promise<EnhancedIntent> {
  const context = await getConversationContext(roomId, userId, currentMessage)

  // Analyze intent considering conversation flow
  const primaryIntent = extractPrimaryIntent(currentMessage, context)
  const secondaryIntent = extractSecondaryIntent(currentMessage, context)
  const suggestedApproach = generateSuggestedApproach(primaryIntent, context)

  return {
    primary: primaryIntent,
    secondary: secondaryIntent,
    context: context.contextSummary,
    confidence: calculateConfidence(primaryIntent, context),
    suggestedApproach
  }
}

/**
 * Clean message content by removing agent metadata
 */
function cleanMessageContent(content: string): string {
  // Remove [AGENT:...] prefixes if present
  return content.replace(/^\[AGENT:[^\]]*\]\n/, '').trim()
}

/**
 * Extract conversation themes from recent messages
 */
function extractConversationThemes(messages: any[]): string[] {
  const allText = messages
    .map(msg => cleanMessageContent(msg.content))
    .join(' ')
    .toLowerCase()

  // Simple keyword extraction - could be enhanced with NLP
  const themes = []

  if (allText.includes('strategi') || allText.includes('strategy')) themes.push('strategic planning')
  if (allText.includes('bisnis') || allText.includes('business')) themes.push('business development')
  if (allText.includes('marketing') || allText.includes('promosi')) themes.push('marketing')
  if (allText.includes('produk') || allText.includes('product')) themes.push('product development')
  if (allText.includes('target') || allText.includes('goal')) themes.push('goal setting')
  if (allText.includes('masalah') || allText.includes('problem')) themes.push('problem solving')
  if (allText.includes('execution') || allText.includes('implementasi')) themes.push('execution')

  return themes
}

/**
 * Track intent evolution through conversation
 */
function trackIntentEvolution(messages: any[]): string[] {
  return messages
    .filter(msg => msg.type === 'USER')
    .map(msg => extractKeywords(cleanMessageContent(msg.content)))
    .slice(-3) // Last 3 user messages
}

/**
 * Extract keywords from message
 */
function extractKeywords(content: string): string {
  const words = content.toLowerCase().split(' ')
  const keywords = words.filter(word =>
    word.length > 4 &&
    !['tapi', 'karena', 'yang', 'dengan', 'untuk', 'dari', 'pada', 'dalam'].includes(word)
  )
  return keywords.slice(0, 3).join(', ') // Top 3 keywords
}

/**
 * Generate context summary
 */
function generateContextSummary(messages: any[], currentMessage: string): string {
  if (messages.length === 0) {
    return `Starting new conversation. User says: "${currentMessage}"`
  }

  const lastFewMessages = messages.slice(-3)
  const participants = [...new Set(lastFewMessages.map(msg =>
    msg.agentName || msg.senderName || 'User'
  ))]

  return `Conversation with ${participants.join(', ')}. Recent topics: ${lastFewMessages.map(msg =>
    cleanMessageContent(msg.content).slice(0, 50) + '...'
  ).join(' | ')}`
}

/**
 * Extract primary intent from message and context
 */
function extractPrimaryIntent(message: string, context: ConversationContext): string {
  const msg = message.toLowerCase()

  // Direct questions
  if (msg.includes('apa') || msg.includes('what') || msg.includes('bagaimana')) {
    if (context.themes.includes('strategic planning')) return 'strategic_advice'
    if (context.themes.includes('problem solving')) return 'problem_solution'
    return 'information_request'
  }

  // Opinion seeking
  if (msg.includes('pendapat') || msg.includes('menurut') || msg.includes('think')) {
    return 'opinion_request'
  }

  // Task/Action oriented
  if (msg.includes('bantuan') || msg.includes('help') || msg.includes('tolong')) {
    return 'help_request'
  }

  // Decision making
  if (msg.includes('pilihan') || msg.includes('decide') || msg.includes('memilih')) {
    return 'decision_support'
  }

  // Default based on themes
  if (context.themes.length > 0) {
    return `${context.themes[0]}_discussion`
  }

  return 'general_discussion'
}

/**
 * Extract secondary intent
 */
function extractSecondaryIntent(message: string, context: ConversationContext): string | undefined {
  const msg = message.toLowerCase()

  if (msg.includes('cepat') || msg.includes('quick') || msg.includes('segera')) {
    return 'urgent'
  }

  if (msg.includes('detail') || msg.includes('jelaskan') || msg.includes('explain')) {
    return 'detailed_explanation'
  }

  if (msg.includes('contoh') || msg.includes('example')) {
    return 'example_request'
  }

  return undefined
}

/**
 * Generate suggested approach based on intent and context
 */
function generateSuggestedApproach(primaryIntent: string, context: ConversationContext): string {
  const approaches = {
    strategic_advice: 'Provide actionable strategic insights with concrete steps',
    opinion_request: 'Give direct, honest opinion with reasoning',
    problem_solution: 'Focus on practical solutions and implementation steps',
    help_request: 'Provide clear, step-by-step guidance',
    decision_support: 'Analyze options and recommend based on evidence',
    information_request: 'Provide accurate, concise information',
    general_discussion: 'Engage with relevant insights and questions'
  }

  return approaches[primaryIntent as keyof typeof approaches] || approaches.general_discussion
}

/**
 * Calculate confidence score for intent analysis
 */
function calculateConfidence(intent: string, context: ConversationContext): number {
  let confidence = 0.5 // Base confidence

  // Higher confidence if conversation themes align
  if (context.themes.some(theme => intent.includes(theme))) {
    confidence += 0.2
  }

  // Higher confidence for longer conversations
  if (context.recentMessages.length > 5) {
    confidence += 0.1
  }

  // Higher confidence for clear intent keywords
  const clearIntents = ['strategic_advice', 'opinion_request', 'help_request', 'decision_support']
  if (clearIntents.includes(intent)) {
    confidence += 0.2
  }

  return Math.min(confidence, 1.0)
}