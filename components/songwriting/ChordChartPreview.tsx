"use client"

import { useMemo } from "react"
import { parseChordProDocument, type ChordSegment } from "@/lib/songwriting/chordpro-parse"

function SegmentBlock({ segments }: { segments: ChordSegment[] }) {
  if (segments.length === 0) return null
  return (
    <div className="flex flex-wrap items-end gap-x-1 gap-y-0.5 font-mono text-sm leading-tight">
      {segments.map((seg, i) => (
        <span key={i} className="inline-flex min-w-[2ch] flex-col items-start">
          <span className="min-h-[1.25em] font-bold text-foreground">
            {seg.chord ?? "\u00a0"}
          </span>
          <span className="text-foreground">{seg.text || "\u00a0"}</span>
        </span>
      ))}
    </div>
  )
}

export function ChordChartPreview({ chordpro }: { chordpro: string }) {
  const sections = useMemo(() => parseChordProDocument(chordpro), [chordpro])

  return (
    <div
      className="max-h-[min(70vh,560px)] overflow-y-auto rounded-md border bg-muted/30 p-4 text-left"
      aria-label="Chord chart preview"
    >
      <div className="space-y-6">
        {sections.map((section, si) => (
          <section key={si} className="space-y-3">
            <h3 className="border-b border-border pb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </h3>
            <div className="space-y-3">
              {section.lines.map((line, li) => (
                <div key={li}>
                  {line.segments.length === 0 && line.raw === "" ? (
                    <div className="h-2" />
                  ) : line.segments.length > 0 ? (
                    <SegmentBlock segments={line.segments} />
                  ) : (
                    <p className="whitespace-pre-wrap font-mono text-sm text-foreground">{line.raw}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
