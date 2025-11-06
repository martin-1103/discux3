import { NextRequest, NextResponse } from 'next/server'
import { storeConversationMessage } from '@/lib/vector-store'

export async function POST(_request: NextRequest) {
  try {
    // Test the vector storage with a test message
    const testMessageId = 'testmsg' + Date.now()
    const testRoomId = 'cmhkoleb0000714aj3qpgo4im' // Use existing room ID

    await storeConversationMessage(
      testRoomId,
      testMessageId,
      'Test message for vector storage validation',
      'Test User',
      'user'
    )

    return NextResponse.json({
      success: true,
      message: 'Vector storage test completed successfully',
      messageId: testMessageId
    })
  } catch (error) {
    console.error('Vector storage test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}