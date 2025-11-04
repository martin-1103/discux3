import { getAgents } from "@/lib/actions/agents"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/session"
import { AgentCard } from "./AgentCard"

export async function AgentList() {
  const user = await getCurrentUser()

  if (!user?.id) {
    redirect("/login")
  }

  const result = await getAgents(user.id)

  if (!result.success || !result.data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load agents</p>
      </div>
    )
  }

  const agents = result.data

  if (agents.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <div className="mx-auto max-w-md">
          <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first AI agent to get started with multi-agent collaboration
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  )
}
