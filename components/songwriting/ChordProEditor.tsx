"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function ChordProEditor({
  value,
  onChange,
  disabled,
  id = "chordpro-source",
}: {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  id?: string
}) {
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  const insertBrackets = () => {
    const el = taRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const before = value.slice(0, start)
    const after = value.slice(end)
    const insert = "[]"
    const next = before + insert + after
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + 1
      el.setSelectionRange(pos, pos)
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id} className="text-sm font-medium">
          ChordPro source
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={insertBrackets} disabled={disabled}>
          Insert [ ]
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Type chords in brackets before lyrics, e.g. <code className="rounded bg-muted px-1">[G]Amazing [C]grace</code>.
        Start a section with <code className="rounded bg-muted px-1">{"{verse}"}</code>,{" "}
        <code className="rounded bg-muted px-1">{"{chorus}"}</code>, or{" "}
        <code className="rounded bg-muted px-1">{"{title: My Song}"}</code>.
      </p>
      <Textarea
        ref={taRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="min-h-[280px] font-mono text-sm leading-relaxed"
        placeholder={`{verse}\n[C]Line one [G]with chords\n[C]Line two\n\n{chorus}\n[F]Oh [C]chorus`}
        spellCheck={false}
      />
    </div>
  )
}
