import { testVectorContext } from "@/lib/actions/ai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomId, query } = body

    if (!roomId || !query) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters: roomId and query"
        },
        { status: 400 }
      )
    }

    const result = await testVectorContext(roomId, query)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Vector context API error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during vector context test"
      },
      { status: 500 }
    )
  }
}