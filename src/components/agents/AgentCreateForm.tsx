"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createAgentSchema, type CreateAgentInput } from "@/lib/validations"
import { createAgent } from "@/lib/actions/agents"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AGENT_STYLE, getRandomAgentColor } from "@/lib/constants"
import { Bot } from "lucide-react"

export function AgentCreateForm() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateAgentInput>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      emoji: "bot-icon",
      color: getRandomAgentColor(),
      style: AGENT_STYLE,
    },
  })

  const watchedColor = watch("color") || getRandomAgentColor()
  const watchedName = watch("name")
  const watchedPrompt = watch("prompt")

  const onSubmit: SubmitHandler<CreateAgentInput> = async (data) => {
    if (!session?.user?.id) {
      setError("You must be logged in to create an agent")
      return
    }

    setError(null)
    setIsSubmitting(true)

    // Set automatic values
    const submitData = {
      ...data,
      emoji: "bot-icon",
      color: data.color || getRandomAgentColor(),
      style: AGENT_STYLE,
    }

    try {
      const result = await createAgent(session.user.id, submitData)

      if (result.success) {
        router.push("/agents")
        router.refresh()
      } else {
        setError(result.error || "Failed to create agent")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Agent Configuration</CardTitle>
            <CardDescription>
              Configure your agent&apos;s basic information and behavior
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Strategic Advisor"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              {/* System Prompt */}
              <div className="space-y-2">
                <Label htmlFor="prompt">System Prompt *</Label>
                <Textarea
                  id="prompt"
                  placeholder="You are a strategic advisor who helps teams make data-driven decisions..."
                  rows={8}
                  {...register("prompt")}
                />
                {errors.prompt && (
                  <p className="text-sm text-destructive">{errors.prompt.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Define the agent&apos;s personality, expertise, and behavior (10-100000 characters)
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Creating..." : "Create Agent"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/agents")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>How your agent will appear</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <Avatar className="h-12 w-12" style={{ backgroundColor: watchedColor }}>
                  <AvatarFallback className="flex items-center justify-center bg-transparent">
                    <Bot className="h-6 w-6 text-white" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {watchedName || "Agent Name"}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {AGENT_STYLE.toLowerCase()}
                  </p>
                </div>
              </div>

              {watchedPrompt && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs font-semibold mb-1">System Prompt:</p>
                  <p className="text-xs text-muted-foreground line-clamp-6">
                    {watchedPrompt}
                  </p>
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                <p>💡 Tips:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Be specific about expertise</li>
                  <li>Define personality clearly</li>
                  <li>Include response style</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
