"use client"

import { useState } from "react"
import { Users, UserPlus, Crown, Shield, User, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addParticipant, removeParticipant } from "@/lib/actions/rooms"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Room {
  id: string
  name: string
  participants: Array<{
    id: string
    role: string
    user: {
      id: string
      name: string | null
      email: string | null
    }
  }>
}

interface RoomParticipantsProps {
  room: Room
  currentUserId: string
  canManage: boolean
}

export function RoomParticipants({ room, currentUserId, canManage }: RoomParticipantsProps) {
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const [newParticipantEmail, setNewParticipantEmail] = useState("")
  const [newParticipantRole, setNewParticipantRole] = useState<"ADMIN" | "MEMBER">("MEMBER")
  const [isRemoving, setIsRemoving] = useState<string | null>(null)

  const handleAddParticipant = async () => {
    if (!newParticipantEmail.trim()) return

    setIsAdding(true)
    try {
      const result = await addParticipant(room.id, currentUserId, newParticipantEmail, newParticipantRole)
      if (result.success) {
        setNewParticipantEmail("")
        setNewParticipantRole("MEMBER")
        router.refresh()
      } else {
        alert(result.error)
      }
    } catch (error) {
      alert("Failed to add participant")
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveParticipant = async (participantId: string) => {
    if (!confirm("Are you sure you want to remove this participant?")) {
      return
    }

    setIsRemoving(participantId)
    try {
      const result = await removeParticipant(room.id, currentUserId, participantId)
      if (result.success) {
        router.refresh()
      } else {
        alert(result.error)
      }
    } catch (error) {
      alert("Failed to remove participant")
    } finally {
      setIsRemoving(null)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "OWNER":
        return <Crown className="h-4 w-4 text-yellow-500" />
      case "ADMIN":
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return <User className="h-4 w-4 text-gray-500" />
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "OWNER":
        return "default"
      case "ADMIN":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Participant */}
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add Participant
            </CardTitle>
            <CardDescription>
              Invite team members to join this room
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="email" className="sr-only">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={newParticipantEmail}
                  onChange={(e) => setNewParticipantEmail(e.target.value)}
                />
              </div>
              <Select 
                value={newParticipantRole} 
                onValueChange={(value: "ADMIN" | "MEMBER") => setNewParticipantRole(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAddParticipant}
                disabled={!newParticipantEmail.trim() || isAdding}
              >
                {isAdding ? "Adding..." : "Add"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Participants List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants ({room.participants.length})
          </CardTitle>
          <CardDescription>
            Team members with access to this room
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {room.participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {participant.user.name?.[0] || participant.user.email?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {participant.user.name || participant.user.email}
                    </p>
                    {participant.user.name && (
                      <p className="text-sm text-muted-foreground">
                        {participant.user.email}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(participant.role)}
                    <Badge variant={getRoleBadgeVariant(participant.role)} className="capitalize">
                      {participant.role.toLowerCase()}
                    </Badge>
                  </div>
                  
                  {canManage && participant.user.id !== currentUserId && participant.role !== "OWNER" && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <X className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Remove Participant</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to remove {participant.user.name || participant.user.email} from this room?
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-3 mt-4">
                          <Button 
                            variant="destructive"
                            onClick={() => handleRemoveParticipant(participant.id)}
                            disabled={isRemoving === participant.id}
                          >
                            {isRemoving === participant.id ? "Removing..." : "Remove"}
                          </Button>
                          <Button variant="outline">Cancel</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            ))}

            {room.participants.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No participants yet</p>
                {canManage && (
                  <p className="text-sm mt-2">Invite team members to get started</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
