"use client"

import { Button } from "@/components/ui/button"

interface EmailPlaceholderBarProps {
  onInsertPlaceholder: (value: string) => void
  onInsertLogo: () => void
  className?: string
}

export function EmailPlaceholderBar({
  onInsertPlaceholder,
  onInsertLogo,
  className,
}: EmailPlaceholderBarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 mb-2 ${className ?? ""}`}>
      <span className="text-xs text-muted-foreground mr-1">Insert:</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => onInsertPlaceholder("{{song_title}}")}
      >
        {"{{song_title}}"}
      </Button>
      {/* Future placeholders can be added here, e.g. collaborator_name, project_name */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={onInsertLogo}
      >
        Insert Logo
      </Button>
    </div>
  )
}

