"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createAgent } from "@/lib/actions/agents"
import { getRandomAgentColor } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Sparkles, ArrowLeft, Loader2 } from "lucide-react"
import type { AgentPreview } from "@/lib/services/agent-generator"
import { MultiAgentSelector } from "./MultiAgentSelector"
import { GenerationModal } from "./GenerationModal"

// Form schemas
const goalStepSchema = z.object({
  goal: z.string().min(10, "Please describe your goal in at least 10 characters").max(500),
})

type GoalStepInput = z.infer<typeof goalStepSchema>

interface AgentCreateWizardProps {
  onCancel?: () => void
}

export function AgentCreateWizard({ onCancel }: AgentCreateWizardProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [currentStep, setCurrentStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [goal, setGoal] = useState("")
  const [agentPreviews, setAgentPreviews] = useState<AgentPreview[]>([])
  const [selectedPreviews, setSelectedPreviews] = useState<string[]>([])
  const [isGeneratingModal, setIsGeneratingModal] = useState(false)

  // Form hooks
  const goalForm = useForm<GoalStepInput>({
    resolver: zodResolver(goalStepSchema),
  })

  // Progress and step descriptions
  const totalSteps = 2
  const stepProgress = (currentStep / totalSteps) * 100
  const stepDescriptions = {
    1: "Describe your goal to generate relevant AI agents",
    2: "Select and generate expert agents for your needs",
  }

  // Handle goal submission and generate agent previews
  const handleGoalSubmit = async (data: GoalStepInput) => {
    if (!session?.user?.id) {
      setError("You must be logged in to create an agent")
      return
    }

    setIsGenerating(true)
    setError(null)
    setGoal(data.goal)

    try {
      const response = await fetch("/api/agents/generate-options", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ goal: data.goal }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate options")
      }

      setAgentPreviews(result.previews || [])
      setSelectedPreviews([]) // Reset selections
      setCurrentStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate agent options")
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle batch generation of selected agents
  const handleBatchGenerate = async () => {
    if (!session?.user?.id || selectedPreviews.length === 0) return

    setIsGeneratingModal(true)
    setError(null)

    try {
      // Get selected previews
      const selectedAgents = agentPreviews.filter(preview => selectedPreviews.includes(preview.id))

      // Create parallel API calls for each selected agent
      const generationPromises = selectedAgents.map(async (preview) => {
        const response = await fetch("/api/agents/generate-full-role", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            preview,
            goal
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || "Failed to generate full role")
        }

        // Create the agent directly
        const agentResult = await createAgent(session.user.id, {
          name: result.agent.persona,
          prompt: result.agent.fullSystemRole,
          emoji: "bot-icon",
          color: getRandomAgentColor(),
          style: "TRUTH_TELLER",
        })

        // Log detailed results for debugging
        console.log("Agent creation result:", agentResult)
        if (!agentResult.success) {
          console.error("Agent creation failed:", agentResult.error)
        }

        return agentResult
      })

      // Wait for all generations to complete
      const results = await Promise.all(generationPromises)

      // Check if all were successful
      const failedResults = results.filter(result => !result.success)
      if (failedResults.length > 0) {
        // Get the specific error message from the first failed result
        const firstError = failedResults[0]
        const errorMessage = firstError.error || `Failed to create ${failedResults.length} agent(s)`
        console.error("Agent creation failures:", failedResults)
        throw new Error(errorMessage)
      }

      // Redirect to agents page
      router.push("/agents")
      router.refresh()

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate agents")
      setIsGeneratingModal(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      router.push("/agents")
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="space-y-4">
              <Progress value={stepProgress} className="h-2" />
              <div>
                <CardTitle>Step {currentStep} of {totalSteps}</CardTitle>
                <CardDescription>{stepDescriptions[currentStep as keyof typeof stepDescriptions]}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Step 1: Goal Input */}
            {currentStep === 1 && (
              <form onSubmit={goalForm.handleSubmit(handleGoalSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="goal">What&apos;s your goal? *</Label>
                  <Textarea
                    id="goal"
                    placeholder="Describe what you want to achieve with your AI agent. For example: 'I need help creating a marketing strategy for a new product launch' or 'I want advice on building a customer-centric business'..."
                    rows={6}
                    {...goalForm.register("goal")}
                  />
                  {goalForm.formState.errors.goal && (
                    <p className="text-sm text-destructive">{goalForm.formState.errors.goal.message}</p>
                  )}
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Example goals:
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Create viral marketing campaigns for new products</li>
                    <li>• Develop customer experience strategies</li>
                    <li>• Build brand authority and thought leadership</li>
                    <li>• Optimize social media content and engagement</li>
                    <li>• Design user-centric products and services</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isGenerating}>
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Experts...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Expert Agents
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Step 2: Agent Selection */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Select Expert Agents</h3>
                  <p className="text-muted-foreground">
                    Based on your goal: &ldquo;{goal}&rdquo;
                  </p>
                </div>

                <MultiAgentSelector
                  previews={agentPreviews}
                  selectedPreviews={selectedPreviews}
                  onSelectionChange={setSelectedPreviews}
                />

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep <= 1}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>

                  <Button
                    onClick={handleBatchGenerate}
                    disabled={selectedPreviews.length === 0 || isGeneratingModal}
                  >
                    {isGeneratingModal ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Selected ({selectedPreviews.length})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Agent Creation Guide</CardTitle>
            <CardDescription>
              Get help with creating your perfect AI agent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className={`flex items-center gap-2 ${
                currentStep >= 1 ? "text-primary" : "text-muted-foreground"
              }`}>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                  currentStep >= 1 ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground"
                }`}>
                  {currentStep > 1 ? "✓" : "1"}
                </div>
                <span className="text-sm font-medium">Define Your Goal</span>
              </div>

              <div className={`flex items-center gap-2 ${
                currentStep >= 2 ? "text-primary" : "text-muted-foreground"
              }`}>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                  currentStep >= 2 ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground"
                }`}>
                  {currentStep > 2 ? "✓" : "2"}
                </div>
                <span className="text-sm font-medium">Select Expert Agents</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-2">💡 Pro Tips:</p>
              <ul className="space-y-1">
                <li>• Be specific about your goals</li>
                <li>• Select multiple experts for different perspectives</li>
                <li>• Review the full system role before creating</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generation Modal */}
      <GenerationModal
        isOpen={isGeneratingModal}
        onClose={() => setIsGeneratingModal(false)}
      />
    </div>
  )
}