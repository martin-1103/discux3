import { prisma } from "@/lib/db"
import { getZAIClient } from "@/lib/zai"
import { createAgentMessage } from "@/lib/actions/messages"
import { getConversationContext } from "@/lib/vector-store"
import { getSocketService, DiscussionUpdate, AgentProgressUpdate } from "./socket-service"

// Truth Teller Enhancement - simple enhancement for all agents
const TRUTH_TELLER_ENHANCEMENT = `
Communication Style:
- Berbahasa Indonesia dalam semua response
- Singkat, padat, jelas, to the point
- Tidak bertele-tele kecuali user minta detail
- Brutally honest, no sugar-coating
- Langsung ke inti masalah
- Focus pada solusi yang actionable
`

export interface DiscussionContext {
  discussion: {
    id: string
    topic?: string
    intensity: 'NORMAL' | 'BRUTAL' | 'INTENSE' | 'EXTREME'
    currentTurn: number
    turnOrder: string[]
    maxTurns: number
  }
  previousResponses: Array<{
    agentId: string
    agentName: string
    content: string
    turnOrder: number
    respondingTo?: string
  }>
  conversationHistory: Array<{
    author: string
    content: string
    timestamp: Date
  }>
  userPatterns?: {
    blindSpots: string[]
    commonExcuses: string[]
    growthBlockers: string[]
  }
}

/**
 * Create a new multi-agent discussion
 */
export async function createDiscussion(
  roomId: string,
  messageId: string,
  agentIds: string[],
  topic?: string,
  intensity: 'NORMAL' | 'BRUTAL' | 'INTENSE' | 'EXTREME' = 'NORMAL'
) {
  try {
    // Determine optimal turn order based on agent styles
    const agents = await prisma.agent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, style: true, name: true }
    })

    // Smart turn ordering: brutal advisors first to set tone, then build discussion
    const turnOrder = determineOptimalTurnOrder(agents, intensity)

    const discussion = await prisma.discussion.create({
      data: {
        roomId,
        messageId,
        topic,
        intensity,
        turnOrder: JSON.stringify(turnOrder),
        status: 'ACTIVE',
        metadata: {
          startTime: new Date().toISOString(),
          intensity,
          expectedDuration: calculateExpectedDuration(agents.length, intensity)
        }
      }
    })

    // Broadcast discussion start via Socket.io
    const socketService = getSocketService()
    if (socketService) {
      const update: DiscussionUpdate = {
        discussionId: discussion.id,
        roomId,
        status: 'STARTED',
        currentTurn: 0,
        currentAgent: turnOrder[0],
        nextAgent: turnOrder[1],
        intensity
      }
      socketService.broadcastDiscussionUpdate(roomId, update)
    }

    return {
      success: true,
      data: discussion
    }
  } catch (error) {
    console.error("Error creating discussion:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create discussion"
    }
  }
}

/**
 * Execute sequential multi-agent discussion
 */
export async function executeDiscussion(
  discussionId: string,
  userId: string,
  userName?: string
) {
  try {
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId },
      include: {
        room: true,
        message: true,
        responses: {
          include: {
            agent: { select: { id: true, name: true, style: true, emoji: true, color: true } },
            message: true
          },
          orderBy: { turnOrder: 'asc' }
        }
      }
    })

    if (!discussion) {
      throw new Error("Discussion not found")
    }

    if (discussion.status !== 'ACTIVE') {
      throw new Error("Discussion is not active")
    }

    // Parse turnOrder from JSON string
    const turnOrder = JSON.parse(discussion.turnOrder)

    // Get conversation context
    const conversationHistory = await getConversationContext(
      discussion.roomId,
      discussion.message.content,
      10
    )

    // Analyze user patterns if brutal mode
    let userPatterns = undefined
    if (discussion.intensity !== 'NORMAL') {
      userPatterns = await analyzeUserPatterns(userId, discussion.roomId)
    }

    // Continue discussion from current turn
    const result = await continueDiscussion(
      { ...discussion, turnOrder }, // Add parsed turnOrder to discussion object
      conversationHistory,
      userPatterns,
      userId,
      userName
    )

    return result
  } catch (error) {
    console.error("Error executing discussion:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to execute discussion"
    }
  }
}

/**
 * Continue discussion from current turn
 */
async function continueDiscussion(
  discussion: any,
  conversationHistory: any[],
  userPatterns: any,
  userId: string,
  userName?: string
) {
  const responses = []
  const { turnOrder, currentTurn, maxTurns, intensity } = discussion

  // Check if discussion should continue
  if (currentTurn >= turnOrder.length || currentTurn >= maxTurns) {
    // Conclude discussion
    await prisma.discussion.update({
      where: { id: discussion.id },
      data: { status: 'CONCLUDED' }
    })

    return {
      success: true,
      data: {
        status: 'CONCLUDED',
        message: 'Discussion completed',
        responses: discussion.responses
      }
    }
  }

  // Process remaining turns sequentially
  for (let i = currentTurn; i < Math.min(turnOrder.length, currentTurn + 3); i++) {
    const agentId = turnOrder[i]

      // Build context for this agent
    const context = await buildAgentContext(
      discussion,
      agentId,
      i,
      conversationHistory,
      userPatterns
    )

    // Get agent information for broadcasting
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { name: true, emoji: true }
    })

    // Broadcast agent starting event
    const socketService = getSocketService()
    if (socketService) {
      const startingProgress: AgentProgressUpdate = {
        type: 'agent_starting',
        discussionId: discussion.id,
        roomId: discussion.roomId,
        agentId,
        agentName: agent?.name || 'Agent',
        agentEmoji: agent?.emoji || '🤖',
        turnOrder: i,
        totalTurns: turnOrder.length
      }
      socketService.broadcastAgentProgress(discussion.roomId, startingProgress)
    }

    // Generate agent response
    const response = await generateContextualAgentResponse(
      agentId,
      discussion.roomId,
      context,
      discussion.message.content,
      userId,
      userName,
      intensity
    )

    if (response.success) {
      // Store discussion response
      await prisma.discussionResponse.create({
        data: {
          discussionId: discussion.id,
          agentId,
          messageId: response.data.message.id,
          turnOrder: i,
          respondingTo: i > 0 ? turnOrder[i - 1] : null,
          responseTo: i > 0 ? discussion.responses[i - 1]?.messageId : null
        }
      })

      responses.push(response.data)

      // Update discussion current turn
      await prisma.discussion.update({
        where: { id: discussion.id },
        data: { currentTurn: i + 1 }
      })

      // Broadcast agent completion event
      const completionProgress: AgentProgressUpdate = {
        type: 'agent_complete',
        discussionId: discussion.id,
        roomId: discussion.roomId,
        agentId,
        agentName: agent?.name || 'Agent',
        agentEmoji: agent?.emoji || '🤖',
        turnOrder: i,
        totalTurns: turnOrder.length,
        processingTime: response.data.response?.processingTime
      }
      socketService.broadcastAgentProgress(discussion.roomId, completionProgress)

      // Broadcast discussion update via Socket.io
      if (socketService) {
        const update: DiscussionUpdate = {
          discussionId: discussion.id,
          roomId: discussion.roomId,
          status: 'STARTED', // Still ongoing
          currentTurn: i + 1,
          currentAgent: turnOrder[i + 1], // Next agent
          nextAgent: turnOrder[i + 2], // Agent after next
          intensity: discussion.intensity
        }
        socketService.broadcastDiscussionUpdate(discussion.roomId, update)
      }

      // Add delay for natural feel
      await delay(1000 + Math.random() * 2000)
    } else {
      console.error(`Failed to generate response for agent ${agentId}:`, response.error)

      // Broadcast agent error event
      const errorProgress: AgentProgressUpdate = {
        type: 'agent_error',
        discussionId: discussion.id,
        roomId: discussion.roomId,
        agentId,
        agentName: agent?.name || 'Agent',
        agentEmoji: agent?.emoji || '🤖',
        turnOrder: i,
        totalTurns: turnOrder.length,
        errorMessage: response.error || "Unknown error"
      }
      if (socketService) {
        socketService.broadcastAgentProgress(discussion.roomId, errorProgress)
      }
    }
  }

  return {
    success: true,
    data: {
      status: 'CONTINUING',
      discussionId: discussion.id,
      currentTurn: Math.min(currentTurn + 3, turnOrder.length),
      responses,
      hasMore: currentTurn + 3 < turnOrder.length
    }
  }
}

/**
 * Build contextual information for an agent
 */
async function buildAgentContext(
  discussion: any,
  agentId: string,
  turnOrder: number,
  conversationHistory: any[],
  userPatterns?: any
): Promise<DiscussionContext> {
  const previousResponses = discussion.responses.slice(0, turnOrder)

  return {
    discussion: {
      id: discussion.id,
      topic: discussion.topic,
      intensity: discussion.intensity,
      currentTurn: turnOrder,
      turnOrder: discussion.turnOrder,
      maxTurns: discussion.maxTurns
    },
    previousResponses: previousResponses.map((resp: any, idx: number) => ({
      agentId: resp.agent.id,
      agentName: resp.agent.name,
      content: resp.message.content,
      turnOrder: idx,
      respondingTo: idx > 0 ? discussion.responses[idx - 1].agent.name : undefined
    })),
    conversationHistory,
    userPatterns
  }
}

/**
 * Generate agent response with enhanced context and brutal prompts
 */
async function generateContextualAgentResponse(
  agentId: string,
  roomId: string,
  context: DiscussionContext,
  userMessage: string,
  userId: string,
  userName?: string,
  intensity: 'NORMAL' | 'BRUTAL' | 'INTENSE' | 'EXTREME' = 'NORMAL'
) {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        prompt: true,
        style: true,
        color: true,
        emoji: true
      }
    })

    if (!agent) {
      throw new Error("Agent not found")
    }

    // Build enhanced prompt based on intensity and agent style
    let enhancedPrompt = buildEnhancedPrompt(agent, context, intensity, userName)

    // Generate response using Z.ai
    const zaiClient = getZAIClient()
    const response = await zaiClient.generateAgentResponse(
      enhancedPrompt,
      agent.style,
      userMessage,
      context.previousResponses.map(r => r.content),
      userId
    )

    // Create agent message
    const message = await createAgentMessage(
      roomId,
      agentId,
      response.content,
      response.processingTime,
      0.9,
      JSON.stringify(context).length + response.content.length
    )

    if (!message.success) {
      throw new Error("Failed to create agent message")
    }

    return {
      success: true,
      data: {
        agent: {
          id: agent.id,
          name: agent.name,
          emoji: agent.emoji,
          color: agent.color,
          style: agent.style
        },
        message: message.data,
        response: {
          content: response.content,
          model: response.model,
          usage: response.usage,
          processingTime: response.processingTime
        }
      }
    }
  } catch (error) {
    console.error("Error generating contextual agent response:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate agent response"
    }
  }
}

/**
 * Build enhanced prompt with context and brutal intensity
 */
function buildEnhancedPrompt(
  agent: any,
  context: DiscussionContext,
  intensity: 'NORMAL' | 'BRUTAL' | 'INTENSE' | 'EXTREME',
  userName?: string
): string {
  // Use agent's base prompt from database
  let basePrompt = agent.prompt

  // Apply truth teller enhancement for all agents
  basePrompt += "\n\n" + TRUTH_TELLER_ENHANCEMENT

  // Build conversation context
  let contextString = ""
  if (context.previousResponses.length > 0) {
    const previousResponsesText = context.previousResponses.map(resp =>
      `[${resp.agentName}]: ${resp.content}`
    ).join('\n\n')

    contextString = `
PREVIOUS RESPONSES IN THIS DISCUSSION:
${previousResponsesText}

`
  }

  // Add user patterns if available
  let userPatternsString = ""
  if (context.userPatterns) {
    const patterns = context.userPatterns
    userPatternsString = `
USER PATTERNS I'VE NOTICED:
- Blind spots: ${patterns.blindSpots.join(', ') || 'None detected yet'}
- Common excuses: ${patterns.commonExcuses.join(', ') || 'None detected yet'}
- Growth blockers: ${patterns.growthBlockers.join(', ') || 'None detected yet'}

`
  }

  // Add role context based on turn order
  const roleContext = context.previousResponses.length === 0
    ? "You are STARTING this discussion. Set the tone and establish the key themes."
    : `You are RESPONDING to previous agents. Build upon, challenge, or redirect the conversation meaningfully.`

  const intensityMultiplier = intensity === 'EXTREME' ? 3 : intensity === 'INTENSE' ? 2 : intensity === 'BRUTAL' ? 1.5 : 1

  return `${basePrompt}

${contextString}
${userPatternsString}
DISCUSSION CONTEXT:
- Topic: ${context.discussion.topic || 'Open discussion'}
- Your turn: ${context.discussion.currentTurn + 1} of ${context.discussion.turnOrder.length}
- Intensity level: ${intensity} (${intensityMultiplier}x directness)
- Role: ${roleContext}

${userName ? `Current user: ${userName}` : ''}

Current message that started this discussion: "${context.conversationHistory[context.conversationHistory.length - 1]?.content || 'No current message'}"

RESPONSE GUIDELINES:
- Be direct and specific, not vague
- If this is a brutal discussion, be challenging and provocative
- Reference previous responses when relevant
- Add new insights rather than repeating points
- If you disagree, explain why constructively
- Keep responses focused and impactful

${intensity !== 'NORMAL' ? `
BRUTAL MODE ACTIVATED:
- Challenge assumptions and call out BS
- Demand higher standards and execution
- Point out blind spots and avoidance behaviors
- Be uncomfortably honest but growth-focused
- No fluff, no comfort, just truth that drives action
` : ''}
`
}

/**
 * Determine optimal turn order based on agent styles and intensity
 */
function determineOptimalTurnOrder(
  agents: Array<{ id: string; style: string; name: string }>,
  intensity: 'NORMAL' | 'BRUTAL' | 'INTENSE' | 'EXTREME'
): string[] {
  // Priority order for different intensities
  const brutalPriority = ['BRUTAL_MENTOR', 'TRUTH_TELLER', 'STRATEGIC_CHALLENGER', 'EXECUTION_DRILL_SERGEANT', 'GROWTH_ACCELERATOR']
  const normalPriority = ['PROFESSIONAL', 'ANALYTICAL', 'DIRECT', 'CREATIVE', 'FRIENDLY']

  const priority = intensity !== 'NORMAL' ? brutalPriority : normalPriority

  // Sort agents by priority
  const sorted = agents.sort((a, b) => {
    const aIndex = priority.indexOf(a.style)
    const bIndex = priority.indexOf(b.style)

    // If style not in priority, put at end
    const aPriority = aIndex === -1 ? 999 : aIndex
    const bPriority = bIndex === -1 ? 999 : bIndex

    return aPriority - bPriority
  })

  return sorted.map(agent => agent.id)
}

/**
 * Analyze user patterns for personalized brutal insights
 */
async function analyzeUserPatterns(userId: string, roomId: string) {
  try {
    // Get recent messages from user
    const userMessages = await prisma.message.findMany({
      where: {
        senderId: userId,
        roomId,
        type: 'USER'
      },
      include: {
        mentions: {
          include: {
            agent: { select: { style: true } }
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 50
    })

    // Simple pattern analysis (can be enhanced with ML/AI)
    const patterns = {
      blindSpots: [],
      commonExcuses: [],
      growthBlockers: []
    }

    // Look for common patterns in user messages
    const messageTexts = userMessages.map(m => m.content.toLowerCase()).join(' ')

    // Excuse patterns
    if (messageTexts.includes('no time') || messageTexts.includes('busy')) {
      patterns.commonExcuses.push('Time management issues')
    }
    if (messageTexts.includes('don\'t know') || messageTexts.includes('not sure')) {
      patterns.commonExcuses.push('Analysis paralysis')
    }
    if (messageTexts.includes('later') || messageTexts.includes('tomorrow')) {
      patterns.commonExcuses.push('Procrastination')
    }

    // Growth blocker patterns
    if (messageTexts.includes('perfect') || messageTexts.includes('perfectly')) {
      patterns.growthBlockers.push('Perfectionism')
    }
    if (messageTexts.includes('fail') || messageTexts.includes('failure')) {
      patterns.growthBlockers.push('Fear of failure')
    }
    if (messageTexts.includes('help') || messageTexts.includes('stuck')) {
      patterns.growthBlockers.push('Dependency issues')
    }

    return patterns
  } catch (error) {
    console.error("Error analyzing user patterns:", error)
    return {
      blindSpots: [],
      commonExcuses: [],
      growthBlockers: []
    }
  }
}

/**
 * Calculate expected discussion duration
 */
function calculateExpectedDuration(agentCount: number, intensity: 'NORMAL' | 'BRUTAL' | 'INTENSE' | 'EXTREME'): number {
  const baseDuration = agentCount * 2 // minutes per agent
  const intensityMultiplier = intensity === 'EXTREME' ? 2 : intensity === 'INTENSE' ? 1.5 : intensity === 'BRUTAL' ? 1.2 : 1
  return Math.round(baseDuration * intensityMultiplier)
}

/**
 * Pause an active discussion
 */
export async function pauseDiscussion(discussionId: string) {
  try {
    const discussion = await prisma.discussion.update({
      where: { id: discussionId },
      data: { status: 'PAUSED' },
      include: { roomId: true }
    })

    // Broadcast pause via Socket.io
    const socketService = getSocketService()
    if (socketService) {
      const update: DiscussionUpdate = {
        discussionId,
        roomId: discussion.roomId,
        status: 'PAUSED',
        intensity: discussion.intensity
      }
      socketService.broadcastDiscussionUpdate(discussion.roomId, update)
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to pause discussion"
    }
  }
}

/**
 * Resume a paused discussion
 */
export async function resumeDiscussion(discussionId: string) {
  try {
    const discussion = await prisma.discussion.update({
      where: { id: discussionId },
      data: { status: 'ACTIVE' },
      include: { roomId: true, turnOrder: true, currentTurn: true }
    })

    // Broadcast resume via Socket.io
    const socketService = getSocketService()
    if (socketService) {
      const update: DiscussionUpdate = {
        discussionId,
        roomId: discussion.roomId,
        status: 'RESUMED',
        currentTurn: discussion.currentTurn,
        currentAgent: discussion.turnOrder[discussion.currentTurn],
        nextAgent: discussion.turnOrder[discussion.currentTurn + 1],
        intensity: discussion.intensity
      }
      socketService.broadcastDiscussionUpdate(discussion.roomId, update)
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to resume discussion"
    }
  }
}

/**
 * Stop a discussion
 */
export async function stopDiscussion(discussionId: string) {
  try {
    const discussion = await prisma.discussion.update({
      where: { id: discussionId },
      data: { status: 'STOPPED' },
      include: { roomId: true }
    })

    // Broadcast stop via Socket.io
    const socketService = getSocketService()
    if (socketService) {
      const update: DiscussionUpdate = {
        discussionId,
        roomId: discussion.roomId,
        status: 'STOPPED',
        intensity: discussion.intensity
      }
      socketService.broadcastDiscussionUpdate(discussion.roomId, update)
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to stop discussion"
    }
  }
}

/**
 * Get discussion status
 */
export async function getDiscussionStatus(discussionId: string) {
  try {
    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId },
      include: {
        responses: {
          include: {
            agent: { select: { name: true, emoji: true, style: true } },
            message: { select: { content: true, timestamp: true } }
          },
          orderBy: { turnOrder: 'asc' }
        }
      }
    })

    if (!discussion) {
      return { success: false, error: "Discussion not found" }
    }

    return {
      success: true,
      data: {
        id: discussion.id,
        status: discussion.status,
        topic: discussion.topic,
        intensity: discussion.intensity,
        currentTurn: discussion.currentTurn,
        totalTurns: discussion.turnOrder.length,
        maxTurns: discussion.maxTurns,
        responses: discussion.responses.map(r => ({
          agentName: r.agent.name,
          agentEmoji: r.agent.emoji,
          agentStyle: r.agent.style,
          content: r.message.content,
          timestamp: r.message.timestamp,
          turnOrder: r.turnOrder
        })),
        createdAt: discussion.createdAt,
        updatedAt: discussion.updatedAt
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get discussion status"
    }
  }
}

/**
 * Utility function for delays
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}