"use client"

import Link from "next/link"
import { MoreVertical, Trash2, Edit, TrendingUp } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { deleteAgent } from "@/lib/actions/agents"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface Agent {
  id: string
  name: string
  prompt: string
  emoji: string
  color: string
  style: string
  isPublic: boolean
  usageCount: number
  createdAt: Date
  createdBy: string
}

interface AgentCardProps {
  agent: Agent
}

export function AgentCard({ agent }: AgentCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${agent.name}"?`)) {
      return
    }

    setIsDeleting(true)
    try {
      // Get userId from props (passed from server component)
      const result = await deleteAgent(agent.id, agent.createdBy)
      if (result.success) {
        router.refresh()
      } else {
        alert(result.error)
      }
    } catch (error) {
      alert("Failed to delete agent")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card className="relative hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12" style={{ backgroundColor: agent.color }}>
              <AvatarFallback className="text-2xl">{agent.emoji}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              <CardDescription className="capitalize">{agent.style.toLowerCase()}</CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/agents/${agent.id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleDelete} 
                disabled={isDeleting}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
          {agent.prompt}
        </p>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>{agent.usageCount} uses</span>
          </div>
          {agent.isPublic && (
            <Badge variant="secondary">Public</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
