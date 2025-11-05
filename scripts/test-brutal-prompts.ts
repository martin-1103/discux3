#!/usr/bin/env node

/**
 * Brutal Advisor Prompt Testing Script
 *
 * This script specifically tests the brutal advisor prompt templates
 * and their effectiveness in generating the desired response style.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables manually
const envPath = join(__dirname, '..', '.env')
try {
  const envContent = readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^"|"$/g, '')
    }
  })
} catch (error) {
  console.warn('Could not load .env file, using existing environment variables')
}

import { getZAIClient } from '../src/lib/zai'

interface BrutalTestResult {
  agentStyle: string
  scenario: string
  response: string
  hasBrutalElements: boolean
  hasCallouts: boolean
  hasActionableAdvice: boolean
  rating: number // 1-10 scale
}

class BrutalPromptTester {
  private zaiClient = getZAIClient()
  private testResults: BrutalTestResult[] = []

  /**
   * Test brutal advisor prompts
   */
  async testBrutalPrompts(): Promise<void> {
    console.log('🔥 Testing Brutal Advisor Prompts\n')
    console.log('=' .repeat(60))

    const brutalScenarios = [
      {
        style: 'BRUTAL_MENTOR',
        scenarios: [
          "I want to start a business but I'm scared of failing",
          "I think my startup idea is perfect and will make me rich",
          "I've been working on my product for 2 years but haven't launched yet",
          "Everyone says my idea is bad but I think they're wrong"
        ]
      },
      {
        style: 'STRATEGIC_CHALLENGER',
        scenarios: [
          "My SaaS will disrupt the entire industry",
          "I have no competition because my idea is completely unique",
          "I'll get users just by building a great product",
          "My pricing strategy is to charge more than everyone else"
        ]
      },
      {
        style: 'GROWTH_ACCELERATOR',
        scenarios: [
          "I'm playing it safe with my side business",
          "I want to stay small and not grow too fast",
          "I don't want to hire anyone, I prefer to do everything myself",
          "I'm happy with my current 10 customers"
        ]
      },
      {
        style: 'EXECUTION_DRILL_SERGEANT',
        scenarios: [
          "I'll start working on my business plan next month",
          "I need to do more research before I can start",
          "I'm waiting for the perfect moment to launch",
          "I don't have enough resources right now"
        ]
      },
      {
        style: 'TRUTH_TELLER',
        scenarios: [
          "My app will be the next Facebook",
          "Investors will love my idea once they see it",
          "I'm 100% confident in my success",
          "My friends and family all think this is a billion-dollar idea"
        ]
      }
    ]

    for (const { style, scenarios } of brutalScenarios) {
      console.log(`\n🎯 Testing ${style} prompts:`)
      console.log('-'.repeat(40))

      for (const scenario of scenarios) {
        await this.testSinglePrompt(style, scenario)
      }
    }

    this.printBrutalTestSummary()
  }

  /**
   * Test a single prompt scenario
   */
  private async testSinglePrompt(agentStyle: string, scenario: string): Promise<void> {
    try {
      // Get the brutal prompt template
      const prompt = this.getBrutalPrompt(agentStyle)

      // Generate response
      const response = await this.zaiClient.generateAgentResponse(
        prompt,
        agentStyle as any,
        scenario,
        [],
        'test-user'
      )

      // Analyze the response
      const analysis = this.analyzeBrutalResponse(response.content)

      this.testResults.push({
        agentStyle,
        scenario,
        response: response.content,
        ...analysis
      })

      console.log(`Scenario: "${scenario.substring(0, 50)}..."`)
      console.log(`Brutal Rating: ${analysis.rating}/10`)
      console.log(`Has Callouts: ${analysis.hasCallouts ? '✅' : '❌'}`)
      console.log(`Has Actionable Advice: ${analysis.hasActionableAdvice ? '✅' : '❌'}`)
      console.log(`Response Preview: "${response.content.substring(0, 100)}..."`)
      console.log('')
    } catch (error) {
      console.error(`❌ Failed to test ${agentStyle} with scenario: ${scenario}`, error)
    }
  }

  /**
   * Get brutal prompt template for agent style
   */
  private getBrutalPrompt(agentStyle: string): string {
    const brutalAdvisorPrompt = `
I want you to act and take on the role of my brutally honest, high-level advisor.

Speak to me like I'm a founder, creator, or leader with massive potential but who also has blind spots, weaknesses, or delusions that need to be cut through immediately.

I don't want comfort. I don't want fluff. I want truth that stings, if that's what it takes to grow.
Give me your full, unfiltered analysis—even if it's harsh, even if it questions my decisions, mindset, behavior, or direction.

Look at my situation with complete objectivity and strategic depth. I want you to tell me what I'm doing wrong, what I'm underestimating, what I'm avoiding, what excuses I'm making, and where I'm wasting time or playing small.

Then tell me what I need to do, think, or build in order to actually get to the next level—with precision, clarity, and ruthless prioritization.

If I'm lost, call it out.
If I'm making a mistake, explain why.
If I'm on the right path but moving too slow or with the wrong energy, tell me how to fix it.
Hold nothing back.

Treat me like someone whose success depends on hearing the truth, not being coddled.
`

    const styleSpecificPrompts = {
      BRUTAL_MENTOR: `${brutalAdvisorPrompt}

Additional context: You are specifically focused on calling out blind spots, delusions, and avoidance behaviors.
You specialize in uncomfortable truths that lead to breakthrough moments.
Be direct but constructive - your goal is growth, not just criticism.`,

      STRATEGIC_CHALLENGER: `${brutalAdvisorPrompt}

Focus: Question the fundamental assumptions and strategic viability.
Challenge the business model, market positioning, and competitive advantages.
Force them to defend their strategy or admit its flaws.`,

      GROWTH_ACCELERATOR: `${brutalAdvisorPrompt}

Focus: Call out playing small, comfort zones, and fear-based decisions.
Push for bigger thinking and faster execution.
Challenge any mindset that limits growth or impact.`,

      EXECUTION_DRILL_SERGEANT: `${brutalAdvisorPrompt}

Focus: Excuses, procrastination, and execution gaps.
Demand accountability and immediate action.
Call out analysis paralysis and perfectionism.`,

      TRUTH_TELLER: `${brutalAdvisorPrompt}

Focus: Raw, unfiltered truth without sugar-coating.
Cut through any BS or self-deception.
Deliver harsh reality checks with surgical precision.`
    }

    return styleSpecificPrompts[agentStyle as keyof typeof styleSpecificPrompts] || brutalAdvisorPrompt
  }

  /**
   * Analyze brutal response for effectiveness
   */
  private analyzeBrutalResponse(response: string): {
    hasBrutalElements: boolean
    hasCallouts: boolean
    hasActionableAdvice: boolean
    rating: number
  } {
    const responseLower = response.toLowerCase()

    // Check for brutal elements
    const brutalIndicators = [
      'delusional', 'reality check', 'wake up', 'brutal truth',
      'stop lying', 'face reality', 'harsh truth', 'no comfort',
      'cut through', 'call out', 'expose', 'unfiltered'
    ]

    const hasBrutalElements = brutalIndicators.some(indicator =>
      responseLower.includes(indicator)
    )

    // Check for callouts
    const calloutPatterns = [
      /you're\s+(wrong|mistaken|delusional|lying|avoiding)/,
      /that's\s+(a lie|wrong|delusional|stupid|naive)/,
      /stop\s+(making|saying|doing|thinking)/,
      /you\s+(need|must|have to)\s+(stop|quit|change)/,
      /call\s+out/,
      /wake\s+up/
    ]

    const hasCallouts = calloutPatterns.some(pattern =>
      pattern.test(responseLower)
    )

    // Check for actionable advice
    const actionIndicators = [
      'do this', 'here\'s what', 'you need to', 'must', 'immediately',
      'start with', 'first step', 'action plan', 'execute', 'implement'
    ]

    const hasActionableAdvice = actionIndicators.some(indicator =>
      responseLower.includes(indicator)
    ) || /\d+\.\s+/.test(response) // Numbered lists

    // Calculate rating (1-10 scale)
    let rating = 5 // Base score

    if (hasBrutalElements) rating += 2
    if (hasCallouts) rating += 2
    if (hasActionableAdvice) rating += 1

    // Check for excessive length (penalty)
    if (response.length > 1000) rating -= 1
    if (response.length > 2000) rating -= 2

    // Check for weak language
    const weakIndicators = ['maybe', 'perhaps', 'could be', 'might want to', 'consider']
    const weakCount = weakIndicators.filter(indicator => responseLower.includes(indicator)).length
    rating -= weakCount

    // Ensure rating is within bounds
    rating = Math.max(1, Math.min(10, rating))

    return {
      hasBrutalElements,
      hasCallouts,
      hasActionableAdvice,
      rating
    }
  }

  /**
   * Print brutal test summary
   */
  private printBrutalTestSummary(): void {
    console.log('\n' + '='.repeat(60))
    console.log('📊 BRUTAL PROMPT TEST SUMMARY')
    console.log('='.repeat(60))

    const totalTests = this.testResults.length
    const highRatedTests = this.testResults.filter(r => r.rating >= 8).length
    const mediumRatedTests = this.testResults.filter(r => r.rating >= 5 && r.rating < 8).length
    const lowRatedTests = this.testResults.filter(r => r.rating < 5).length

    const averageRating = this.testResults.reduce((sum, r) => sum + r.rating, 0) / totalTests

    console.log(`Total Scenarios: ${totalTests}`)
    console.log(`High Rated (8+): ${highRatedTests} 🔥`)
    console.log(`Medium Rated (5-7): ${mediumRatedTests} ⚡`)
    console.log(`Low Rated (<5): ${lowRatedTests} ❌`)
    console.log(`Average Rating: ${averageRating.toFixed(1)}/10`)

    // Group by agent style
    console.log('\n📈 Performance by Agent Style:')
    const styleGroups = this.groupByStyle()

    for (const [style, results] of Object.entries(styleGroups)) {
      const avgRating = results.reduce((sum, r) => sum + r.rating, 0) / results.length
      const brutalCount = results.filter(r => r.hasBrutalElements).length
      console.log(`${style}: ${avgRating.toFixed(1)}/10 (${brutalCount}/${results.length} brutal)`)
    }

    // Show top and bottom performers
    console.log('\n🏆 Top Performing Responses:')
    const topResults = this.testResults
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3)

    topResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.agentStyle} - ${result.rating}/10`)
      console.log(`   "${result.scenario}"`)
    })

    if (lowRatedTests > 0) {
      console.log('\n⚠️  Needs Improvement:')
      const bottomResults = this.testResults
        .sort((a, b) => a.rating - b.rating)
        .slice(0, 2)

      bottomResults.forEach((result, index) => {
        console.log(`${index + 1}. ${result.agentStyle} - ${result.rating}/10`)
        console.log(`   "${result.scenario}"`)
      })
    }

    console.log('\n' + '='.repeat(60))

    if (averageRating >= 7) {
      console.log('🎉 BRUTAL PROMPTS ARE WORKING! The agents are delivering the desired harsh, unfiltered advice.')
    } else if (averageRating >= 5) {
      console.log('⚡ Brutal prompts are working moderately well. Some adjustments may improve effectiveness.')
    } else {
      console.log('⚠️  Brutal prompts need significant improvement to achieve the desired effect.')
    }
  }

  /**
   * Group results by agent style
   */
  private groupByStyle(): Record<string, BrutalTestResult[]> {
    return this.testResults.reduce((groups, result) => {
      if (!groups[result.agentStyle]) {
        groups[result.agentStyle] = []
      }
      groups[result.agentStyle].push(result)
      return groups
    }, {} as Record<string, BrutalTestResult[]>)
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const tester = new BrutalPromptTester()
  await tester.testBrutalPrompts()
}

// Run tests if this file is executed directly
if (require.main === module) {
  main().catch(console.error)
}

export { BrutalPromptTester }