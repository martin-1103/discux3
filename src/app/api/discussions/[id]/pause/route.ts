import { NextRequest, NextResponse } from "next/server"
import { pauseDiscussion } from "@/lib/services/discussion-orchestrator"
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

    const result = await pauseDiscussion(discussionId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error pausing discussion:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}