"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ThreadSummary {
  id: string
  subject: string
  song: { id: string; title: string } | null
  lastMessage: {
    id: string
    createdAt: string
    preview: string
    sender: {
      id: string
      firstName: string | null
      lastName: string | null
      email: string | null
    }
  } | null
  updatedAt: string
  unreadCount: number
}

interface ThreadDetail {
  id: string
  subject: string
  song: { id: string; title: string } | null
  messages: {
    id: string
    createdAt: string
    bodyHtml: string | null
    bodyText: string | null
    sender: {
      id: string
      firstName: string | null
      lastName: string | null
      email: string | null
    }
  }[]
}

export default function MessagesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [selectedThread, setSelectedThread] = useState<ThreadDetail | null>(null)
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [replyBody, setReplyBody] = useState("")
  const [sendingReply, setSendingReply] = useState(false)

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
      return
    }
    void loadThreads()
  }, [status, session])

  const loadThreads = async () => {
    try {
      setLoadingThreads(true)
      const res = await fetch("/api/messages/threads", { cache: "no-store" })
      if (!res.ok) {
        setThreads([])
        return
      }
      const data = await res.json()
      setThreads(data)
      if (!selectedThreadId && data.length > 0) {
        void selectThread(data[0].id)
      }
    } finally {
      setLoadingThreads(false)
    }
  }

  const selectThread = async (threadId: string) => {
    setSelectedThreadId(threadId)
    try {
      setLoadingThread(true)
      const res = await fetch(`/api/messages/threads/${threadId}?markRead=true`, { cache: "no-store" })
      if (!res.ok) {
        return
      }
      const data = await res.json()
      setSelectedThread(data)
      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0, updatedAt: t.updatedAt } : t))
      )
    } finally {
      setLoadingThread(false)
    }
  }

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedThreadId || !replyBody.trim()) return

    setSendingReply(true)
    try {
      const res = await fetch(`/api/messages/threads/${selectedThreadId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bodyText: replyBody }),
      })
      if (!res.ok) {
        console.error("Failed to send reply")
        return
      }
      setReplyBody("")
      await selectThread(selectedThreadId)
      await loadThreads()
    } finally {
      setSendingReply(false)
    }
  }

  if (status === "loading" || loadingThreads) {
    return <div>Loading messages...</div>
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]">
      <Card className="h-[70vh] flex flex-col">
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-1">
          {threads.length === 0 && (
            <p className="text-sm text-muted-foreground">No conversations yet.</p>
          )}
          {threads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => void selectThread(thread.id)}
              className={`w-full text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                selectedThreadId === thread.id ? "bg-muted" : "hover:bg-muted/60"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium line-clamp-1">{thread.subject}</div>
                {thread.unreadCount > 0 && (
                  <span className="ml-2 inline-flex min-h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[0.65rem] font-bold text-white">
                    {thread.unreadCount}
                  </span>
                )}
              </div>
              {thread.song && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  Song: {thread.song.title}
                </div>
              )}
              {thread.lastMessage && (
                <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {thread.lastMessage.preview || "New message"}
                </div>
              )}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="h-[70vh] flex flex-col">
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
          {loadingThread && <p className="text-sm text-muted-foreground">Loading thread...</p>}
          {!loadingThread && !selectedThread && (
            <p className="text-sm text-muted-foreground">Select a message thread to view.</p>
          )}
          {!loadingThread && selectedThread && (
            <>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{selectedThread.subject}</h2>
                {selectedThread.song && (
                  <p className="text-sm text-muted-foreground">
                    Related song: {selectedThread.song.title}
                  </p>
                )}
              </div>
              <div className="flex-1 overflow-y-auto border rounded-md p-3 space-y-3 bg-background">
                {selectedThread.messages.map((m) => (
                  <div key={m.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        {m.sender.firstName || m.sender.lastName
                          ? `${m.sender.firstName ?? ""} ${m.sender.lastName ?? ""}`.trim()
                          : m.sender.email}
                      </span>
                      <span>{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="rounded-md bg-muted px-3 py-2 text-sm">
                      {m.bodyHtml ? (
                        <div dangerouslySetInnerHTML={{ __html: m.bodyHtml }} />
                      ) : (
                        <p className="whitespace-pre-wrap">{m.bodyText}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <form className="space-y-2" onSubmit={handleSendReply}>
                <textarea
                  className="w-full min-h-[80px] resize-y rounded-md border px-3 py-2 text-sm"
                  placeholder="Type your reply..."
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="submit"
                    disabled={sendingReply || !replyBody.trim()}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {sendingReply ? "Sending..." : "Send Reply"}
                  </button>
                </div>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

