import { NextRequest, NextResponse } from "next/server"
import { getDiscussionStatus } from "@/lib/services/discussion-orchestrator"
import { auth } from "@/lib/auth"

export async function GET(
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

    const result = await getDiscussionStatus(discussionId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error("Error getting discussion status:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}