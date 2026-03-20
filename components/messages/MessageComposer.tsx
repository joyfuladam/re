"use client"

import { useRef, type KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"

export function MessageComposer({
  value,
  onChange,
  onSubmit,
  sending,
  disabled,
  placeholder = "Message…",
  minHeight = 80,
  onFilesSelected,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  sending: boolean
  disabled?: boolean
  placeholder?: string
  minHeight?: number
  /** Called with files after send when message id is known — parent handles upload */
  onFilesSelected?: (files: FileList | null) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!sending && value.trim()) {
        onSubmit()
      }
    }
  }

  return (
    <div className="shrink-0 border-t bg-background p-3">
      <div className="flex flex-col gap-2">
        <textarea
          className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{ minHeight }}
          placeholder={placeholder}
          value={value}
          disabled={disabled || sending}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label={placeholder}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" disabled={sending || !value.trim() || disabled} onClick={() => onSubmit()}>
            {sending ? "Sending…" : "Send"}
          </Button>
          {onFilesSelected && (
            <>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                multiple
                onChange={(e) => {
                  onFilesSelected(e.target.files)
                  e.target.value = ""
                }}
              />
              <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                Attach
              </Button>
            </>
          )}
          <span className="text-[0.65rem] text-muted-foreground">Enter to send · Shift+Enter new line</span>
        </div>
      </div>
    </div>
  )
}
