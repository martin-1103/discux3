"use client"

import { useState } from "react"
import { Save } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { updateRoom, updateRoomSettings } from "@/lib/actions/rooms"
import { useRouter } from "next/navigation"
import { updateRoomSchema, roomSettingsSchema } from "@/lib/validations"

interface Room {
  id: string
  name: string
  description: string | null
  settings: {
    id: string
    maxAgents: number
    allowAgentCreation: boolean
    autoSummarize: boolean
  } | null
}

interface RoomSettingsProps {
  room: Room
  currentUserId: string
}

export function RoomSettings({ room, currentUserId }: RoomSettingsProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Room info form
  const roomForm = useForm({
    resolver: zodResolver(updateRoomSchema),
    defaultValues: {
      name: room.name,
      description: room.description || "",
    },
  })

  // Settings form
  const settingsForm = useForm({
    resolver: zodResolver(roomSettingsSchema),
    defaultValues: {
      maxAgents: room.settings?.maxAgents || 5,
      allowAgentCreation: room.settings?.allowAgentCreation ?? true,
      autoSummarize: room.settings?.autoSummarize ?? false,
    },
  })

  const onRoomSubmit = async (data: any) => {
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      const result = await updateRoom(room.id, currentUserId, data)
      if (result.success) {
        setSuccess("Room information updated successfully")
        router.refresh()
      } else {
        setError(result.error || "Failed to update room")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSettingsSubmit = async (data: any) => {
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      const result = await updateRoomSettings(room.id, currentUserId, data)
      if (result.success) {
        setSuccess("Room settings updated successfully")
        router.refresh()
      } else {
        setError(result.error || "Failed to update settings")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Room Information */}
      <Card>
        <CardHeader>
          <CardTitle>Room Information</CardTitle>
          <CardDescription>
            Update basic room details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={roomForm.handleSubmit(onRoomSubmit)} className="space-y-4">
            {/* Room Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Room Name</Label>
              <Input
                id="name"
                {...roomForm.register("name")}
                placeholder="Enter room name"
              />
              {roomForm.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {roomForm.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Room Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...roomForm.register("description")}
                placeholder="Describe the purpose of this room..."
                rows={3}
              />
              {roomForm.formState.errors.description && (
                <p className="text-sm text-destructive">
                  {roomForm.formState.errors.description.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Room Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Room Settings</CardTitle>
          <CardDescription>
            Configure room behavior and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-6">
            {/* Max Agents */}
            <div className="space-y-2">
              <Label htmlFor="maxAgents">Maximum Agents</Label>
              <Input
                id="maxAgents"
                type="number"
                min="1"
                max="20"
                {...settingsForm.register("maxAgents", { valueAsNumber: true })}
              />
              {settingsForm.formState.errors.maxAgents && (
                <p className="text-sm text-destructive">
                  {settingsForm.formState.errors.maxAgents.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Maximum number of AI agents that can be active in this room
              </p>
            </div>

            {/* Allow Agent Creation */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allowAgentCreation">Allow Agent Creation</Label>
                <p className="text-xs text-muted-foreground">
                  Participants can add their own agents to this room
                </p>
              </div>
              <Switch
                id="allowAgentCreation"
                checked={settingsForm.watch("allowAgentCreation")}
                onCheckedChange={(checked: boolean) => 
                  settingsForm.setValue("allowAgentCreation", checked)
                }
              />
            </div>

            {/* Auto Summarize */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoSummarize">Auto Summarize</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically generate conversation summaries
                </p>
              </div>
              <Switch
                id="autoSummarize"
                checked={settingsForm.watch("autoSummarize")}
                onCheckedChange={(checked: boolean) => 
                  settingsForm.setValue("autoSummarize", checked)
                }
              />
            </div>

            <Button type="submit" disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect this room
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border border-destructive/20 rounded-lg">
              <h4 className="font-medium mb-2">Delete Room</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Permanently delete this room and all its data. This action cannot be undone.
              </p>
              <Button variant="destructive" disabled>
                Delete Room (Coming Soon)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-green-50 text-green-700 border border-green-200">
          {success}
        </div>
      )}
    </div>
  )
}
