"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface LyricLine {
  chords: string
  text: string
}

export function LyricsChordEditor({
  lines,
  onChange,
  disabled,
}: {
  lines: LyricLine[]
  onChange: (lines: LyricLine[]) => void
  disabled?: boolean
}) {
  const updateLine = (index: number, patch: Partial<LyricLine>) => {
    const next = [...lines]
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  const addLine = () => {
    onChange([...lines, { chords: "", text: "" }])
  }

  const removeLine = (index: number) => {
    if (lines.length <= 1) return
    onChange(lines.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Chords sit above each lyric line (stacked). Add a line per phrase or bar — whatever works for your workflow.
      </p>
      <div className="space-y-4">
        {lines.map((line, i) => (
          <div key={i} className="rounded-md border bg-muted/20 p-3 space-y-2">
            <div className="space-y-1">
              <Label className="text-[0.65rem] uppercase text-muted-foreground">Chords</Label>
              <Input
                value={line.chords}
                onChange={(e) => updateLine(i, { chords: e.target.value })}
                disabled={disabled}
                placeholder="e.g. C  G  Am  F"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[0.65rem] uppercase text-muted-foreground">Lyrics</Label>
              <Input
                value={line.text}
                onChange={(e) => updateLine(i, { text: e.target.value })}
                disabled={disabled}
                placeholder="Lyric line"
                className="text-sm"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                disabled={disabled || lines.length <= 1}
                onClick={() => removeLine(i)}
              >
                Remove line
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={disabled}>
        Add line
      </Button>
    </div>
  )
}
