"use client"

import React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import type { AgentPreview } from "@/lib/services/agent-generator"

interface MultiAgentSelectorProps {
  previews: AgentPreview[]
  selectedPreviews: string[]
  onSelectionChange: (selectedIds: string[]) => void
  className?: string
}

export function MultiAgentSelector({
  previews,
  selectedPreviews,
  onSelectionChange,
  className = ""
}: MultiAgentSelectorProps) {

  const handleSelectionChange = (previewId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedPreviews, previewId])
    } else {
      onSelectionChange(selectedPreviews.filter(id => id !== previewId))
    }
  }

  const isSelected = (previewId: string) => selectedPreviews.includes(previewId)

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Selection Controls */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Select Expert Agents</h3>
          <p className="text-sm text-muted-foreground">
            Choose which agents you want to create
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {selectedPreviews.length} of {previews.length} selected
          </Badge>
        </div>
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {previews.map((preview) => (
          <Card
            key={preview.id}
            className={`relative cursor-pointer transition-all duration-200 ${
              isSelected(preview.id)
                ? "ring-2 ring-primary border-primary shadow-md"
                : "hover:shadow-md hover:border-primary/50"
            }`}
          >
            {/* Selection Checkbox */}
            <div className="absolute top-3 left-3 z-10">
              <Checkbox
                checked={isSelected(preview.id)}
                onCheckedChange={(checked) =>
                  handleSelectionChange(preview.id, checked as boolean)
                }
              />
            </div>

            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(preview.persona)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-medium leading-tight">
                    {preview.persona}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {preview.title}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Philosophy */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1">
                    Philosophy
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {preview.previewPhilosophy}
                  </p>
                </div>

                {/* Characteristics */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">
                    Key Characteristics
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {preview.keyCharacteristics.map((characteristic, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs px-2 py-0.5"
                      >
                        {characteristic}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}