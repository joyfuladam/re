/** localStorage key for songwriting chart editor preference */
export const SONGWRITING_CHART_MODE_KEY = "reapp.songwriting.chartMode"

export type SongwritingChartMode = "chordpro" | "visual"

export function getStoredChartMode(): SongwritingChartMode {
  if (typeof window === "undefined") return "chordpro"
  try {
    const v = window.localStorage.getItem(SONGWRITING_CHART_MODE_KEY)
    if (v === "visual" || v === "chordpro") return v
  } catch {
    /* ignore */
  }
  return "chordpro"
}

export function setStoredChartMode(mode: SongwritingChartMode): void {
  try {
    window.localStorage.setItem(SONGWRITING_CHART_MODE_KEY, mode)
  } catch {
    /* ignore */
  }
}
