"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type RangeOption = "7d" | "30d" | "90d" | "all"

interface SummaryItem {
  smartLinkId: string
  slug: string
  title: string
  songId: string | null
  songTitle: string | null
  totalClicks: number
  clicksByService: Record<string, number>
}

const SMART_LINK_BASE_URL =
  process.env.NEXT_PUBLIC_SMART_LINK_BASE_URL || "https://go.riverandember.com"

interface DetailResponse {
  range: string
  smartLink: {
    id: string
    slug: string
    title: string
    songId: string | null
    songTitle: string | null
  }
  totalClicks: number
  clicksByService: Record<string, number>
  clicksByDate: { date: string; total: number }[]
  recentClicks: {
    createdAt: string
    serviceKey: string
    referrer: string | null
  }[]
}

export default function SmartLinkAnalyticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === "admin"

  const [range, setRange] = useState<RangeOption>("30d")
  const [humanOnly, setHumanOnly] = useState(true)
  const [summaryItems, setSummaryItems] = useState<SummaryItem[]>([])
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<DetailResponse | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    if (status === "loading") return
    if (!isAdmin) {
      router.push("/dashboard")
      return
    }
    void loadSummary(range, humanOnly)
  }, [status, isAdmin])

  const loadSummary = async (currentRange: RangeOption, excludeScanners: boolean) => {
    try {
      setLoadingSummary(true)
      setSummaryError(null)
      const params = new URLSearchParams()
      params.set("range", currentRange)
      if (!excludeScanners) params.set("humanOnly", "false")
      const res = await fetch(`/api/smart-links/analytics/summary?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error("Failed to load smart link analytics summary:", data)
        setSummaryError(data.error || "Failed to load analytics summary")
        return
      }
      const data = await res.json()
      const items: SummaryItem[] = data.items ?? []
      setSummaryItems(items)
      if (!selectedId && items.length > 0) {
        const firstId = items[0].smartLinkId
        setSelectedId(firstId)
        void loadDetail(firstId, currentRange, excludeScanners)
      } else if (selectedId && items.find((i) => i.smartLinkId === selectedId)) {
        void loadDetail(selectedId, currentRange, excludeScanners)
      } else {
        setDetail(null)
      }
    } catch (error) {
      console.error("Error loading smart link analytics summary:", error)
      setSummaryError("Failed to load analytics summary")
    } finally {
      setLoadingSummary(false)
    }
  }

  const loadDetail = async (
    smartLinkId: string,
    currentRange: RangeOption,
    excludeScanners: boolean
  ) => {
    try {
      setLoadingDetail(true)
      setDetailError(null)
      const params = new URLSearchParams()
      params.set("range", currentRange)
      if (!excludeScanners) params.set("humanOnly", "false")
      const res = await fetch(
        `/api/smart-links/analytics/${encodeURIComponent(smartLinkId)}?${params.toString()}`
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error("Failed to load smart link analytics detail:", data)
        setDetailError(data.error || "Failed to load analytics detail")
        return
      }
      const data: DetailResponse = await res.json()
      setDetail(data)
    } catch (error) {
      console.error("Error loading smart link analytics detail:", error)
      setDetailError("Failed to load analytics detail")
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleRangeChange = (newRange: RangeOption) => {
    setRange(newRange)
    void loadSummary(newRange, humanOnly)
  }

  const handleHumanOnlyChange = (exclude: boolean) => {
    setHumanOnly(exclude)
    void loadSummary(range, exclude)
    if (selectedId) void loadDetail(selectedId, range, exclude)
  }

  const handleSelectSmartLink = (id: string) => {
    setSelectedId(id)
    void loadDetail(id, range, humanOnly)
  }

  const handleClearAllClicks = async () => {
    if (!confirm("Delete all smart link click records? Counts will reset to zero. This cannot be undone.")) return
    setClearing(true)
    try {
      const res = await fetch("/api/smart-links/analytics/clicks", { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSummaryError(data.error || "Failed to clear counts")
        return
      }
      setSummaryItems([])
      setDetail(null)
      setSelectedId(null)
      await loadSummary(range, humanOnly)
      alert(data.message ?? "Click counts cleared.")
    } catch (err) {
      console.error("Failed to clear clicks:", err)
      setSummaryError("Failed to clear counts")
    } finally {
      setClearing(false)
    }
  }

  if (status === "loading") {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Smart Link Analytics</h1>
        <p className="text-muted-foreground">
          Analyze fan engagement with your smart links by song, link, and service.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr,3fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Smart Links</CardTitle>
              <CardDescription>
                Click performance for each smart link in the selected time range.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Range</span>
                <select
                  className="border rounded-md px-2 py-1 text-xs"
                  value={range}
                  onChange={(e) => handleRangeChange(e.target.value as RangeOption)}
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="all">All time</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={!humanOnly}
                  onChange={(e) => handleHumanOnlyChange(!e.target.checked)}
                  className="rounded border-input"
                />
                <span className="text-muted-foreground">
                  Include suspected bot/scanner traffic
                </span>
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleClearAllClicks()}
                disabled={clearing || loadingSummary}
              >
                {clearing ? "Clearing…" : "Reset all click counts"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingSummary && (
              <p className="text-sm text-muted-foreground">Loading analytics summary…</p>
            )}
            {summaryError && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {summaryError}
              </p>
            )}
            {!loadingSummary && !summaryError && summaryItems.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No clicks recorded yet for any smart links in this range.
              </p>
            )}

            {!loadingSummary && !summaryError && summaryItems.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2 pr-4">Song</th>
                      <th className="text-left py-2 pr-4">Smart Link</th>
                      <th className="text-right py-2 pr-4">Total Clicks</th>
                      <th className="text-right py-2 pr-4">Spotify</th>
                      <th className="text-right py-2 pr-4">Apple</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryItems.map((item) => {
                      const isActive = item.smartLinkId === selectedId
                      const spotifyClicks = item.clicksByService["spotify"] ?? 0
                      const appleClicks = item.clicksByService["apple_music"] ?? 0
                      return (
                        <tr
                          key={item.smartLinkId}
                          className={`border-b last:border-0 cursor-pointer ${
                            isActive ? "bg-muted" : "hover:bg-muted/70"
                          }`}
                          onClick={() => handleSelectSmartLink(item.smartLinkId)}
                        >
                          <td className="py-2 pr-4">
                            {item.songTitle ? item.songTitle : "—"}
                          </td>
                          <td className="py-2 pr-4">
                            <div className="font-medium">{item.title}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[260px]">
                              {SMART_LINK_BASE_URL}/links/{item.slug}
                            </div>
                          </td>
                          <td className="py-2 pr-4 text-right">{item.totalClicks}</td>
                          <td className="py-2 pr-4 text-right">{spotifyClicks}</td>
                          <td className="py-2 pr-4 text-right">{appleClicks}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Details</CardTitle>
              <CardDescription>
                Per-service breakdown and click activity over time for the selected smart link.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selectedId && loadDetail(selectedId, range, humanOnly)}
              disabled={!selectedId || loadingDetail}
            >
              {loadingDetail ? "Refreshing…" : "Refresh"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedId && (
              <p className="text-sm text-muted-foreground">
                Select a smart link on the left to view detailed analytics.
              </p>
            )}

            {detailError && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                {detailError}
              </p>
            )}

            {selectedId && !detail && !detailError && (
              <p className="text-sm text-muted-foreground">
                {loadingDetail ? "Loading details…" : "No details available for this link."}
              </p>
            )}

            {detail && (
              <>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-medium">Song:</span>{" "}
                    {detail.smartLink.songTitle || "—"}
                  </div>
                  <div>
                    <span className="font-medium">Smart Link:</span> {detail.smartLink.title} (
                    {SMART_LINK_BASE_URL}/links/{detail.smartLink.slug})
                  </div>
                  <div>
                    <span className="font-medium">Range:</span> {detail.range}
                  </div>
                  <div>
                    <span className="font-medium">Total Clicks:</span> {detail.totalClicks}
                  </div>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <h3 className="text-sm font-medium">Clicks by Service</h3>
                  <div className="space-y-1 text-sm">
                    {Object.keys(detail.clicksByService).length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No clicks recorded for this link in the selected range.
                      </p>
                    )}
                    {Object.entries(detail.clicksByService)
                      .sort((a, b) => b[1] - a[1])
                      .map(([service, count]) => (
                        <div key={service} className="flex items-center justify-between">
                          <span className="capitalize">
                            {service.replace(/_/g, " ")}
                          </span>
                          <span className="font-mono">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <h3 className="text-sm font-medium">Clicks by Day</h3>
                  {detail.clicksByDate.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No click activity for this link in the selected range.
                    </p>
                  ) : (
                    <div className="space-y-1 text-xs">
                      {detail.clicksByDate.map((entry) => (
                        <div key={entry.date} className="flex items-center gap-2">
                          <span className="w-24">{entry.date}</span>
                          <div className="flex-1 bg-muted h-2 rounded overflow-hidden">
                            <div
                              className="h-2 bg-primary"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (entry.total / (detail.totalClicks || 1)) * 100
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="w-10 text-right font-mono">{entry.total}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t pt-3 space-y-2">
                  <h3 className="text-sm font-medium">Recent Clicks</h3>
                  {detail.recentClicks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No recent clicks recorded for this link.
                    </p>
                  ) : (
                    <div className="max-h-52 overflow-auto border rounded-md">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-[11px] text-muted-foreground">
                            <th className="text-left py-1 px-2">Time</th>
                            <th className="text-left py-1 px-2">Service</th>
                            <th className="text-left py-1 px-2">Referrer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.recentClicks.map((click, index) => (
                            <tr key={`${click.createdAt}-${index}`} className="border-b last:border-0">
                              <td className="py-1 px-2 whitespace-nowrap">
                                {new Date(click.createdAt).toLocaleString()}
                              </td>
                              <td className="py-1 px-2">
                                {click.serviceKey.replace(/_/g, " ")}
                              </td>
                              <td className="py-1 px-2 truncate max-w-[220px]">
                                {click.referrer || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

