import { NextRequest, NextResponse } from 'next/server'
import { generateAgentResponse } from '@/lib/actions/ai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, roomId, userId, userMessage, userName } = body

    if (!agentId || !roomId || !userId || !userMessage) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: agentId, roomId, userId, userMessage'
      }, { status: 400 })
    }

    console.log('[TestAgentResponse] Testing agent response generation...')
    console.log('[TestAgentResponse] Agent ID:', agentId)
    console.log('[TestAgentResponse] Room ID:', roomId)
    console.log('[TestAgentResponse] User ID:', userId)
    console.log('[TestAgentResponse] Message:', userMessage)

    // Test agent response generation
    const result = await generateAgentResponse(
      agentId,
      roomId,
      userMessage,
      userId,
      userName || 'TestUser'
    )

    console.log('[TestAgentResponse] Result:', result)

    return NextResponse.json({
      success: true,
      message: 'Agent response test completed',
      data: result
    })
  } catch (error) {
    console.error('[TestAgentResponse] Test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}