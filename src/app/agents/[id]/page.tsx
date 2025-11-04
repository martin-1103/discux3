import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AgentEditForm } from "@/components/agents/AgentEditForm"
import { AgentTestPanel } from "@/components/agents/AgentTestPanel"
import { getAgent } from "@/lib/actions/agents"
import { getCurrentUser } from "@/lib/session"

interface AgentPageProps {
  params: {
    id: string
  }
}

export default async function AgentEditPage({ params }: AgentPageProps) {
  const user = await getCurrentUser()

  if (!user?.id) {
    redirect("/login")
  }

  const result = await getAgent(params.id, user.id)

  if (!result.success || !result.data) {
    notFound()
  }

  const agent = result.data

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/agents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Agent</h1>
        <p className="text-muted-foreground mt-2">
          Update your agent&apos;s personality and behavior
        </p>
      </div>

      <div className="space-y-8">
        <AgentEditForm agent={agent} />
        
        <div className="pt-8 border-t">
          <h2 className="text-2xl font-bold mb-4">Test Agent Behavior</h2>
          <AgentTestPanel agent={agent} />
        </div>
      </div>
    </div>
  )
}
