import { NextRequest, NextResponse } from 'next/server'
import { getVectorStore } from '@/lib/vector-store'
import { getZAIClient } from '@/lib/zai'

export async function GET() {
  try {
    const results = {
      timestamp: new Date().toISOString(),
      status: 'success',
      services: {
        vector: {
          enabled: false,
          connected: false,
          message: '',
          details: null as any
        },
        ai: {
          connected: false,
          message: '',
          model: '',
          details: null as any
        }
      }
    }

    // Test Vector Database
    try {
      const vectorStore = getVectorStore()
      const vectorTest = await vectorStore.testConnection()

      results.services.vector = {
        enabled: vectorTest.success,
        connected: vectorTest.success,
        message: vectorTest.message,
        details: {
          success: vectorTest.success
        }
      }

      // Get vector stats if connected
      if (vectorTest.success) {
        const stats = await vectorStore.getStats()
        results.services.vector.details = stats
      }
    } catch (error) {
      results.services.vector = {
        enabled: false,
        connected: false,
        message: error instanceof Error ? error.message : 'Unknown vector error',
        details: null
      }
    }

    // Test AI Service (Z.ai)
    try {
      const aiClient = getZAIClient()
      const aiTest = await aiClient.testConnection()

      results.services.ai = {
        connected: aiTest.success,
        message: aiTest.message,
        model: process.env.ZAI_MODEL || 'glm-4.6',
        details: {
          success: aiTest.success
        }
      }
    } catch (error) {
      results.services.ai = {
        connected: false,
        message: error instanceof Error ? error.message : 'Unknown AI error',
        model: process.env.ZAI_MODEL || 'glm-4.6',
        details: null
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown system error',
      services: null
    }, { status: 500 })
  }
}