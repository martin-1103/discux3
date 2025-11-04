import { Suspense } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AgentList } from "@/components/agents/AgentList"
import { AgentListSkeleton } from "@/components/agents/AgentListSkeleton"

export const metadata = {
  title: "My Agents | Discux3",
  description: "Manage your AI agents",
}

export default function AgentsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Agents</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage your AI agents with different personalities
          </p>
        </div>
        <Button asChild>
          <Link href="/agents/create">
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Link>
        </Button>
      </div>

      <Suspense fallback={<AgentListSkeleton />}>
        <AgentList />
      </Suspense>
    </div>
  )
}
