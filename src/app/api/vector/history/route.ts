import { testVectorHistory } from "@/lib/actions/ai"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomId } = body

    if (!roomId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameter: roomId"
        },
        { status: 400 }
      )
    }

    const result = await testVectorHistory(roomId)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Vector history API error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during vector history test"
      },
      { status: 500 }
    )
  }
}