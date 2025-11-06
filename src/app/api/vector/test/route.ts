import { testVectorDatabase } from "@/lib/actions/ai"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const result = await testVectorDatabase()

    return NextResponse.json(result)
  } catch (error) {
    console.error("Vector test API error:", error)

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error during vector database test"
      },
      { status: 500 }
    )
  }
}