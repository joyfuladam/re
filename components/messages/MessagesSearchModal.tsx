"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export interface SearchHit {
  kind: "thread" | "message"
  threadId: string
  subject: string
  threadType: string
  messageId?: string
  preview?: string
}

export function MessagesSearchModal({
  open,
  onClose,
  onSelectThread,
}: {
  open: boolean
  onClose: () => void
  onSelectThread: (threadId: string) => void
}) {
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchHit[]>([])

  useEffect(() => {
    if (!open) {
      setQ("")
      setResults([])
      return
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onEsc)
    return () => window.removeEventListener("keydown", onEsc)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      const query = q.trim()
      if (query.length < 2) {
        setResults([])
        return
      }
      setLoading(true)
      fetch(`/api/messages/search?q=${encodeURIComponent(query)}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          setResults(Array.isArray(data.results) ? data.results : [])
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [q, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 p-4 pt-[12vh]" role="dialog" aria-modal>
      <div className="w-full max-w-lg rounded-lg border bg-background shadow-xl">
        <div className="flex items-center gap-2 border-b p-3">
          <Input
            autoFocus
            placeholder="Search messages…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1"
          />
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Esc
          </Button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {loading && <p className="p-2 text-sm text-muted-foreground">Searching…</p>}
          {!loading && q.trim().length < 2 && (
            <p className="p-2 text-sm text-muted-foreground">Type at least 2 characters.</p>
          )}
          {!loading &&
            q.trim().length >= 2 &&
            results.length === 0 && (
              <p className="p-2 text-sm text-muted-foreground">No results.</p>
            )}
          <ul className="space-y-1">
            {results.map((r, i) => (
              <li key={`${r.kind}-${r.threadId}-${r.messageId ?? i}`}>
                <button
                  type="button"
                  className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    onSelectThread(r.threadId)
                    onClose()
                  }}
                >
                  <div className="font-medium line-clamp-1">{r.subject}</div>
                  {r.preview && <div className="text-xs text-muted-foreground line-clamp-2">{r.preview}</div>}
                  <div className="text-[0.65rem] uppercase text-muted-foreground">{r.threadType}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
