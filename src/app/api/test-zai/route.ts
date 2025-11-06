import { NextRequest, NextResponse } from 'next/server'
import { getZAIClient } from '@/lib/zai'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, agentPrompt, agentStyle } = body

    if (!message) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: message'
      }, { status: 400 })
    }

    console.log(`[TestZAI] Testing Z.ai API with message:`, message)

    const zaiClient = getZAIClient()

    // Test response generation
    const result = await zaiClient.generateAgentResponse(
      agentPrompt || "You are a helpful AI assistant.",
      agentStyle || "TRUTH_TELLER",
      message,
      [], // No conversation history for simple test
      "test-user-id"
    )

    console.log(`[TestZAI] Z.ai API result:`, result)

    return NextResponse.json({
      success: true,
      message: 'Z.ai API test completed',
      data: result
    })
  } catch (error) {
    console.error('[TestZAI] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}