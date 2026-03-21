"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChordChartPreview } from "@/components/songwriting/ChordChartPreview"

/**
 * Phase A: read-only preview + copy until click-to-place WYSIWYG is implemented.
 */
export function VisualChartPlaceholder({
  chordpro,
  onSwitchToChordPro,
}: {
  chordpro: string
  onSwitchToChordPro: () => void
}) {
  return (
    <div className="space-y-4">
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Visual chart editor</CardTitle>
          <CardDescription>
            Click-to-place chords are coming soon. For now, edit lyrics and chords in{" "}
            <strong>ChordPro (source)</strong> mode, or review the chart below (read-only).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <button
            type="button"
            onClick={onSwitchToChordPro}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Switch to ChordPro source to edit
          </button>
        </CardContent>
      </Card>
      <div className="space-y-2">
        <p className="text-sm font-medium">Chart preview (read-only)</p>
        <ChordChartPreview chordpro={chordpro} />
      </div>
    </div>
  )
}
