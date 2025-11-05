"use client"

import { useState } from "react"
import { Trash2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { clearRoomHistory } from "@/lib/actions/messages"

interface ClearHistoryButtonProps {
  roomId: string
  currentUserId: string
  userRole: "OWNER" | "ADMIN" | "MEMBER"
}

export function ClearHistoryButton({ roomId, currentUserId, userRole }: ClearHistoryButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Only show for owners and admins
  if (userRole !== "OWNER" && userRole !== "ADMIN") {
    return null
  }

  const handleClearHistory = async () => {
    if (deleteConfirmation !== "DELETE") {
      alert("Please type 'DELETE' to confirm")
      return
    }

    setIsLoading(true)
    try {
      const result = await clearRoomHistory(roomId, currentUserId)

      if (result.success) {
        alert(`${result.message} cleared by ${userRole}`)
        setIsDialogOpen(false)
        setDeleteConfirmation("")

        // Trigger a page reload to refresh the messages
        window.location.reload()
      } else {
        alert(result.error || "Failed to clear history")
      }
    } catch (error) {
      console.error("Error clearing history:", error)
      alert("Something went wrong while clearing history")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear History
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Clear Room History
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              <strong>⚠️ This will permanently delete ALL messages</strong> in this chat room,
              including:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>User messages</li>
              <li>AI agent responses</li>
              <li>Discussions and analysis</li>
              <li>Vector database context</li>
            </ul>
            <p className="text-destructive font-medium">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-4">
          <label htmlFor="delete-confirm" className="text-sm font-medium">
            Type <code className="bg-muted px-1 py-0.5 rounded text-xs">DELETE</code> to confirm:
          </label>
          <Input
            id="delete-confirm"
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            placeholder="Type DELETE"
            className="font-mono"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => setDeleteConfirmation("")}
            disabled={isLoading}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClearHistory}
            disabled={isLoading || deleteConfirmation !== "DELETE"}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Clearing..." : "Clear All Messages"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}