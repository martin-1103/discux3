import { z } from "zod"
import { getZAIClient } from "@/lib/zai"

// Agent Preview Schema (Step 1 - lightweight generation)
export const AgentPreviewSchema = z.object({
  id: z.string(),
  persona: z.string(),
  title: z.string(),
  previewPhilosophy: z.string(),
  keyCharacteristics: z.array(z.string()),
})

export type AgentPreview = z.infer<typeof AgentPreviewSchema>

// Agent Full Schema (Step 2 - complete with system role)
export const AgentFullSchema = z.object({
  id: z.string(),
  persona: z.string(),
  title: z.string(),
  previewPhilosophy: z.string(),
  keyCharacteristics: z.array(z.string()),
  fullSystemRole: z.string(),
})

export type AgentFull = z.infer<typeof AgentFullSchema>

// Legacy compatibility
export const AgentOptionSchema = AgentFullSchema
export type AgentOption = AgentFull

/**
 * Generate 10 agent previews based on user goal (Step 1 - lightweight)
 */
export async function generateAgentPreviews(goal: string): Promise<AgentPreview[]> {
  try {
    const prompt = `Based on this user goal: "${goal}"

First, analyze what domain this goal belongs to (marketing, coding, design, productivity, health, learning, finance, etc.).

Then generate 10 different expert agent PREVIEWS that are RELEVANT to the user's goal. Each persona should be based on REAL proven experts in the relevant domain.

For example:
- If goal is about marketing: Generate experts like Seth Godin, Gary Vaynerchuk, Ryan Holiday
- If goal is about coding: Generate experts like Linus Torvalds, John Carmack, Margaret Hamilton
- If goal is about design: Generate experts like Jony Ive, Dieter Rams, Paula Scher
- If goal is about productivity: Generate experts like David Allen, James Clear, Cal Newport
- If goal is about learning: Generate experts like Sal Khan, Barbara Oakley, John Dewey
- If goal is about finance: Generate experts like Warren Buffett, Ray Dalio, Benjamin Graham
- If goal is about health: Generate experts like Dr. Andrew Huberman, Atul Gawande, Peter Attia

Each preview must have:
1. A real proven expert as inspiration (living or historical)
2. A specific title and expertise area RELEVANT to user's goal
3. Core philosophy (brief, 1-2 sentences)
4. Key characteristics (3 distinct traits)

CRITICAL:
- Generate exactly 10 options
- Each option must be unique and relevant to the goal
- Focus on concise previews, not detailed system roles
- The full system role will be generated later when selected

Please return the response in the following JSON format:
{
  "options": [
    {
      "id": "1",
      "persona": "Expert Name",
      "title": "Expert Title",
      "previewPhilosophy": "Brief philosophy description (1-2 sentences)",
      "keyCharacteristics": ["characteristic 1", "characteristic 2", "characteristic 3"]
    }
  ]
}`

    const zaiClient = getZAIClient()
    const response = await zaiClient.generateAgentResponse(prompt, "TRUTH_TELLER", goal)

    // Check if response is a fallback error message (not JSON)
    if (response.content.includes("Tidak bisa memberikan respon") ||
        response.content.includes("Coba lagi") ||
        response.model === "fallback") {
      console.error("AI service returned fallback response instead of JSON")
      console.log("Raw response:", response.content)
      throw new Error("AI service unavailable - received fallback response")
    }

    // Try to parse the response as JSON
    let parsedResponse
    try {
      // Extract JSON from response if it contains extra text
      let jsonMatch = response.content.match(/```json\s*(\{[\s\S]*\})\s*```/)
      if (jsonMatch) {
        // Try to parse the extracted JSON
        try {
          parsedResponse = JSON.parse(jsonMatch[1])
        } catch (innerParseError) {
          // If JSON is incomplete, try to fix common issues
          let jsonString = jsonMatch[1]

          // Fix incomplete JSON by removing trailing commas and closing brackets
          jsonString = jsonString.replace(/,\s*$/, '') // Remove trailing comma
          jsonString = jsonString.replace(/\[\s*$/, '[') // Ensure array starts properly

          // Try to find the last complete object in the array
          const lastCompleteObject = jsonString.match(/(\{[^{}]*\})\s*$/)
          if (lastCompleteObject) {
            jsonString = jsonString.replace(/\{[^{}]*$/, '') // Remove incomplete object
            jsonString += ']' // Close the array
          }

          parsedResponse = JSON.parse(jsonString)
        }
      } else {
        // Fallback: try to find JSON without wrapper
        const plainJsonMatch = response.content.match(/\{[\s\S]*\}/)
        if (plainJsonMatch) {
          parsedResponse = JSON.parse(plainJsonMatch[0])
        } else {
          parsedResponse = JSON.parse(response.content)
        }
      }
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError)
      console.log("Raw response:", response.content.substring(0, 1000) + "...")
      throw new Error("Failed to parse agent options from AI response")
    }

    // Validate the response structure
    if (!parsedResponse.options || !Array.isArray(parsedResponse.options)) {
      console.error("Invalid response structure:", parsedResponse)
      throw new Error("AI response did not contain valid agent options array")
    }

    // Accept partial responses (less than 10 agents) but log a warning
    if (parsedResponse.options.length < 10) {
      console.warn(`Warning: Only received ${parsedResponse.options.length} agent previews instead of 10`)
    } else if (parsedResponse.options.length > 10) {
      // Trim to first 10 if we got more
      parsedResponse.options = parsedResponse.options.slice(0, 10)
    }

    // Validate each preview option
    const validatedOptions = parsedResponse.options.map((option: any, index: number) => {
      try {
        return AgentPreviewSchema.parse({
          ...option,
          id: option.id || (index + 1).toString()
        })
      } catch (validationError) {
        console.error(`Invalid preview at index ${index}:`, option)
        throw new Error(`Invalid agent preview format: ${validationError}`)
      }
    })

    return validatedOptions
  } catch (error) {
    console.error("Error generating agent previews:", error)
    throw new Error("Failed to generate agent previews")
  }
}

/**
 * Generate full system role for selected agent (Step 2)
 */
export async function generateFullAgentRole(preview: AgentPreview, goal: string): Promise<string> {
  try {
    const prompt = `Based on this user goal: "${goal}" and this expert preview:

Expert: ${preview.persona}
Title: ${preview.title}
Philosophy: ${preview.previewPhilosophy}
Characteristics: ${preview.keyCharacteristics.join(', ')}

Generate the COMPLETE system role for this expert agent with all sections:

**Core Philosophy**: Expand on their core philosophy and approach
**Communication Style**: How they communicate and interact with users
**Strategic Frameworks**: 3 specific frameworks or methods they use
**Key Questions**: Questions they would ask the user to guide them
**Expertise Areas**: Their specific areas of expertise
**Behavioral Instructions**: Specific behavioral guidelines for the AI

Focus on ACTIONABLE GUIDANCE and practical instructions. The agent should provide step-by-step approaches and concrete advice.

Return the complete system role as a comprehensive text that can be used as a system prompt.`

    const zaiClient = getZAIClient()
    const response = await zaiClient.generateAgentResponse(prompt, "TRUTH_TELLER", goal)

    // Check if response is a fallback error message
    if (response.content.includes("Tidak bisa memberikan respon") ||
        response.content.includes("Coba lagi") ||
        response.model === "fallback") {
      console.error("AI service returned fallback response instead of system role")
      console.log("Raw response:", response.content)
      throw new Error("AI service unavailable - received fallback response")
    }

    return response.content
  } catch (error) {
    console.error("Error generating full agent role:", error)
    throw new Error("Failed to generate full agent role")
  }
}

/**
 * Legacy function for backward compatibility
 */
export async function generateAgentOptions(goal: string): Promise<AgentOption[]> {
  // Generate previews first
  const previews = await generateAgentPreviews(goal)

  // Generate full roles for all previews (legacy behavior)
  const fullAgents: AgentOption[] = []

  for (const preview of previews) {
    try {
      const fullSystemRole = await generateFullAgentRole(preview, goal)
      fullAgents.push({
        ...preview,
        fullSystemRole
      })
    } catch (error) {
      console.error(`Failed to generate full role for ${preview.persona}:`, error)
      // Skip this agent if full generation fails
    }
  }

  return fullAgents
}