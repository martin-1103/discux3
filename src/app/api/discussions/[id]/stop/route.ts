import { NextRequest, NextResponse } from "next/server"
import { stopDiscussion } from "@/lib/services/discussion-orchestrator"
import { auth } from "@/lib/auth"

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const discussionId = params.id
    if (!discussionId) {
      return NextResponse.json({ error: "Discussion ID required" }, { status: 400 })
    }

    const result = await stopDiscussion(discussionId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error stopping discussion:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}