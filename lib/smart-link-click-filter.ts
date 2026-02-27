/**
 * Classifies smart link clicks to filter out suspected scanner/bot duplicates.
 * Per (smartLinkId, userAgent), clicks within a session window are treated as one visit;
 * we keep only the last click in each session so prefetches and link-checker hits are dropped.
 * Raw data is never deleted; this is used only for analytics display.
 */

/** Clicks within this window (ms) from the same UA on the same smart link = one "session"; we count only the last click. */
const SESSION_WINDOW_MS = 45_000

export interface ClickForFilter {
  id: string
  smartLinkId: string
  serviceKey: string
  createdAt: Date
  userAgent?: string | null
}

/**
 * Returns the subset of clicks that are considered "human" (one per session per service intent).
 * Within each (smartLinkId, userAgent) group, clicks within SESSION_WINDOW_MS are one session;
 * we keep only the chronologically last click in that session (so the user's actual click wins over prefetches).
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

    let session: T[] = []
    const flushSession = () => {
      if (session.length > 0) {
        humanIds.add(session[session.length - 1].id)
        session = []
      }
    }

    for (const c of sorted) {
      const t = new Date(c.createdAt).getTime()
      if (session.length === 0) {
        session.push(c)
        continue
      }
      const firstInSession = new Date(session[0].createdAt).getTime()
      if (t - firstInSession <= SESSION_WINDOW_MS) {
        session.push(c)
      } else {
        flushSession()
        session.push(c)
      }
    }
    flushSession()
  }

  return clicks.filter((c) => humanIds.has(c.id))
}
