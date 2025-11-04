"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Loader2, Send, Sparkles } from "lucide-react"

interface Agent {
  id: string
  name: string
  emoji: string
  color: string
  style: string
  prompt: string
}

interface AgentTestPanelProps {
  agent: Agent
}

export function AgentTestPanel({ agent }: AgentTestPanelProps) {
  const [testPrompt, setTestPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState("")

  const SAMPLE_PROMPTS = {
    PROFESSIONAL: [
      "How can I improve team productivity?",
      "What's your approach to strategic planning?",
      "Help me make a data-driven decision",
    ],
    DIRECT: [
      "What should I do first?",
      "Give me actionable steps",
      "What's the solution?",
    ],
    FRIENDLY: [
      "I need some advice on a project",
      "Can you help me brainstorm?",
      "What do you think about this idea?",
    ],
    CREATIVE: [
      "Help me think outside the box",
      "What's an innovative approach?",
      "Generate some creative ideas",
    ],
    ANALYTICAL: [
      "Analyze this situation for me",
      "What does the data tell us?",
      "Break this down logically",
    ],
  }

  const samplePrompts = SAMPLE_PROMPTS[agent.style as keyof typeof SAMPLE_PROMPTS] || SAMPLE_PROMPTS.PROFESSIONAL

  const handleTest = async () => {
    if (!testPrompt.trim()) return

    setIsLoading(true)
    setResponse("")

    // Simulate AI response based on agent style
    setTimeout(() => {
      const mockResponse = generateMockResponse(agent, testPrompt)
      setResponse(mockResponse)
      setIsLoading(false)
    }, 1500)
  }

  

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10" style={{ backgroundColor: agent.color }}>
            <AvatarFallback className="text-xl">{agent.emoji}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>Test Agent</CardTitle>
            <CardDescription>Try different prompts to see how {agent.name} responds</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sample Prompts */}
        <div>
          <p className="text-sm font-medium mb-2">Sample prompts for {agent.style.toLowerCase()} style:</p>
          <div className="flex flex-wrap gap-2">
            {samplePrompts.map((prompt, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => setTestPrompt(prompt)}
                className="text-xs"
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="space-y-2">
          <Textarea
            placeholder="Type your test prompt here..."
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <Button
            onClick={handleTest}
            disabled={!testPrompt.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Test Agent
              </>
            )}
          </Button>
        </div>

        {/* Response */}
        {response && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Agent Response:</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{response}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 This is a mock response. Connect Z.AI API in Phase 6 for real AI responses.
            </p>
          </div>
        )}

        {/* Info */}
        <div className="pt-4 border-t space-y-2 text-xs text-muted-foreground">
          <p><strong>Style:</strong> {agent.style}</p>
          <p><strong>System Prompt:</strong> {agent.prompt.slice(0, 100)}...</p>
        </div>
      </CardContent>
    </Card>
  )
}

function generateMockResponse(agent: Agent, _prompt: string): string {
  const styleResponses = {
    PROFESSIONAL: `Based on your question, I'd recommend a structured approach:\n\n1. Analyze the current situation and gather relevant data\n2. Define clear objectives and success metrics\n3. Develop actionable strategies aligned with your goals\n4. Implement with proper monitoring and adjustment\n\nThis professional methodology ensures sustainable results.`,
    
    DIRECT: `Here's what you need to do:\n\n→ Take immediate action on the priority items\n→ Focus on what moves the needle\n→ Skip the unnecessary steps\n→ Execute and iterate quickly\n\nBottom line: Start now, adjust later.`,
    
    FRIENDLY: `I'd love to help you with that! 😊\n\nLet's think about this together. From what you're asking, it seems like you're looking for some guidance. Here's my supportive take:\n\nFirst, remember that you're on the right track by asking. Here are some friendly suggestions that might help you move forward with confidence!`,
    
    CREATIVE: `Ooh, interesting question! Let me think outside the box here... 🎨\n\nWhat if we approached this from a completely different angle? Instead of the traditional route, consider:\n\n• An innovative twist on the usual approach\n• Combining unexpected elements\n• Reimagining the end goal entirely\n\nCreativity thrives on breaking patterns!`,
    
    ANALYTICAL: `Let me break this down systematically:\n\nData Points:\n- Your question suggests X, Y, and Z factors\n- Evidence indicates A correlates with B\n- Historical patterns show C outcomes\n\nConclusion:\nBased on logical analysis, the optimal path forward involves [structured reasoning]. Statistical probability favors this approach.`,
  }

  return styleResponses[agent.style as keyof typeof styleResponses] || styleResponses.PROFESSIONAL
}
