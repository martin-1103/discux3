import { NextRequest, NextResponse } from 'next/server'
import { generateAgentResponse } from '@/lib/actions/ai'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, roomId, message, listAgents } = body

    if (listAgents) {
      // Return list of available agents
      const agents = await prisma.agent.findMany({
        select: {
          id: true,
          name: true,
          emoji: true,
          style: true
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Agents list retrieved',
        data: agents
      })
    }

    if (!agentId || !roomId || !message) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: agentId, roomId, message'
      }, { status: 400 })
    }

    // Hardcoded userId for testing (user from MCP Chrome session)
    const userId = "cmhkocg700005bs7j1w9j4s0x" // This is pile's user ID

    console.log(`[TestAgent] Triggering agent response:`, {
      agentId,
      roomId,
      message,
      userId
    })

    // Trigger agent response
    const result = await generateAgentResponse(
      agentId,
      roomId,
      message,
      userId,
      "Test User"
    )

    console.log(`[TestAgent] Agent response result:`, result)

    return NextResponse.json({
      success: true,
      message: 'Agent response test completed',
      data: result
    })
  } catch (error) {
    console.error('[TestAgent] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}