#!/usr/bin/env node

/**
 * Master Test Runner
 *
 * This script runs all the test scripts in sequence:
 * 1. Multi-Agent Discussion System Tests
 * 2. Brutal Advisor Prompt Tests
 * 3. Socket.io Integration Tests
 */

const { execSync } = require('child_process')
const path = require('path')

class TestRunner {
  constructor() {
    this.results = []
  }

  /**
   * Run all test suites
   */
  async runAllTests() {
    console.log('🚀 Starting Complete Test Suite')
    console.log('='.repeat(70))
    console.log('')

    const testSuites = [
      {
        name: 'Multi-Agent Discussion System',
        script: 'test-discussion-system.ts',
        description: 'Tests discussion orchestration, vector search, and integration'
      },
      {
        name: 'Brutal Advisor Prompts',
        script: 'test-brutal-prompts.ts',
        description: 'Tests brutal advisor prompt effectiveness and response quality'
      },
      {
        name: 'Socket.io Integration',
        script: 'test-socket-integration.ts',
        description: 'Tests real-time communication, typing indicators, and presence'
      }
    ]

    for (const suite of testSuites) {
      await this.runTestSuite(suite)
    }

    this.printFinalSummary()
  }

  /**
   * Run a single test suite
   */
  async runTestSuite(suite) {
    console.log(`\n📋 Running: ${suite.name}`)
    console.log(`📝 Description: ${suite.description}`)
    console.log('='.repeat(70))

    const startTime = Date.now()

    try {
      // Run the test script
      const output = execSync(`npx ts-node ${path.join(__dirname, suite.script)}`, {
        encoding: 'utf8',
        stdio: 'inherit',
        timeout: 60000 // 60 seconds timeout
      })

      const duration = Date.now() - startTime

      this.results.push({
        suite: suite.name,
        success: true,
        duration,
        output: output.toString()
      })

      console.log(`\n✅ ${suite.name} completed successfully (${duration}ms)`)
      console.log('-'.repeat(70))

    } catch (error) {
      const duration = Date.now() - startTime

      this.results.push({
        suite: suite.name,
        success: false,
        duration,
        error: error.message,
        output: error.stdout?.toString() || error.stderr?.toString()
      })

      console.log(`\n❌ ${suite.name} failed (${duration}ms)`)
      console.log(`Error: ${error.message}`)
      console.log('-'.repeat(70))
    }
  }

  /**
   * Print final summary
   */
  printFinalSummary() {
    console.log('\n' + '='.repeat(70))
    console.log('🏁 FINAL TEST RESULTS SUMMARY')
    console.log('='.repeat(70))

    const totalSuites = this.results.length
    const passedSuites = this.results.filter(r => r.success).length
    const failedSuites = totalSuites - passedSuites
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0)

    console.log(`Total Test Suites: ${totalSuites}`)
    console.log(`Passed: ${passedSuites} ✅`)
    console.log(`Failed: ${failedSuites} ❌`)
    console.log(`Success Rate: ${((passedSuites / totalSuites) * 100).toFixed(1)}%`)
    console.log(`Total Time: ${totalTime}ms`)
    console.log(`Average Time: ${(totalTime / totalSuites).toFixed(1)}ms`)

    // Show individual results
    console.log('\n📊 Individual Suite Results:')
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌'
      const duration = `${result.duration}ms`
      console.log(`${status} ${result.suite} (${duration})`)
    })

    // Show failures
    if (failedSuites > 0) {
      console.log('\n❌ Failed Suites Details:')
      this.results
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`\n${result.suite}:`)
          console.log(`Error: ${result.error}`)
          if (result.output) {
            console.log(`Output: ${result.output.substring(0, 300)}...`)
          }
        })
    }

    console.log('\n' + '='.repeat(70))

    // Overall assessment
    if (passedSuites === totalSuites) {
      console.log('🎉 ALL TEST SUITES PASSED!')
      console.log('🚀 Your multi-agent discussion system is fully operational!')
      console.log('\n✨ Features validated:')
      console.log('   • Multi-agent discussions with sequential processing')
      console.log('   • Brutal advisor prompt templates and personalization')
      console.log('   • Enhanced vector search with AI-driven query generation')
      console.log('   • Real-time Socket.io communication')
      console.log('   • User pattern analysis and contextual awareness')
      console.log('   • Discussion control (pause/resume/stop)')
      console.log('   • Message integration and automatic discussion creation')
    } else {
      console.log('⚠️  SOME TESTS FAILED')
      console.log('Please review the failed tests and fix the issues before deploying.')
    }

    // Performance analysis
    if (totalTime > 0) {
      console.log('\n⚡ Performance Analysis:')
      const avgTime = totalTime / totalSuites
      if (avgTime < 10000) {
        console.log('   🏎️  Excellent performance (< 10s per suite)')
      } else if (avgTime < 30000) {
        console.log('   ✅ Good performance (< 30s per suite)')
      } else {
        console.log('   ⚠️  Slow performance (> 30s per suite)')
      }
    }

    console.log('\n' + '='.repeat(70))
  }
}

/**
 * Main execution
 */
async function main() {
  const runner = new TestRunner()
  await runner.runAllTests()
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { TestRunner }