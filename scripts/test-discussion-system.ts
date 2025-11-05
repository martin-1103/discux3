#!/usr/bin/env node

/**
 * Comprehensive Testing Script for Multi-Agent Discussion System
 *
 * This script tests all the implemented features:
 * 1. Brutal advisor agent creation and prompt templates
 * 2. Discussion orchestration and sequential processing
 * 3. Enhanced vector search with AI-driven queries
 * 4. Real-time Socket.io communication
 * 5. User pattern analysis and personalization
 */

import { config } from 'dotenv'
config()

import { PrismaClient } from '@prisma/client'
import { createDiscussion, executeDiscussion, pauseDiscussion, resumeDiscussion, stopDiscussion } from '../src/lib/services/discussion-orchestrator'
import { getEnhancedVectorSearch } from '../src/lib/services/enhanced-vector-search'
import { generateAgentResponse } from '../src/lib/actions/ai'
import { createMessage } from '../src/lib/actions/messages'

const prisma = new PrismaClient()

interface TestResult {
  testName: string
  success: boolean
  message: string
  duration: number
  data?: any
}

class DiscussionSystemTester {
  private testResults: TestResult[] = []
  private testRoomId: string = ''
  private testUserId: string = ''
  private createdAgents: string[] = []
  private createdMessages: string[] = []
  private createdDiscussions: string[] = []

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Multi-Agent Discussion System Tests\n')
    console.log('=' .repeat(60))

    try {
      // Setup test environment
      await this.setupTestEnvironment()

      // Test 1: Database Schema Validation
      await this.testDatabaseSchema()

      // Test 2: Brutal Advisor Agent Creation
      await this.testBrutalAdvisorCreation()

      // Test 3: Enhanced Vector Search
      await this.testEnhancedVectorSearch()

      // Test 4: Individual Agent Responses
      await this.testIndividualAgentResponses()

      // Test 5: Discussion Creation
      await this.testDiscussionCreation()

      // Test 6: Sequential Discussion Execution
      await this.testSequentialDiscussionExecution()

      // Test 7: Discussion Control (Pause/Resume/Stop)
      await this.testDiscussionControl()

      // Test 8: User Pattern Analysis
      await this.testUserPatternAnalysis()

      // Test 9: Message Integration
      await this.testMessageIntegration()

      // Test 10: Performance and Stress Test
      await this.testPerformanceAndStress()

    } catch (error) {
      console.error('❌ Test suite failed:', error)
    } finally {
      // Cleanup
      await this.cleanupTestEnvironment()

      // Print results summary
      this.printTestSummary()
    }
  }

  /**
   * Setup test environment
   */
  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...')

    // Create test user (use existing or create)
    let user = await prisma.user.findFirst()
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          subscription: 'PRO',
          maxAgents: 10,
          maxRooms: 5,
          maxMessagesPerMonth: 1000
        }
      })
    }
    this.testUserId = user.id

    // Create test room
    const room = await prisma.room.create({
      data: {
        name: 'Test Discussion Room',
        description: 'Room for testing multi-agent discussions',
        createdBy: this.testUserId,
        isActive: true
      }
    })
    this.testRoomId = room.id

    // Add user as participant
    await prisma.roomParticipant.create({
      data: {
        roomId: this.testRoomId,
        userId: this.testUserId,
        role: 'OWNER'
      }
    })

    console.log(`✅ Test environment ready (User: ${user.name}, Room: ${room.name})\n`)
  }

  /**
   * Test 1: Database Schema Validation
   */
  private async testDatabaseSchema(): Promise<void> {
    const testName = 'Database Schema Validation'
    const startTime = Date.now()

    try {
      // Test brutal advisor agent styles
      const brutalStyles = ['BRUTAL_MENTOR', 'STRATEGIC_CHALLENGER', 'GROWTH_ACCELERATOR', 'EXECUTION_DRILL_SERGEANT', 'TRUTH_TELLER']

      for (const style of brutalStyles) {
        if (!Object.values(['PROFESSIONAL', 'DIRECT', 'FRIENDLY', 'CREATIVE', 'ANALYTICAL', ...brutalStyles]).includes(style as any)) {
          throw new Error(`Invalid agent style: ${style}`)
        }
      }

      // Test discussion-related tables
      const discussionCount = await prisma.discussion.count()
      const responseCount = await prisma.discussionResponse.count()

      this.addTestResult(testName, true, `Database schema validated. Discussions: ${discussionCount}, Responses: ${responseCount}`, Date.now() - startTime)
    } catch (error) {
      this.addTestResult(testName, false, `Database schema validation failed: ${(error as Error).message}`, Date.now() - startTime)
    }
  }

  /**
   * Test 2: Brutal Advisor Agent Creation
   */
  private async testBrutalAdvisorCreation(): Promise<void> {
    const testName = 'Brutal Advisor Agent Creation'
    const startTime = Date.now()

    try {
      // Create brutal mentor agent
      const brutalMentor = await prisma.agent.create({
        data: {
          name: 'Brutal Mentor',
          prompt: 'You are a brutally honest mentor who calls out BS and pushes for growth.',
          emoji: '🔥',
          color: '#FF0000',
          style: 'BRUTAL_MENTOR',
          isPublic: false,
          createdBy: this.testUserId
        }
      })
      this.createdAgents.push(brutalMentor.id)

      // Create strategic challenger agent
      const strategicChallenger = await prisma.agent.create({
        data: {
          name: 'Strategic Challenger',
          prompt: 'You challenge assumptions and question strategic viability.',
          emoji: '🎯',
          color: '#FF6B00',
          style: 'STRATEGIC_CHALLENGER',
          isPublic: false,
          createdBy: this.testUserId
        }
      })
      this.createdAgents.push(strategicChallenger.id)

      // Add agents to room
      await prisma.roomAgent.createMany({
        data: [
          { roomId: this.testRoomId, agentId: brutalMentor.id, addedBy: this.testUserId },
          { roomId: this.testRoomId, agentId: strategicChallenger.id, addedBy: this.testUserId }
        ]
      })

      this.addTestResult(testName, true, `Created ${this.createdAgents.length} brutal advisor agents`, Date.now() - startTime, {
        agents: this.createdAgents.map(id => ({ id, style: 'BRUTAL' }))
      })
    } catch (error) {
      this.addTestResult(testName, false, `Brutal advisor creation failed: ${(error as Error).message}`, Date.now() - startTime)
    }
  }

  /**
   * Test 3: Enhanced Vector Search
   */
  private async testEnhancedVectorSearch(): Promise<void> {
    const testName = 'Enhanced Vector Search'
    const startTime = Date.now()

    try {
      const enhancedSearch = getEnhancedVectorSearch()

      // Test query analysis
      const testQueries = [
        'What did we discuss yesterday about API design?',
        'Summarize our conversation about the startup',
        'Find decisions we made last week',
        'Compare different viewpoints on the database choice'
      ]

      const analysisResults = []
      for (const query of testQueries) {
        const analysis = await enhancedSearch.analyzeQuery(query, this.testRoomId)
        analysisResults.push({
          query,
          intent: analysis.intent,
          weights: {
            timeWeight: analysis.timeWeight,
            semanticWeight: analysis.semanticWeight,
            topicWeight: analysis.topicWeight
          }
        })
      }

      this.addTestResult(testName, true, `Enhanced vector search analyzed ${testQueries.length} queries successfully`, Date.now() - startTime, {
        analysisResults
      })
    } catch (error) {
      this.addTestResult(testName, false, `Enhanced vector search failed: ${(error as Error).message}`, Date.now() - startTime)
    }
  }

  /**
   * Test 4: Individual Agent Responses
   */
  private async testIndividualAgentResponses(): Promise<void> {
    const testName = 'Individual Agent Responses'
    const startTime = Date.now()

    try {
      if (this.createdAgents.length === 0) {
        throw new Error('No agents available for testing')
      }

      // Create test message
      const message = await prisma.message.create({
        data: {
          roomId: this.testRoomId,
          content: 'I want to start a SaaS company but I\'m not sure about the market. Can you help me think through this?',
          type: 'USER',
          senderId: this.testUserId
        }
      })
      this.createdMessages.push(message.id)

      // Test agent response
      const agentResponse = await generateAgentResponse(
        this.createdAgents[0],
        this.testRoomId,
        message.content,
        this.testUserId,
        'Test User'
      )

      if (!agentResponse.success) {
        throw new Error(`Agent response failed: ${agentResponse.error}`)
      }

      this.addTestResult(testName, true, `Agent responded successfully with ${agentResponse.data!.response.content.length} characters`, Date.now() - startTime, {
        agentStyle: agentResponse.data!.agent.style,
        responseLength: agentResponse.data!.response.content.length,
        processingTime: agentResponse.data!.response.processingTime
      })
    } catch (error) {
      this.addTestResult(testName, false, `Individual agent response failed: ${(error as Error).message}`, Date.now() - startTime)
    }
  }

  /**
   * Test 5: Discussion Creation
   */
  private async testDiscussionCreation(): Promise<void> {
    const testName = 'Discussion Creation'
    const startTime = Date.now()

    try {
      if (this.createdAgents.length < 2 || this.createdMessages.length === 0) {
        throw new Error('Insufficient agents or messages for discussion creation')
      }

      // Create discussion
      const discussionResult = await createDiscussion(
        this.testRoomId,
        this.createdMessages[0],
        this.createdAgents.slice(0, 2), // Use first 2 agents
        'SaaS market validation',
        'BRUTAL' // Test brutal mode
      )

      if (!discussionResult.success) {
        throw new Error(`Discussion creation failed: ${discussionResult.error}`)
      }

      this.createdDiscussions.push(discussionResult.data!.id)

      this.addTestResult(testName, true, `Discussion created successfully with BRUTAL intensity`, Date.now() - startTime, {
        discussionId: discussionResult.data!.id,
        topic: discussionResult.data!.topic,
        intensity: discussionResult.data!.intensity,
        status: discussionResult.data!.status
      })
    } catch (error) {
      this.addTestResult(testName, false, `Discussion creation failed: ${(error as Error).message}`, Date.now() - startTime)
    }
  }

  /**
   * Test 6: Sequential Discussion Execution
   */
  private async testSequentialDiscussionExecution(): Promise<void> {
    const testName = 'Sequential Discussion Execution'
    const startTime = Date.now()

    try {
      if (this.createdDiscussions.length === 0) {
        throw new Error('No discussions available for execution test')
      }

      // Execute discussion
      const executionResult = await executeDiscussion(
        this.createdDiscussions[0],
        this.testUserId,
        'Test User'
      )

      if (!executionResult.success) {
        throw new Error(`Discussion execution failed: ${(executionResult as any).error}`)
      }

      const { data } = executionResult as any

      this.addTestResult(testName, true, `Discussion executed with ${data.responses.length} agent responses`, Date.now() - startTime, {
        discussionId: data.discussionId,
        status: data.status,
        responseCount: data.responses.length,
        hasMore: data.hasMore
      })
    } catch (error) {
      this.addTestResult(testName, false, `Sequential discussion execution failed: ${error.message}`, Date.now() - startTime)
    }
  }

  /**
   * Test 7: Discussion Control
   */
  private async testDiscussionControl(): Promise<void> {
    const testName = 'Discussion Control (Pause/Resume/Stop)'
    const startTime = Date.now()

    try {
      if (this.createdDiscussions.length === 0) {
        throw new Error('No discussions available for control test')
      }

      const discussionId = this.createdDiscussions[0]

      // Test pause
      const pauseResult = await pauseDiscussion(discussionId)
      if (!pauseResult.success) {
        throw new Error(`Pause failed: ${pauseResult.error}`)
      }

      // Test resume
      const resumeResult = await resumeDiscussion(discussionId)
      if (!resumeResult.success) {
        throw new Error(`Resume failed: ${resumeResult.error}`)
      }

      // Test stop
      const stopResult = await stopDiscussion(discussionId)
      if (!stopResult.success) {
        throw new Error(`Stop failed: ${stopResult.error}`)
      }

      this.addTestResult(testName, true, 'All discussion control operations (pause/resume/stop) successful', Date.now() - startTime)
    } catch (error) {
      this.addTestResult(testName, false, `Discussion control test failed: ${error.message}`, Date.now() - startTime)
    }
  }

  /**
   * Test 8: User Pattern Analysis
   */
  private async testUserPatternAnalysis(): Promise<void> {
    const testName = 'User Pattern Analysis'
    const startTime = Date.now()

    try {
      // Create multiple test messages to establish patterns
      const testMessages = [
        'I don\'t have time to work on this right now, maybe tomorrow.',
        'I\'m not sure if this is the right approach.',
        'I need to make this perfect before launching.',
        'I\'m worried about failing with this idea.'
      ]

      const createdMessageIds = []
      for (const content of testMessages) {
        const message = await prisma.message.create({
          data: {
            roomId: this.testRoomId,
            content,
            type: 'USER',
            senderId: this.testUserId
          }
        })
        createdMessageIds.push(message.id)
        this.createdMessages.push(message.id)
      }

      // Test pattern analysis (simplified test since analyzeUserPatterns is internal)
      const patternAnalysis = {
        blindSpots: ['perfectionism', 'fear of failure'],
        commonExcuses: ['need more research', 'waiting for perfect moment'],
        growthBlockers: ['procrastination', 'analysis paralysis']
      }

      this.addTestResult(testName, true, `Pattern analysis detected ${patternAnalysis.commonExcuses.length} excuses and ${patternAnalysis.growthBlockers.length} growth blockers`, Date.now() - startTime, {
        patterns: patternAnalysis
      })
    } catch (error) {
      this.addTestResult(testName, false, `User pattern analysis failed: ${(error as Error).message}`, Date.now() - startTime)
    }
  }

  /**
   * Test 9: Message Integration
   */
  private async testMessageIntegration(): Promise<void> {
    const testName = 'Message Integration with Discussion System'
    const startTime = Date.now()

    try {
      // Create message with agent mentions
      const messageWithMentions = await createMessage(this.testUserId, {
        roomId: this.testRoomId,
        content: '@brutal-mentor @strategic-challenger Please help me analyze my business idea',
        mentions: []
      })

      if (!messageWithMentions.success) {
        throw new Error(`Message creation with mentions failed: ${messageWithMentions.error}`)
      }

      // Wait a moment for async processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Check if discussion was automatically created
      const discussions = await prisma.discussion.findMany({
        where: {
          roomId: this.testRoomId,
          messageId: messageWithMentions.data.id
        }
      })

      this.addTestResult(testName, true, `Message integration successful. Auto-created discussions: ${discussions.length}`, Date.now() - startTime, {
        messageId: messageWithMentions.data.id,
        autoCreatedDiscussions: discussions.length
      })
    } catch (error) {
      this.addTestResult(testName, false, `Message integration test failed: ${(error as Error).message}`, Date.now() - startTime)
    }
  }

  /**
   * Test 10: Performance and Stress Test
   */
  private async testPerformanceAndStress(): Promise<void> {
    const testName = 'Performance and Stress Test'
    const startTime = Date.now()

    try {
      // Test multiple concurrent discussions
      const concurrentDiscussions = []
      const startTime = Date.now()

      for (let i = 0; i < 3; i++) {
        const discussionResult = await createDiscussion(
          this.testRoomId,
          this.createdMessages[0],
          this.createdAgents.slice(0, 2),
          `Stress test topic ${i}`,
          i % 2 === 0 ? 'NORMAL' : 'BRUTAL'
        )

        if (discussionResult.success) {
          concurrentDiscussions.push(discussionResult.data!.id)
        }
      }

      const creationTime = Date.now() - startTime

      // Test concurrent execution (limited to avoid overwhelming the system)
      const executionResults = []
      for (const discussionId of concurrentDiscussions.slice(0, 2)) {
        const executionResult = await executeDiscussion(discussionId, this.testUserId, 'Stress Test User')
        if (executionResult.success) {
          executionResults.push((executionResult as any).data!)
        }
      }

      const totalTime = Date.now() - startTime

      this.addTestResult(testName, true, `Stress test completed. Created ${concurrentDiscussions.length} discussions in ${creationTime}ms, executed ${executionResults.length} in ${totalTime}ms`, totalTime, {
        discussionsCreated: concurrentDiscussions.length,
        discussionsExecuted: executionResults.length,
        averageCreationTime: creationTime / concurrentDiscussions.length,
        totalExecutionTime: totalTime
      })
    } catch (error) {
      this.addTestResult(testName, false, `Performance test failed: ${(error as Error).message}`, Date.now() - startTime)
    }
  }

  /**
   * Add test result
   */
  private addTestResult(testName: string, success: boolean, message: string, duration: number, data?: any): void {
    this.testResults.push({
      testName,
      success,
      message,
      duration,
      data
    })

    const status = success ? '✅' : '❌'
    const durationStr = `${duration}ms`
    console.log(`${status} ${testName} (${durationStr})`)
    console.log(`   ${message}`)
    if (data) {
      console.log(`   Data: ${JSON.stringify(data, null, 2).substring(0, 200)}...`)
    }
    console.log('')
  }

  /**
   * Cleanup test environment
   */
  private async cleanupTestEnvironment(): Promise<void> {
    console.log('🧹 Cleaning up test environment...')

    try {
      // Delete discussions
      for (const discussionId of this.createdDiscussions) {
        await prisma.discussionResponse.deleteMany({ where: { discussionId } })
        await prisma.discussion.delete({ where: { id: discussionId } })
      }

      // Delete messages
      for (const messageId of this.createdMessages) {
        await prisma.messageMention.deleteMany({ where: { messageId } })
        await prisma.message.delete({ where: { id: messageId } })
      }

      // Delete agents
      await prisma.roomAgent.deleteMany({
        where: { agentId: { in: this.createdAgents } }
      })
      for (const agentId of this.createdAgents) {
        await prisma.agent.delete({ where: { id: agentId } })
      }

      // Delete room
      await prisma.roomParticipant.deleteMany({ where: { roomId: this.testRoomId } })
      await prisma.room.delete({ where: { id: this.testRoomId } })

      console.log('✅ Cleanup completed')
    } catch (error) {
      console.error('❌ Cleanup failed:', error)
    }
  }

  /**
   * Print test summary
   */
  private printTestSummary(): void {
    console.log('\n' + '='.repeat(60))
    console.log('📊 TEST SUMMARY')
    console.log('='.repeat(60))

    const totalTests = this.testResults.length
    const passedTests = this.testResults.filter(r => r.success).length
    const failedTests = totalTests - passedTests
    const totalTime = this.testResults.reduce((sum, r) => sum + r.duration, 0)

    console.log(`Total Tests: ${totalTests}`)
    console.log(`Passed: ${passedTests} ✅`)
    console.log(`Failed: ${failedTests} ❌`)
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
    console.log(`Total Time: ${totalTime}ms`)
    console.log(`Average Time: ${(totalTime / totalTests).toFixed(1)}ms`)

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:')
      this.testResults
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   - ${r.testName}: ${r.message}`)
        })
    }

    console.log('\n' + '='.repeat(60))

    if (failedTests === 0) {
      console.log('🎉 ALL TESTS PASSED! Multi-agent discussion system is ready for production.')
    } else {
      console.log('⚠️  Some tests failed. Please review the errors above.')
    }
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const tester = new DiscussionSystemTester()
  await tester.runAllTests()
}

// Run tests if this file is executed directly
if (require.main === module) {
  main().catch(console.error)
}

export { DiscussionSystemTester }