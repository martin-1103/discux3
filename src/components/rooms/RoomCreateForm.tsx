"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createRoomSchema, type CreateRoomInput } from "@/lib/validations"
import { createRoom } from "@/lib/actions/rooms"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function RoomCreateForm() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateRoomInput>({
    resolver: zodResolver(createRoomSchema),
  })

  const watchedName = watch("name")
  const watchedDescription = watch("description")

  const onSubmit = async (data: CreateRoomInput) => {
    if (!session?.user?.id) {
      setError("You must be logged in to create a room")
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const result = await createRoom(session.user.id, data)

      if (result.success) {
        router.push("/rooms")
        router.refresh()
      } else {
        setError(result.error || "Failed to create room")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Room Configuration</CardTitle>
            <CardDescription>
              Set up your collaboration space
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Room Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Room Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Product Development Team"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              {/* Room Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the purpose of this room..."
                  rows={4}
                  {...register("description")}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Optional: Help team members understand this room&apos;s purpose
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Creating..." : "Create Room"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/rooms")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Preview & Info */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>How your room will appear</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-lg">
                  {watchedName || "Room Name"}
                </h3>
                {watchedDescription && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {watchedDescription}
                  </p>
                )}
              </div>

              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                <p>💡 <strong>Next Steps:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Invite team members</li>
                  <li>Add AI agents</li>
                  <li>Configure room settings</li>
                  <li>Start chatting</li>
                </ul>
              </div>

              <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                <p>🚀 <strong>Room Features:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Real-time messaging</li>
                  <li>AI agent integration</li>
                  <li>Participant management</li>
                  <li>Message history</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
