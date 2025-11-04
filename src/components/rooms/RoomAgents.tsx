"use client"

import { useState } from "react"
import { Bot, Plus, X, Settings } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { addAgentToRoom, removeAgentFromRoom } from "@/lib/actions/rooms"
import { getAgents } from "@/lib/actions/agents"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Room {
  id: string
  name: string
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
  settings: {
    maxAgents: number
  } | null
}

interface RoomAgentsProps {
  room: Room
  currentUserId: string
  canManage: boolean
}

export function RoomAgents({ room, currentUserId, canManage }: RoomAgentsProps) {
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState("")
  const [isRemoving, setIsRemoving] = useState<string | null>(null)
  const [userAgents, setUserAgents] = useState<any[]>([])

  const loadUserAgents = async () => {
    try {
      const result = await getAgents(currentUserId)
      if (result.success && result.data) {
        setUserAgents(result.data)
      }
    } catch (error) {
      console.error("Failed to load agents:", error)
    }
  }

  const handleAddAgent = async () => {
    if (!selectedAgentId) return

    setIsAdding(true)
    try {
      const result = await addAgentToRoom(room.id, currentUserId, selectedAgentId)
      if (result.success) {
        setSelectedAgentId("")
        router.refresh()
      } else {
        alert(result.error)
      }
    } catch (error) {
      alert("Failed to add agent to room")
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveAgent = async (roomAgentId: string) => {
    if (!confirm("Are you sure you want to remove this agent from the room?")) {
      return
    }

    setIsRemoving(roomAgentId)
    try {
      const result = await removeAgentFromRoom(room.id, currentUserId, roomAgentId)
      if (result.success) {
        router.refresh()
      } else {
        alert(result.error)
      }
    } catch (error) {
      alert("Failed to remove agent from room")
    } finally {
      setIsRemoving(null)
    }
  }

  const availableAgents = userAgents.filter(
    agent => !room.agents.some(roomAgent => roomAgent.agent.id === agent.id)
  )

  const maxAgentsReached = room.settings && room.agents.length >= (room.settings.maxAgents || 5)

  return (
    <div className="space-y-6">
      {/* Add Agent */}
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Agent
            </CardTitle>
            <CardDescription>
              Add your AI agents to assist in this room
            </CardDescription>
          </CardHeader>
          <CardContent>
            {maxAgentsReached ? (
              <div className="text-center py-4 p-4 border-2 border-dashed rounded-lg">
                <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Maximum agent limit reached ({room.settings?.maxAgents} agents)
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Upgrade room settings to add more agents
                </p>
              </div>
            ) : (
              <div className="flex gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline"
                      onClick={loadUserAgents}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Select Agent
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Agent to Room</DialogTitle>
                      <DialogDescription>
                        Choose an agent to add to &quot;{room.name}&quot;
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="text-sm font-medium">Select Agent</label>
                        <Select 
                          value={selectedAgentId} 
                          onValueChange={setSelectedAgentId}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Choose an agent..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableAgents.map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{agent.emoji}</span>
                                  <span>{agent.name}</span>
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {agent.style.toLowerCase()}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {selectedAgentId && (
                        <div className="p-3 border rounded-lg">
                          <p className="text-sm font-medium mb-1">Selected Agent:</p>
                          {(() => {
                            const agent = availableAgents.find(a => a.id === selectedAgentId)
                            return agent ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6" style={{ backgroundColor: agent.color }}>
                                  <AvatarFallback className="text-xs">{agent.emoji}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{agent.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {agent.style.toLowerCase()}
                                </Badge>
                              </div>
                            ) : null
                          })()}
                        </div>
                      )}
                      
                      <div className="flex gap-3">
                        <Button 
                          onClick={handleAddAgent}
                          disabled={!selectedAgentId || isAdding}
                          className="flex-1"
                        >
                          {isAdding ? "Adding..." : "Add Agent"}
                        </Button>
                        <Button variant="outline">Cancel</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <div className="text-sm text-muted-foreground flex items-center">
                  {room.agents.length} / {room.settings?.maxAgents || 5} agents
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current Agents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Active Agents ({room.agents.length})
          </CardTitle>
          <CardDescription>
            AI agents currently responding in this room
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {room.agents.map((roomAgent) => (
              <div
                key={roomAgent.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar 
                    className="h-10 w-10" 
                    style={{ backgroundColor: roomAgent.agent.color }}
                  >
                    <AvatarFallback className="text-lg">
                      {roomAgent.agent.emoji}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{roomAgent.agent.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant="secondary" 
                        className="text-xs capitalize"
                        style={{ backgroundColor: `${roomAgent.agent.color}20` }}
                      >
                        {roomAgent.agent.style.toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAgent(roomAgent.agent.id)}
                    disabled={isRemoving === roomAgent.agent.id}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            {room.agents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No agents in this room</p>
                {canManage && (
                  <p className="text-sm mt-2">Add agents to start AI-assisted collaboration</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Agent Behavior Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            How Agents Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>Agents respond when mentioned with @ in chat messages</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>Each agent maintains its own personality and expertise</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>Agents can collaborate and build on each other&apos;s responses</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
              <p>Context is maintained throughout the conversation</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
