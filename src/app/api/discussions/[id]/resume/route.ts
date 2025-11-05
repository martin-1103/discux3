import { NextRequest, NextResponse } from "next/server"
import { resumeDiscussion, executeDiscussion } from "@/lib/services/discussion-orchestrator"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const discussionId = params.id
    if (!discussionId) {
      return NextResponse.json({ error: "Discussion ID required" }, { status: 400 })
    }

    // Resume discussion
    const resumeResult = await resumeDiscussion(discussionId)
    if (!resumeResult.success) {
      return NextResponse.json({ error: resumeResult.error }, { status: 500 })
    }

    // Execute next turns
    const executionResult = await executeDiscussion(
      discussionId,
      session.user.id,
      session.user.name
    )

    if (!executionResult.success) {
      return NextResponse.json({ error: executionResult.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: executionResult.data
    })
  } catch (error) {
    console.error("Error resuming discussion:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}