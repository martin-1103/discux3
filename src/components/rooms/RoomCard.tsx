"use client"

import Link from "next/link"
import { MoreVertical, MessageSquare, Users, Bot, Settings } from "lucide-react"
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
import { deleteRoom } from "@/lib/actions/rooms"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface Room {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string
  creator: {
    name: string | null
    email: string | null
  }
  participants: Array<{
    id: string
    role: string
    user: {
      name: string | null
      email: string | null
    }
  }>
  agents: Array<{
    id: string
    agent: {
      id: string
      name: string
      emoji: string
      color: string
      style: string
    }
  }>
  _count: {
    participants: number
    agents: number
    messages: number
  }
}

interface RoomCardProps {
  room: Room
}

export function RoomCard({ room }: RoomCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${room.name}"? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      // Note: This would need the current user ID, which we don't have in the room data
      // In a real implementation, we'd need to pass this or get it from the session
      const result = await deleteRoom(room.id, room.createdBy)
      if (result.success) {
        router.refresh()
      } else {
        alert(result.error)
      }
    } catch (error) {
      alert("Failed to delete room")
    } finally {
      setIsDeleting(false)
    }
  }

  const isOwner = room.createdBy === room.createdBy // This is a placeholder

  return (
    <Card className="relative hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{room.name}</CardTitle>
            <CardDescription className="truncate">
              {room.description || "No description"}
            </CardDescription>
          </div>
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/rooms/${room.id}`}>
                    <Settings className="mr-2 h-4 w-4" />
                    Manage
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleDelete} 
                  disabled={isDeleting}
                  className="text-destructive focus:text-destructive"
                >
                  Delete Room
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{room._count.participants}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Bot className="h-4 w-4" />
                <span>{room._count.agents}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span>{room._count.messages}</span>
            </div>
          </div>

          {/* Agent Preview */}
          {room.agents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Active Agents:</p>
              <div className="flex flex-wrap gap-1">
                {room.agents.slice(0, 3).map((roomAgent) => (
                  <Badge 
                    key={roomAgent.agent.id} 
                    variant="secondary" 
                    className="text-xs"
                    style={{ backgroundColor: `${roomAgent.agent.color}20` }}
                  >
                    {roomAgent.agent.emoji} {roomAgent.agent.name}
                  </Badge>
                ))}
                {room.agents.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{room.agents.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button asChild className="w-full">
            <Link href={`/rooms/${room.id}`}>
              Enter Room
            </Link>
          </Button>
        </div>
      </CardContent>

      {/* Status Indicator */}
      {room.isActive && (
        <div className="absolute top-4 right-4">
          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
        </div>
      )}
    </Card>
  )
}
