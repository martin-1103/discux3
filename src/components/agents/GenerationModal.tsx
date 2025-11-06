"use client"

import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface GenerationModalProps {
  isOpen: boolean
  onClose: () => void
}

export function GenerationModal({ isOpen, onClose }: GenerationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Creating Your Agents</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">Generating your agents...</p>
            <p className="text-sm text-muted-foreground">
              Please wait while we create your expert agents
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}