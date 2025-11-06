import { NextRequest, NextResponse } from "next/server"
import { generateFullAgentRole } from "@/lib/services/agent-generator"
import { AgentPreviewSchema } from "@/lib/services/agent-generator"
import { auth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "You must be logged in to generate full agent role" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { preview, goal } = body

    // Validate the preview data
    const validatedPreview = AgentPreviewSchema.parse(preview)

    if (!goal || typeof goal !== "string" || goal.trim().length < 10) {
      return NextResponse.json(
        { error: "Goal must be at least 10 characters long" },
        { status: 400 }
      )
    }

    // Generate full system role for selected agent (Step 2)
    const fullSystemRole = await generateFullAgentRole(validatedPreview, goal.trim())

    return NextResponse.json({
      success: true,
      agent: {
        ...validatedPreview,
        fullSystemRole
      },
      goal: goal.trim(),
    })
  } catch (error) {
    console.error("Error in generate-full-role API:", error)

    return NextResponse.json(
      {
        error: "Failed to generate full agent role",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}