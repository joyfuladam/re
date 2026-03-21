"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ParsedSection, ChordSegment } from "@/lib/songwriting/chordpro-parse"
import { parseChordProDocument, documentToChordPro } from "@/lib/songwriting/chordpro-parse"

function cloneSections(sections: ParsedSection[]): ParsedSection[] {
  return sections.map((s) => ({
    title: s.title,
    lines: s.lines.map((l) => ({
      raw: l.raw,
      segments: l.segments.map((seg) => ({ ...seg })),
    })),
  }))
}

export function VisualChordChartEditor({
  chordpro,
  onChange,
  disabled,
}: {
  chordpro: string
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const [addSectionSelectKey, setAddSectionSelectKey] = useState(0)
  const sections = useMemo(() => parseChordProDocument(chordpro), [chordpro])

  const commit = (next: ParsedSection[]) => {
    onChange(documentToChordPro(next))
  }

  const setSectionTitle = (si: number, title: string) => {
    const next = cloneSections(sections)
    next[si].title = title
    commit(next)
  }

  const setSegment = (si: number, li: number, segIdx: number, patch: Partial<ChordSegment>) => {
    const next = cloneSections(sections)
    const seg = next[si].lines[li].segments[segIdx]
    next[si].lines[li].segments[segIdx] = { ...seg, ...patch }
    next[si].lines[li].raw = "" // derived
    commit(next)
  }

  const addSegment = (si: number, li: number) => {
    const next = cloneSections(sections)
    next[si].lines[li].segments.push({ chord: null, text: "" })
    commit(next)
  }

  const removeSegment = (si: number, li: number, segIdx: number) => {
    const next = cloneSections(sections)
    if (next[si].lines[li].segments.length <= 1) return
    next[si].lines[li].segments.splice(segIdx, 1)
    commit(next)
  }

  const addLine = (si: number) => {
    const next = cloneSections(sections)
    next[si].lines.push({
      segments: [{ chord: null, text: "" }],
      raw: "",
    })
    commit(next)
  }

  const removeLine = (si: number, li: number) => {
    const next = cloneSections(sections)
    if (next[si].lines.length <= 1) return
    next[si].lines.splice(li, 1)
    commit(next)
  }

  const addSection = (kind: "verse" | "chorus" | "bridge" | "custom", customTitle?: string) => {
    const next = cloneSections(sections)
    const titles: Record<string, string> = {
      verse: "Verse",
      chorus: "Chorus",
      bridge: "Bridge",
      custom: (customTitle || "Section").trim() || "Section",
    }
    next.push({
      title: titles[kind],
      lines: [{ segments: [{ chord: null, text: "" }], raw: "" }],
    })
    commit(next)
  }

  const removeSection = (si: number) => {
    if (sections.length <= 1) return
    const next = cloneSections(sections)
    next.splice(si, 1)
    commit(next)
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        Click chord or lyric fields to edit. Add sections and lines below. Changes update the same ChordPro data as
        source mode.
      </p>
      {sections.map((section, si) => (
        <div key={si} className="rounded-lg border bg-muted/20 p-4 space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1 flex-1 min-w-[140px]">
              <Label className="text-xs">Section</Label>
              <Input
                value={section.title}
                onChange={(e) => setSectionTitle(si, e.target.value)}
                disabled={disabled}
                className="font-medium"
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => addLine(si)} disabled={disabled}>
              Add line
            </Button>
            {sections.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => removeSection(si)} disabled={disabled}>
                Remove section
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {section.lines.map((line, li) => (
              <div key={li} className="rounded-md border bg-background/50 p-3 space-y-2">
                <div className="flex flex-wrap gap-2 items-start">
                  {line.segments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Empty line</p>
                  ) : (
                    line.segments.map((seg, segIdx) => (
                      <div
                        key={segIdx}
                        className="inline-flex min-w-[4rem] flex-col gap-1 rounded border border-dashed px-2 py-1"
                      >
                        <Input
                          className="h-7 font-mono text-xs font-bold"
                          placeholder="Chord"
                          value={seg.chord ?? ""}
                          onChange={(e) =>
                            setSegment(si, li, segIdx, {
                              chord: e.target.value.trim() || null,
                            })
                          }
                          disabled={disabled}
                        />
                        <Input
                          className="h-7 text-sm"
                          placeholder="Lyrics"
                          value={seg.text}
                          onChange={(e) => setSegment(si, li, segIdx, { text: e.target.value })}
                          disabled={disabled}
                        />
                        {line.segments.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px]"
                            onClick={() => removeSegment(si, li, segIdx)}
                            disabled={disabled}
                          >
                            Remove chunk
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => addSegment(si, li)} disabled={disabled}>
                    Add chord / lyric chunk
                  </Button>
                  {section.lines.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(si, li)} disabled={disabled}>
                      Remove line
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-sm">Add section</Label>
        <Select
          key={addSectionSelectKey}
          disabled={disabled}
          onValueChange={(v) => {
            if (v === "verse") addSection("verse")
            else if (v === "chorus") addSection("chorus")
            else if (v === "bridge") addSection("bridge")
            else if (v === "custom") addSection("custom", "New section")
            setAddSectionSelectKey((k) => k + 1)
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Choose type…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="verse">Verse</SelectItem>
            <SelectItem value="chorus">Chorus</SelectItem>
            <SelectItem value="bridge">Bridge</SelectItem>
            <SelectItem value="custom">Custom title</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
