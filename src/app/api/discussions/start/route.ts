import { NextRequest, NextResponse } from "next/server"
import { createDiscussion, executeDiscussion } from "@/lib/services/discussion-orchestrator"
import { auth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { roomId, messageId, agentIds, topic, intensity } = body

    if (!roomId || !messageId || !agentIds || !Array.isArray(agentIds)) {
      return NextResponse.json(
        { error: "Missing required fields: roomId, messageId, agentIds" },
        { status: 400 }
      )
    }

    if (agentIds.length < 2) {
      return NextResponse.json(
        { error: "At least 2 agents are required for a discussion" },
        { status: 400 }
      )
    }

    // Create discussion
    const discussionResult = await createDiscussion(
      roomId,
      messageId,
      agentIds,
      topic,
      intensity || 'NORMAL'
    )

    if (!discussionResult.success) {
      return NextResponse.json(
        { error: discussionResult.error },
        { status: 500 }
      )
    }

    // Execute discussion
    const executionResult = await executeDiscussion(
      discussionResult.data!.id,
      session.user.id,
      session.user.name
    )

    // Type guard for success/error discrimination
    if ('error' in executionResult) {
      return NextResponse.json(
        { error: executionResult.error },
        { status: 500 }
      )
    }

    // Type guard for success case
    if ('data' in executionResult && executionResult.success) {
      return NextResponse.json({
        success: true,
        data: {
          discussion: discussionResult.data,
          execution: executionResult.data!
        }
      })
    }

    return NextResponse.json({ error: "Unexpected execution result" }, { status: 500 })
  } catch (error) {
    console.error("Error starting discussion:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}