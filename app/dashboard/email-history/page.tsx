"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EmailSubNav } from "@/components/email/EmailSubNav"

interface EmailLogItem {
  id: string
  subject: string
  scope: string
  songId: string | null
  recipientCount: number
  recipientEmails: string | null
  triggeredByEmail: string | null
  createdAt: string
  template?: {
    name: string | null
  } | null
  song?: {
    id: string
    title: string
  } | null
}

interface EmailLogDetail extends EmailLogItem {
  bodyHtml: string | null
  bodyPreview: string | null
}

export default function EmailHistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === "admin"

  const [items, setItems] = useState<EmailLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<EmailLogDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    if (status === "loading") return
    if (!isAdmin) {
      router.push("/dashboard")
      return
    }
    void fetchLogs(1, search)
  }, [status, isAdmin])

  const fetchLogs = async (pageToLoad: number, q: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set("page", String(pageToLoad))
      params.set("pageSize", String(pageSize))
      if (q) params.set("q", q)

      const res = await fetch(`/api/email-history?${params.toString()}`)
      if (!res.ok) {
        console.error("Failed to load email history")
        return
      }
      const data = await res.json()
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
      setPage(data.page ?? pageToLoad)
      if (data.items?.length && !selectedId) {
        setSelectedId(data.items[0].id)
        void fetchDetail(data.items[0].id)
      }
    } catch (error) {
      console.error("Error fetching email history:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDetail = async (id: string) => {
    try {
      setLoadingDetail(true)
      const res = await fetch(`/api/email-history/${id}`)
      if (!res.ok) {
        console.error("Failed to load email log detail")
        return
      }
      const data = await res.json()
      setSelectedDetail(data)
    } catch (error) {
      console.error("Error fetching email log detail:", error)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void fetchLogs(1, search.trim())
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const handleSelect = (id: string) => {
    setSelectedId(id)
    void fetchDetail(id)
  }

  const handleReuseAsDraft = () => {
    if (!selectedDetail) return
    const params = new URLSearchParams()
    params.set("fromLogId", selectedDetail.id)
    if (selectedDetail.songId) {
      params.set("songId", selectedDetail.songId)
      params.set("scope", "song_collaborators")
    }
    router.push(`/dashboard/email?${params.toString()}`)
  }

  if (loading && items.length === 0) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email History</h1>
        <p className="text-muted-foreground">
          View previously sent broadcast emails and reuse their content as new drafts.
        </p>
      </div>
      <EmailSubNav />

      <div className="grid gap-6 md:grid-cols-[2fr,3fr]">
        <Card>
          <CardHeader>
            <CardTitle>Sent Emails</CardTitle>
            <CardDescription>
              Recent messages sent from the app. Newest emails appear first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="flex gap-2" onSubmit={handleSearchSubmit}>
              <Input
                placeholder="Search by subject or sender"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button type="submit" variant="outline">
                Search
              </Button>
            </form>

            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">No emails have been logged yet.</p>
            )}

            {items.length > 0 && (
              <div className="space-y-1 max-h-[420px] overflow-auto border rounded-md">
                {items.map((item) => {
                  const isActive = item.id === selectedId
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      className={`w-full text-left px-3 py-2 text-sm border-b last:border-b-0 transition-colors ${
                        isActive ? "bg-muted" : "hover:bg-muted/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{item.subject}</div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {item.template?.name && (
                              <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5">
                                Template: {item.template.name}
                              </span>
                            )}
                            <span>{new Date(item.createdAt).toLocaleString()}</span>
                            {item.song?.title && <span>Song: {item.song.title}</span>}
                            <span>Recipients: {item.recipientCount}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => void fetchLogs(page - 1, search)}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => void fetchLogs(page + 1, search)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Email Details</CardTitle>
              <CardDescription>
                Inspect the full content and metadata of a sent message.
              </CardDescription>
            </div>
            <Button type="button" variant="outline" disabled={!selectedDetail} onClick={handleReuseAsDraft}>
              Reuse as Draft
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedDetail && (
              <p className="text-sm text-muted-foreground">
                Select an email on the left to view its details.
              </p>
            )}

            {loadingDetail && selectedDetail && (
              <p className="text-sm text-muted-foreground">Loading email details...</p>
            )}

            {selectedDetail && (
              <>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-medium">Subject:</span> {selectedDetail.subject}
                  </div>
                  <div>
                    <span className="font-medium">Sent at:</span>{" "}
                    {new Date(selectedDetail.createdAt).toLocaleString()}
                  </div>
                  {selectedDetail.template?.name && (
                    <div>
                      <span className="font-medium">Template:</span> {selectedDetail.template.name}
                    </div>
                  )}
                  {selectedDetail.song?.title && (
                    <div>
                      <span className="font-medium">Song:</span> {selectedDetail.song.title}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Scope:</span> {selectedDetail.scope}
                  </div>
                  <div>
                    <span className="font-medium">Recipients:</span>{" "}
                    {selectedDetail.recipientCount}{" "}
                    {selectedDetail.recipientEmails && (
                      <span className="text-xs text-muted-foreground">
                        ({selectedDetail.recipientEmails})
                      </span>
                    )}
                  </div>
                  {selectedDetail.triggeredByEmail && (
                    <div>
                      <span className="font-medium">Sent by:</span> {selectedDetail.triggeredByEmail}
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">HTML Body</h3>
                  </div>
                  <div className="border rounded-md p-3 max-h-[480px] overflow-auto bg-background">
                    {selectedDetail.bodyHtml ? (
                      <div
                        className="prose prose-sm max-w-none"
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{ __html: selectedDetail.bodyHtml }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No HTML body was stored for this email.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

