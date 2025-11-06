import { NextRequest, NextResponse } from "next/server"
import { generateAgentPreviews } from "@/lib/services/agent-generator"
import { auth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be logged in to generate agent previews" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { goal } = body

    if (!goal || typeof goal !== "string" || goal.trim().length < 10) {
      return NextResponse.json(
        { error: "Goal must be at least 10 characters long" },
        { status: 400 }
      )
    }

    // Generate agent previews (Step 1 - lightweight)
    const previews = await generateAgentPreviews(goal.trim())

    return NextResponse.json({
      success: true,
      previews,
      goal: goal.trim(),
    })
  } catch (error) {
    console.error("Error in generate-agent-previews API:", error)

    return NextResponse.json(
      {
        error: "Failed to generate agent previews",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}