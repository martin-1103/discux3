import { NextRequest, NextResponse } from 'next/server'
import { createMessage } from '@/lib/actions/messages'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomId, content, userId } = body

    if (!roomId || !content || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: roomId, content, userId'
      }, { status: 400 })
    }

    // Create a test message with proper validation
    const result = await createMessage(userId, {
      roomId,
      content,
      mentions: [] // No agent mentions for test
    })

    return NextResponse.json({
      success: true,
      message: 'Test message created successfully',
      data: result
    })
  } catch (error) {
    console.error('Test message creation failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}