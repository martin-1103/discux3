"use client"

import { useState } from "react"
import { AgentCreateForm } from "@/components/agents/AgentCreateForm"
import { AgentCreateWizard } from "@/components/agents/AgentCreateWizard"
import { ArrowLeft, Sparkles } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CreateAgentPage() {
  const [useWizard, setUseWizard] = useState(false)

  const handleWizardCancel = () => {
    setUseWizard(false)
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/agents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Create New Agent</h1>
        <p className="text-muted-foreground mt-2">
          Choose how you want to create your AI agent
        </p>
      </div>

      {/* Creation Method Selection */}
      {!useWizard && (
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card className="cursor-pointer transition-all hover:shadow-lg border-2 hover:border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI-Powered Wizard
              </CardTitle>
              <CardDescription>
                Let AI guide you through creating the perfect agent with expert personas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  <p>✨ Get 10 AI-generated agent personas</p>
                  <p>🎯 Based on your specific goal</p>
                  <p>📋 Complete system roles included</p>
                  <p>⚡ 2-step guided process</p>
                </div>
                <Button
                  onClick={() => setUseWizard(true)}
                  className="w-full"
                >
                  Use AI Wizard
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-all hover:shadow-lg border-2 hover:border-primary/50">
            <CardHeader>
              <CardTitle>Manual Creation</CardTitle>
              <CardDescription>
                Create your agent from scratch with full control over every detail
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  <p>✏️ Full creative control</p>
                  <p>🎨 Custom agent name and design</p>
                  <p>⚙️ Custom system prompt</p>
                  <p>🚀 Instant creation</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setUseWizard(false)}
                  className="w-full"
                >
                  Create Manually
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Render appropriate creation method */}
      {useWizard ? (
        <AgentCreateWizard onCancel={handleWizardCancel} />
      ) : (
        <AgentCreateForm />
      )}
    </div>
  )
}
