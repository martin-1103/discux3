"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { updateAgentSchema, type UpdateAgentInput } from "@/lib/validations"
import { updateAgent } from "@/lib/actions/agents"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AGENT_COLORS, AGENT_STYLES } from "@/lib/constants"

const EMOJI_OPTIONS = ["🤖", "👨‍💼", "🎨", "🔬", "💡", "🎯", "🚀", "⚡", "🌟", "🔥"]

interface Agent {
  id: string
  name: string
  prompt: string
  emoji: string
  color: string
  style: string
  createdBy: string
}

interface AgentEditFormProps {
  agent: Agent
}

export function AgentEditForm({ agent }: AgentEditFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateAgentInput>({
    resolver: zodResolver(updateAgentSchema),
    defaultValues: {
      name: agent.name,
      emoji: agent.emoji,
      color: agent.color,
      style: agent.style as any,
      prompt: agent.prompt,
    },
  })

  const watchedEmoji = watch("emoji", agent.emoji)
  const watchedColor = watch("color", agent.color)
  const watchedName = watch("name", agent.name)
  const watchedPrompt = watch("prompt", agent.prompt)
  const watchedStyle = watch("style", agent.style as any)

  const onSubmit = async (data: UpdateAgentInput) => {
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await updateAgent(agent.id, agent.createdBy, data)

      if (result.success) {
        router.push("/agents")
        router.refresh()
      } else {
        setError(result.error || "Failed to update agent")
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
              Update your agent's information and behavior
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

              {/* Emoji */}
              <div className="space-y-2">
                <Label>Agent Emoji</Label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setValue("emoji", emoji)}
                      className={`text-2xl p-2 rounded border-2 transition-all hover:scale-110 ${
                        watchedEmoji === emoji
                          ? "border-primary"
                          : "border-transparent"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {errors.emoji && (
                  <p className="text-sm text-destructive">{errors.emoji.message}</p>
                )}
              </div>

              {/* Color */}
              <div className="space-y-2">
                <Label>Agent Color</Label>
                <div className="flex flex-wrap gap-2">
                  {AGENT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setValue("color", color)}
                      className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${
                        watchedColor === color
                          ? "border-primary ring-2 ring-offset-2 ring-primary"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                {errors.color && (
                  <p className="text-sm text-destructive">{errors.color.message}</p>
                )}
              </div>

              {/* Style */}
              <div className="space-y-2">
                <Label htmlFor="style">Agent Style *</Label>
                <select
                  id="style"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  {...register("style")}
                >
                  {AGENT_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {style.charAt(0) + style.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
                {errors.style && (
                  <p className="text-sm text-destructive">{errors.style.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  How the agent should behave and respond
                </p>
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
                  Define the agent's personality, expertise, and behavior (10-4000 characters)
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Saving..." : "Save Changes"}
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
            <CardDescription>How your changes will look</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <Avatar className="h-12 w-12" style={{ backgroundColor: watchedColor }}>
                  <AvatarFallback className="text-2xl">{watchedEmoji}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {watchedName || "Agent Name"}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {watchedStyle?.toLowerCase() || "professional"}
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
                <p>💡 Changes will be saved immediately</p>
                <p>⚡ Agent will use new prompt in next conversation</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
