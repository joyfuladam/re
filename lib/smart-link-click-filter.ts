/**
 * Classifies smart link clicks to filter out suspected scanner/bot duplicates.
 * When the same user-agent hits multiple service URLs (Spotify, Apple, Amazon, etc.)
 * within a few seconds, we treat that as one "session" and count only the first click.
 * Raw data is never deleted; this is used only for analytics display.
 */

const BURST_WINDOW_MS = 3000

export interface ClickForFilter {
  id: string
  smartLinkId: string
  serviceKey: string
  createdAt: Date
  userAgent?: string | null
}

/**
 * Returns the subset of clicks that are considered "human" (not suspected scanner duplicates).
 * Within each (smartLinkId, userAgent) group, clicks in a 3-second burst with multiple
 * different serviceKeys are collapsed to one: we keep only the first click in the burst.
 */
export function filterHumanClicks<T extends ClickForFilter>(clicks: T[]): T[] {
  if (clicks.length === 0) return []

  const byKey = new Map<string, T[]>()
  for (const c of clicks) {
    const ua = (c.userAgent ?? "").trim()
    const key = `${c.smartLinkId}\n${ua}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key)!.push(c)
  }

  const humanIds = new Set<string>()

  for (const group of byKey.values()) {
    const sorted = [...group].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    let burstStart = 0
    const processBurst = (end: number) => {
      const burst = sorted.slice(burstStart, end)
      const serviceKeys = new Set(burst.map((b) => b.serviceKey))
      if (serviceKeys.size >= 2) {
        humanIds.add(burst[0].id)
      } else {
        burst.forEach((b) => humanIds.add(b.id))
      }
    }

    for (let i = 1; i <= sorted.length; i++) {
      const t0 = new Date(sorted[burstStart].createdAt).getTime()
      const ti = i < sorted.length ? new Date(sorted[i].createdAt).getTime() : t0 + BURST_WINDOW_MS + 1
      if (ti - t0 > BURST_WINDOW_MS) {
        processBurst(i)
        burstStart = i
      }
    }
    if (burstStart < sorted.length) {
      processBurst(sorted.length)
    }
  }

  return clicks.filter((c) => humanIds.has(c.id))
}
