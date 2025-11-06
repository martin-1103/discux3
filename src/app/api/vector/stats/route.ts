import { getVectorDatabaseStats } from "@/lib/actions/ai"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const result = await getVectorDatabaseStats()

    return NextResponse.json(result)
  } catch (error) {
    console.error("Vector stats API error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error while fetching vector database statistics"
      },
      { status: 500 }
    )
  }
}