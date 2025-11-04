"use client"

import { useState } from "react"
import { 
  Users, 
  Bot, 
  Settings, 
  MessageSquare, 
  UserPlus, 
  Plus
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RoomParticipants } from "./RoomParticipants"
import { RoomAgents } from "./RoomAgents"
import { RoomSettings } from "./RoomSettings"

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
      id: string
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
  settings: {
    id: string
    maxAgents: number
    allowAgentCreation: boolean
    autoSummarize: boolean
  } | null
  _count: {
    participants: number
    agents: number
    messages: number
  }
}

interface RoomDetailsProps {
  room: Room
  currentUserId: string
}

export function RoomDetails({ room, currentUserId }: RoomDetailsProps) {
  const [activeTab, setActiveTab] = useState("overview")

  const isOwner = room.createdBy === currentUserId
  const currentUserRole = room.participants.find(p => p.user.id === currentUserId)?.role
  const isAdmin = currentUserRole === "ADMIN" || currentUserRole === "OWNER"

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Room Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Participants</span>
                </div>
                <Badge variant="secondary">{room._count.participants}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Agents</span>
                </div>
                <Badge variant="secondary">{room._count.agents}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Messages</span>
                </div>
                <Badge variant="secondary">{room._count.messages}</Badge>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Room Settings</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>Max Agents</span>
                    <span>{room.settings?.maxAgents || 5}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Agent Creation</span>
                    <Badge variant={room.settings?.allowAgentCreation ? "default" : "outline"} className="text-xs">
                      {room.settings?.allowAgentCreation ? "Allowed" : "Restricted"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Auto Summarize</span>
                    <Badge variant={room.settings?.autoSummarize ? "default" : "outline"} className="text-xs">
                      {room.settings?.autoSummarize ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Your Role</p>
                <Badge variant="outline" className="capitalize">
                  {currentUserRole?.toLowerCase() || "Not a member"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="participants">
              <Users className="h-4 w-4 mr-2" />
              Participants
            </TabsTrigger>
            <TabsTrigger value="agents">
              <Bot className="h-4 w-4 mr-2" />
              Agents
            </TabsTrigger>
            {(isOwner || isAdmin) && (
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Room Info */}
            <Card>
              <CardHeader>
                <CardTitle>Room Information</CardTitle>
                <CardDescription>Details about this collaboration space</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-sm">
                      {room.description || "No description provided"}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Created by</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {room.creator.name?.[0] || room.creator.email?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {room.creator.name || room.creator.email}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Created</p>
                      <p className="text-sm">
                        {new Date(room.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Last Active</p>
                      <p className="text-sm">
                        {new Date(room.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Agents */}
            {room.agents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Active Agents</CardTitle>
                  <CardDescription>AI agents currently in this room</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {room.agents.map((roomAgent) => (
                      <Badge 
                        key={roomAgent.agent.id} 
                        variant="secondary"
                        className="flex items-center gap-2"
                        style={{ backgroundColor: `${roomAgent.agent.color}20` }}
                      >
                        <span className="text-lg">{roomAgent.agent.emoji}</span>
                        <span>{roomAgent.agent.name}</span>
                        <span className="text-xs opacity-75 capitalize">
                          ({roomAgent.agent.style.toLowerCase()})
                        </span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common room management tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(isOwner || isAdmin) && (
                    <>
                      <Button 
                        variant="outline" 
                        className="justify-start"
                        onClick={() => setActiveTab("participants")}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite Participants
                      </Button>
                      <Button 
                        variant="outline" 
                        className="justify-start"
                        onClick={() => setActiveTab("agents")}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Agents
                      </Button>
                    </>
                  )}
                  <Button asChild>
                    <a href={`/rooms/${room.id}/chat`}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Enter Chat
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participants">
            <RoomParticipants 
              room={room} 
              currentUserId={currentUserId}
              canManage={isOwner || isAdmin}
            />
          </TabsContent>

          <TabsContent value="agents">
            <RoomAgents 
              room={room} 
              currentUserId={currentUserId}
              canManage={isOwner || isAdmin}
            />
          </TabsContent>

          {(isOwner || isAdmin) && (
            <TabsContent value="settings">
              <RoomSettings 
                room={room} 
                currentUserId={currentUserId}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
