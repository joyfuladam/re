"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { MessageAvatar } from "@/components/messages/MessageAvatar"
import type { ThreadDetail, ThreadMessage } from "@/components/messages/types"
import { displayName } from "@/components/messages/types"

export function SongwritingChatPanel({ threadId }: { threadId: string }) {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? ""

  const [detail, setDetail] = useState<ThreadDetail | null>(null)
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true)
      try {
        const res = await fetch(`/api/messages/threads/${threadId}?markRead=true`, { cache: "no-store" })
        if (res.ok) {
          const data: ThreadDetail = await res.json()
          setDetail(data)
        }
      } finally {
        if (!opts?.silent) setLoading(false)
      }
    },
    [threadId]
  )

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const id = setInterval(() => void load({ silent: true }), 20000)
    return () => clearInterval(id)
  }, [load])

  const mainMessages = useMemo(() => {
    if (!detail) return []
    return detail.messages.filter((m) => !m.parentMessageId)
  }, [detail])

  const send = async () => {
    if (!body.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/messages/threads/${threadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodyText: body.trim() }),
      })
      if (res.ok) {
        setBody("")
        await load({ silent: true })
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex min-h-[420px] flex-col rounded-lg border bg-background">
      <div className="border-b px-3 py-2">
        <h3 className="text-sm font-semibold">Songwriting chat</h3>
        <p className="text-[0.7rem] text-muted-foreground">
          Same thread as in Messages — labeled &quot;Songwriting&quot; in your inbox.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-3">
        {loading && !detail && <p className="text-sm text-muted-foreground">Loading…</p>}
        {mainMessages.map((m: ThreadMessage) =>
          m.deletedAt ? (
            <p key={m.id} className="text-xs italic text-muted-foreground">
              Message removed
            </p>
          ) : (
            <div key={m.id} className="flex gap-2">
              <MessageAvatar sender={m.sender} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{displayName(m.sender)}</span>
                  <span>
                    {new Date(m.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
                <div className="mt-0.5 rounded-md bg-muted/50 px-2 py-1.5 text-sm">
                  {m.bodyHtml ? (
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: m.bodyHtml }} />
                  ) : (
                    <p className="whitespace-pre-wrap">{m.bodyText}</p>
                  )}
                </div>
              </div>
            </div>
          )
        )}
        {detail && mainMessages.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages yet — start the conversation.</p>
        )}
      </div>
      <div className="border-t p-3">
        <textarea
          className="mb-2 w-full min-h-[72px] rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Write a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
        />
        <Button type="button" size="sm" disabled={sending || !body.trim()} onClick={() => void send()}>
          {sending ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  )
}
