/**
 * ChordPro subset: inline [Chord]lyrics and {directive} section lines.
 * Used for live chart preview (no external parser dependency).
 */

export type ChordSegment = { chord: string | null; text: string }

export type ParsedLyricLine = {
  segments: ChordSegment[]
  /** Original line (for empty lines) */
  raw: string
}

export type ParsedSection = {
  title: string
  lines: ParsedLyricLine[]
}

/** Split a lyric line into chord-attached segments (ChordPro semantics). */
export function parseLyricLine(line: string): ChordSegment[] {
  const segments: ChordSegment[] = []
  let pos = 0
  while (pos < line.length) {
    const open = line.indexOf("[", pos)
    if (open === -1) {
      const rest = line.slice(pos)
      if (rest) segments.push({ chord: null, text: rest })
      break
    }
    if (open > pos) {
      segments.push({ chord: null, text: line.slice(pos, open) })
    }
    const close = line.indexOf("]", open)
    if (close === -1) {
      segments.push({ chord: null, text: line.slice(open) })
      break
    }
    const chord = line.slice(open + 1, close).trim()
    const nextOpen = line.indexOf("[", close + 1)
    const end = nextOpen === -1 ? line.length : nextOpen
    const text = line.slice(close + 1, end)
    segments.push({ chord: chord || null, text })
    pos = end
  }
  return segments
}

function directiveTitle(inner: string): string {
  const t = inner.trim()
  const lower = t.toLowerCase()
  if (lower === "verse" || lower === "start_of_verse" || lower === "sov") return "Verse"
  if (lower === "chorus" || lower === "start_of_chorus") return "Chorus"
  if (lower === "bridge" || lower === "start_of_bridge") return "Bridge"
  if (lower.startsWith("title:")) return t.slice(6).trim() || "Title"
  if (lower.startsWith("t:")) return t.slice(2).trim() || "Title"
  if (lower.startsWith("section:") || lower.startsWith("subtitle:")) {
    const idx = t.indexOf(":")
    return idx >= 0 ? t.slice(idx + 1).trim() : t
  }
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/**
 * Parse full ChordPro source into sections with lyric lines and segments.
 */
export function parseChordProDocument(source: string): ParsedSection[] {
  const lines = source.split(/\r?\n/)
  const sections: ParsedSection[] = []
  let block: ParsedSection = { title: "Song", lines: [] }

  const flushBlock = (nextTitle: string) => {
    const isDefaultEmpty =
      block.lines.length === 0 && block.title === "Song" && sections.length === 0
    if (!isDefaultEmpty) {
      sections.push(block)
    }
    block = { title: nextTitle, lines: [] }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    const dirMatch = trimmed.match(/^\{([^}]+)\}\s*$/)
    if (dirMatch) {
      flushBlock(directiveTitle(dirMatch[1]))
      continue
    }

    if (trimmed === "") {
      block.lines.push({ segments: [], raw: "" })
      continue
    }

    const segments = parseLyricLine(line)
    block.lines.push({ segments, raw: line })
  }

  const trailingEmpty = block.lines.length === 0 && block.title === "Song" && sections.length === 0
  if (!trailingEmpty) {
    sections.push(block)
  }

  return sections.length > 0 ? sections : [{ title: "Song", lines: [] }]
}
