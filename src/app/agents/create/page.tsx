import { AgentCreateForm } from "@/components/agents/AgentCreateForm"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Create Agent | Discux3",
  description: "Create a new AI agent",
}

export default function CreateAgentPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/agents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Create New Agent</h1>
        <p className="text-muted-foreground mt-2">
          Define your AI agent's personality and behavior
        </p>
      </div>

      <AgentCreateForm />
    </div>
  )
}
