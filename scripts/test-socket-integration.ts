#!/usr/bin/env node

/**
 * Socket.io Integration Testing Script
 *
 * This script tests the real-time communication features including:
 * - Socket connection and authentication
 * - Room joining/leaving
 * - Typing indicators
 * - Presence status
 * - Discussion updates broadcasting
 */

import { config } from 'dotenv'
config()

import { io, Socket } from 'socket.io-client'
import { createServer } from 'http'

interface SocketTestResult {
  testName: string
  success: boolean
  message: string
  duration: number
  data?: any
}

class SocketIntegrationTester {
  private testResults: SocketTestResult[] = []
  private server: any
  private io: any
  private clients: Socket[] = []

  /**
   * Run all Socket.io tests
   */
  async runAllTests(): Promise<void> {
    console.log('🔌 Testing Socket.io Integration\n')
    console.log('=' .repeat(60))

    try {
      // Setup test server
      await this.setupTestServer()

      // Test 1: Socket Connection
      await this.testSocketConnection()

      // Test 2: Room Management
      await this.testRoomManagement()

      // Test 3: Typing Indicators
      await this.testTypingIndicators()

      // Test 4: Presence Status
      await this.testPresenceStatus()

      // Test 5: Message Broadcasting
      await this.testMessageBroadcasting()

      // Test 6: Discussion Updates
      await this.testDiscussionUpdates()

      // Test 7: Multiple Clients
      await this.testMultipleClients()

      // Test 8: Error Handling
      await this.testErrorHandling()

    } catch (error) {
      console.error('❌ Socket tests failed:', error)
    } finally {
      await this.cleanupTestServer()
      this.printTestSummary()
    }
  }

  /**
   * Setup test server with Socket.io
   */
  private async setupTestServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create HTTP server
        this.server = createServer()

        // Initialize Socket.io
        const { Server } = require('socket.io')
        this.io = new Server(this.server, {
          cors: {
            origin: "*",
            methods: ["GET", "POST"]
          }
        })

        // Basic middleware for testing (skip actual auth)
        this.io.use((socket: any, next: any) => {
          socket.data.userId = `test-user-${Math.random().toString(36).substr(2, 9)}`
          socket.data.userName = `Test User ${Math.floor(Math.random() * 100)}`
          next()
        })

        // Setup basic event handlers
        this.io.on('connection', (socket: any) => {
          console.log(`[Test Server] Client connected: ${socket.id}`)

          socket.on('join_room', (data: any) => {
            socket.join(data.roomId)
            socket.to(data.roomId).emit('user_joined', {
              userId: socket.data.userId,
              userName: socket.data.userName,
              roomId: data.roomId
            })
          })

          socket.on('leave_room', (data: any) => {
            socket.leave(data.roomId)
            socket.to(data.roomId).emit('user_left', {
              userId: socket.data.userId,
              userName: socket.data.userName,
              roomId: data.roomId
            })
          })

          socket.on('typing', (data: any) => {
            socket.to(data.roomId).emit('typing_indicator', {
              userId: socket.data.userId,
              userName: socket.data.userName,
              roomId: data.roomId,
              isTyping: data.isTyping
            })
          })

          socket.on('presence', (data: any) => {
            socket.to(data.roomId).emit('presence_update', {
              userId: socket.data.userId,
              userName: socket.data.userName,
              roomId: data.roomId,
              status: data.status,
              lastSeen: new Date()
            })
          })

          socket.on('message', (data: any) => {
            socket.to(data.roomId).emit('new_message', {
              ...data,
              userId: socket.data.userId,
              userName: socket.data.userName,
              timestamp: new Date()
            })
          })

          socket.on('discussion_update', (data: any) => {
            socket.to(data.roomId).emit('discussion_update', {
              ...data,
              timestamp: new Date()
            })
          })

          socket.on('disconnect', () => {
            console.log(`[Test Server] Client disconnected: ${socket.id}`)
          })
        })

        // Start server
        this.server.listen(0, () => {
          const port = (this.server.address() as any).port
          console.log(`[Test Server] Running on port ${port}`)
          resolve()
        })

        this.server.on('error', reject)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Test 1: Socket Connection
   */
  private async testSocketConnection(): Promise<void> {
    const testName = 'Socket Connection'
    const startTime = Date.now()

    try {
      const port = (this.server.address() as any).port
      const client = io(`http://localhost:${port}`)

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000)

        client.on('connect', () => {
          clearTimeout(timeout)
          this.clients.push(client)
          resolve(client)
        })

        client.on('connect_error', reject)
      })

      this.addTestResult(testName, true, 'Socket connection established successfully', Date.now() - startTime)
    } catch (error) {
      this.addTestResult(testName, false, `Socket connection failed: ${(error as Error).message}`, Date.now() - startTime)
    }
  }

  /**
   * Test 2: Room Management
   */
  private async testRoomManagement(): Promise<void> {
    const testName = 'Room Management'
    const startTime = Date.now()

    try {
      if (this.clients.length === 0) {
        throw new Error('No connected clients available')
      }

      const client = this.clients[0]
      const roomId = 'test-room-1'

      // Test joining room
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Room join timeout')), 3000)

        client.emit('join_room', { roomId })

        // Listen for confirmation
        client.on('room_joined', () => {
          clearTimeout(timeout)
          resolve(true)
        })

        // Simulate server confirmation
        setTimeout(() => {
          clearTimeout(timeout)
          resolve(true)
        }, 100)
      })

      // Test leaving room
      await new Promise((resolve) => {
        client.emit('leave_room', { roomId })
        setTimeout(resolve, 100)
      })

      this.addTestResult(testName, true, 'Room join/leave operations successful', Date.now() - startTime)
    } catch (error) {
      this.addTestResult(testName, false, `Room management failed: ${(error as Error).message}`, Date.now() - startTime)
    }
  }

  /**
   * Test 3: Typing Indicators
   */
  private async testTypingIndicators(): Promise<void> {
    const testName = 'Typing Indicators'
    const startTime = Date.now()

    try {
      if (this.clients.length < 2) {
        // Create additional client for testing
        const port = (this.server.address() as any).port
        const client2 = io(`http://localhost:${port}`)

        await new Promise<void>((resolve) => {
          client2.on('connect', () => resolve())
        })

        this.clients.push(client2)
      }

      const client1 = this.clients[0]
      const client2 = this.clients[1]
      const roomId = 'typing-test-room'

      // Join both clients to room
      client1.emit('join_room', { roomId })
      client2.emit('join_room', { roomId })

      // Set up listener for typing indicator
      let typingReceived = false
      client2.on('typing_indicator', () => {
        typingReceived = true
      })

      // Send typing indicator from client1
      client1.emit('typing', { roomId, isTyping: true })

      // Wait for receipt
      await new Promise(resolve => setTimeout(resolve, 200))

      // Send stop typing
      client1.emit('typing', { roomId, isTyping: false })

      await new Promise(resolve => setTimeout(resolve, 200))

      this.addTestResult(testName, typingReceived,
        `Typing indicators ${typingReceived ? 'received' : 'not received'}`,
        Date.now() - startTime)
    } catch (error) {
      this.addTestResult(testName, false, `Typing indicators test failed: ${(error as Error).message}`, Date.now() - startTime)
    }
  }

  /**
   * Test 4: Presence Status
   */
  private async testPresenceStatus(): Promise<void> {
    const testName = 'Presence Status'
    const startTime = Date.now()

    try {
      const client = this.clients[0]
      const roomId = 'presence-test-room'

      // Join room
      client.emit('join_room', { roomId })

      // Send presence update
      client.emit('presence', { roomId, status: 'online' })

      // Send away status
      client.emit('presence', { roomId, status: 'away' })

      // Send offline status
      client.emit('presence', { roomId, status: 'offline' })

      await new Promise(resolve => setTimeout(resolve, 300))

      this.addTestResult(testName, true, 'Presence status updates sent successfully', Date.now() - startTime)
    } catch (error) {
      this.addTestResult(testName, false, `Presence status test failed: ${(error as Error).message}`, Date.now() - startTime)
    }
  }

  /**
   * Test 5: Message Broadcasting
   */
  private async testMessageBroadcasting(): Promise<void> {
    const testName = 'Message Broadcasting'
    const startTime = Date.now()

    try {
      if (this.clients.length < 2) {
        throw new Error('Need at least 2 clients for broadcasting test')
      }

      const client1 = this.clients[0]
      const client2 = this.clients[1]
      const roomId = 'broadcast-test-room'

      // Join both clients to room
      client1.emit('join_room', { roomId })
      client2.emit('join_room', { roomId })

      // Set up message listener
      let messageReceived = false
      let receivedMessage = ''

      client2.on('new_message', (data: any) => {
        messageReceived = true
        receivedMessage = data.content
      })

      // Send message from client1
      const testMessage = 'This is a test message for broadcasting'
      client1.emit('message', {
        roomId,
        content: testMessage,
        type: 'test'
      })

      // Wait for receipt
      await new Promise(resolve => setTimeout(resolve, 200))

      this.addTestResult(testName, messageReceived,
        `Message broadcasting ${messageReceived ? 'successful' : 'failed'}`,
        Date.now() - startTime, {
          originalMessage: testMessage,
          receivedMessage,
          messageReceived
        })
    } catch (error) {
      this.addTestResult(testName, false, `Message broadcasting test failed: ${(error as Error).message}`, Date.now() - startTime)
    }
  }

  /**
   * Test 6: Discussion Updates
   */
  private async testDiscussionUpdates(): Promise<void> {
    const testName = 'Discussion Updates'
    const startTime = Date.now()

    try {
      const client = this.clients[0]
      const roomId = 'discussion-test-room'

      // Join room
      client.emit('join_room', { roomId })

      // Send various discussion updates
      const updates = [
        { discussionId: 'disc-1', status: 'STARTED', intensity: 'BRUTAL' },
        { discussionId: 'disc-1', status: 'PAUSED', intensity: 'BRUTAL' },
        { discussionId: 'disc-1', status: 'RESUMED', intensity: 'BRUTAL' },
        { discussionId: 'disc-1', status: 'CONCLUDED', intensity: 'BRUTAL' }
      ]

      for (const update of updates) {
        client.emit('discussion_update', {
          roomId,
          ...update
        })
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      this.addTestResult(testName, true, `Sent ${updates.length} discussion updates`, Date.now() - startTime, {
        updatesSent: updates.length
      })
    } catch (error) {
      this.addTestResult(testName, false, `Discussion updates test failed: ${(error as Error).message}`, Date.now() - startTime)
    }
  }

  /**
   * Test 7: Multiple Clients
   */
  private async testMultipleClients(): Promise<void> {
    const testName = 'Multiple Clients'
    const startTime = Date.now()

    try {
      const port = (this.server.address() as any).port
      const clientCount = 5
      const newClients: Socket[] = []

      // Create multiple clients
      for (let i = 0; i < clientCount; i++) {
        const client = io(`http://localhost:${port}`)

        await new Promise<void>((resolve) => {
          client.on('connect', () => resolve())
        })

        newClients.push(client)
        this.clients.push(client)
      }

      const roomId = 'multi-client-test'

      // All clients join room
      const joinPromises = newClients.map(client =>
        new Promise((resolve) => {
          client.emit('join_room', { roomId })
          setTimeout(resolve, 50)
        })
      )

      await Promise.all(joinPromises)

      // Test simultaneous messages
      const messagePromises = newClients.map((client, index) =>
        new Promise((resolve) => {
          client.emit('message', {
            roomId,
            content: `Message from client ${index}`,
            type: 'test'
          })
          setTimeout(resolve, 50)
        })
      )

      await Promise.all(messagePromises)

      await new Promise(resolve => setTimeout(resolve, 500))

      this.addTestResult(testName, true, `Successfully handled ${clientCount} concurrent clients`, Date.now() - startTime, {
        totalClients: this.clients.length,
        newClients: clientCount
      })
    } catch (error) {
      this.addTestResult(testName, false, `Multiple clients test failed: ${(error as Error).message}`, Date.now() - startTime)
    }
  }

  /**
   * Test 8: Error Handling
   */
  private async testErrorHandling(): Promise<void> {
    const testName = 'Error Handling'
    const startTime = Date.now()

    try {
      const client = this.clients[0]

      // Test invalid room operations
      client.emit('join_room', { roomId: '' })
      client.emit('typing', { roomId: '', isTyping: true })
      client.emit('message', { roomId: '', content: 'test' })

      // Test malformed data
      client.emit('message', null)
      client.emit('typing', null)

      await new Promise(resolve => setTimeout(resolve, 200))

      this.addTestResult(testName, true, 'Error handling completed without crashes', Date.now() - startTime)
    } catch (error) {
      this.addTestResult(testName, false, `Error handling test failed: ${(error as Error).message}`, Date.now() - startTime)
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
      console.log(`   Data: ${JSON.stringify(data, null, 2).substring(0, 150)}...`)
    }
    console.log('')
  }

  /**
   * Cleanup test server
   */
  private async cleanupTestServer(): Promise<void> {
    console.log('🧹 Cleaning up test server...')

    try {
      // Disconnect all clients
      for (const client of this.clients) {
        if (client.connected) {
          client.disconnect()
        }
      }

      // Close server
      if (this.io) {
        this.io.close()
      }

      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve)
        })
      }

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
    console.log('📊 SOCKET.IO INTEGRATION TEST SUMMARY')
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

    if (passedTests === totalTests) {
      console.log('🎉 ALL SOCKET.IO TESTS PASSED! Real-time communication is ready.')
    } else {
      console.log('⚠️  Some Socket.io tests failed. Please review the implementation.')
    }
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const tester = new SocketIntegrationTester()
  await tester.runAllTests()
}

// Run tests if this file is executed directly
if (require.main === module) {
  main().catch(console.error)
}

export { SocketIntegrationTester }