/**
 * Versioned storage for songwriting lyrics in Song.songwritingLyricsJson.
 * v2: ChordPro source string. Legacy: array of { chords, text } rows.
 */

export type LegacyLyricLine = { chords: string; text: string }

const MAX_CHORDPRO_LENGTH = 500_000

/** Convert legacy stacked rows to ChordPro lines (inline [chord] tokens). */
export function linesToChordPro(lines: LegacyLyricLine[]): string {
  const out: string[] = []
  for (const line of lines) {
    const chordTokens = line.chords.trim().split(/\s+/).filter(Boolean)
    const words = line.text.trim().split(/\s+/).filter(Boolean)
    if (chordTokens.length === 0) {
      if (line.text) out.push(line.text)
      continue
    }
    if (words.length === 0) {
      out.push(chordTokens.map((c) => `[${c}]`).join(""))
      continue
    }
    if (chordTokens.length === words.length) {
      out.push(words.map((w, i) => `[${chordTokens[i]}]${w}`).join(" "))
    } else if (chordTokens.length < words.length) {
      const parts: string[] = []
      for (let i = 0; i < chordTokens.length; i++) {
        parts.push(`[${chordTokens[i]}]${words[i]}`)
      }
      parts.push(words.slice(chordTokens.length).join(" "))
      out.push(parts.join(" "))
    } else {
      const prefix = chordTokens.map((c) => `[${c}]`).join("")
      out.push(prefix + (line.text.trim() ? ` ${line.text.trim()}` : ""))
    }
  }
  return out.join("\n")
}

function parseLegacyLines(raw: unknown): LegacyLyricLine[] {
  if (!Array.isArray(raw)) return [{ chords: "", text: "" }]
  return raw.map((row) => {
    if (row && typeof row === "object" && "text" in row) {
      const o = row as { chords?: unknown; text?: unknown }
      return {
        chords: typeof o.chords === "string" ? o.chords : "",
        text: typeof o.text === "string" ? o.text : "",
      }
    }
    return { chords: "", text: "" }
  })
}

/** Load from DB JSON into a single ChordPro source string. */
export function normalizeSongwritingJson(raw: unknown): { chordpro: string } {
  if (raw === null || raw === undefined) {
    return { chordpro: "" }
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>
    if (o.v === 2 && typeof o.chordpro === "string") {
      return { chordpro: o.chordpro }
    }
  }
  if (Array.isArray(raw)) {
    return { chordpro: linesToChordPro(parseLegacyLines(raw)) }
  }
  return { chordpro: "" }
}

/** Persist shape for Prisma songwritingLyricsJson. */
export function serializeSongwritingForDb(chordpro: string): { v: 2; chordpro: string } {
  const trimmed = chordpro.length > MAX_CHORDPRO_LENGTH ? chordpro.slice(0, MAX_CHORDPRO_LENGTH) : chordpro
  return { v: 2, chordpro: trimmed }
}

export { MAX_CHORDPRO_LENGTH }
