"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ThreadType = "direct" | "group" | "song_scoped" | "org_wide" | "work_collab"

interface ThreadSummary {
  id: string
  subject: string
  threadType: ThreadType
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

interface ThreadMessage {
  id: string
  createdAt: string
  bodyHtml: string | null
  bodyText: string | null
  parentMessageId: string | null
  rootMessageId: string | null
  sender: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string | null
  }
}

interface ThreadDetail {
  id: string
  subject: string
  threadType: ThreadType
  song: { id: string; title: string } | null
  messages: ThreadMessage[]
}

interface Peer {
  id: string
  firstName: string
  lastName: string
  email: string | null
}

interface SongOption {
  id: string
  title: string
}

const THREAD_TYPE_LABEL: Record<ThreadType, string> = {
  direct: "Direct",
  group: "Group",
  song_scoped: "Song",
  org_wide: "Org-wide",
  work_collab: "Work",
}

function displayName(sender: ThreadMessage["sender"]) {
  const n = `${sender.firstName ?? ""} ${sender.lastName ?? ""}`.trim()
  return n || sender.email || "Unknown"
}

export default function MessagesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === "admin"

  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [selectedThread, setSelectedThread] = useState<ThreadDetail | null>(null)
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [replyBody, setReplyBody] = useState("")
  const [sendingReply, setSendingReply] = useState(false)

  /** Root message id for Slack-style thread side panel */
  const [threadPanelRootId, setThreadPanelRootId] = useState<string | null>(null)
  const [threadReplyBody, setThreadReplyBody] = useState("")
  const [sendingThreadReply, setSendingThreadReply] = useState(false)

  const [composeOpen, setComposeOpen] = useState(false)
  const [composeSubject, setComposeSubject] = useState("")
  const [composeType, setComposeType] = useState<ThreadType>("group")
  const [composeSongId, setComposeSongId] = useState<string>("")
  const [composeParticipantIds, setComposeParticipantIds] = useState<string[]>([])
  const [peers, setPeers] = useState<Peer[]>([])
  const [songs, setSongs] = useState<SongOption[]>([])
  const [creatingThread, setCreatingThread] = useState(false)

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
      return
    }
    void loadThreads()
    void loadComposeData()
  }, [status, session])

  const loadComposeData = async () => {
    try {
      const [peersRes, songsRes] = await Promise.all([
        fetch("/api/messages/compose-candidates", { cache: "no-store" }),
        fetch("/api/songs", { cache: "no-store" }),
      ])
      if (peersRes.ok) setPeers(await peersRes.json())
      if (songsRes.ok) setSongs(await songsRes.json())
    } catch {
      /* ignore */
    }
  }

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
    setThreadPanelRootId(null)
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

  const mainMessages = useMemo(() => {
    if (!selectedThread) return []
    return selectedThread.messages.filter((m) => !m.parentMessageId)
  }, [selectedThread])

  const threadPanelMessages = useMemo(() => {
    if (!selectedThread || !threadPanelRootId) return []
    return selectedThread.messages
      .filter((m) => m.id === threadPanelRootId || m.rootMessageId === threadPanelRootId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [selectedThread, threadPanelRootId])

  const lastMessageInThreadPanel = threadPanelMessages[threadPanelMessages.length - 1]

  const sendReply = async (body: string, parentMessageId: string | null) => {
    if (!selectedThreadId || !body.trim()) return false
    const res = await fetch(`/api/messages/threads/${selectedThreadId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bodyText: body,
        parentMessageId: parentMessageId ?? undefined,
      }),
    })
    return res.ok
  }

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedThreadId || !replyBody.trim()) return
    setSendingReply(true)
    try {
      const ok = await sendReply(replyBody, null)
      if (!ok) return
      setReplyBody("")
      await selectThread(selectedThreadId)
      await loadThreads()
    } finally {
      setSendingReply(false)
    }
  }

  const handleSendThreadReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedThreadId || !threadReplyBody.trim() || !threadPanelRootId) return
    setSendingThreadReply(true)
    try {
      const parentId = lastMessageInThreadPanel?.id ?? threadPanelRootId
      const ok = await sendReply(threadReplyBody, parentId)
      if (!ok) return
      setThreadReplyBody("")
      await selectThread(selectedThreadId)
      await loadThreads()
    } finally {
      setSendingThreadReply(false)
    }
  }

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!composeSubject.trim() || composeParticipantIds.length === 0) return
    if (composeType === "song_scoped" && !composeSongId) return
    if (composeType === "direct" && composeParticipantIds.length !== 1) return
    if (composeType === "org_wide" && !isAdmin) return

    setCreatingThread(true)
    try {
      const res = await fetch("/api/messages/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: composeSubject.trim(),
          participantIds: composeParticipantIds,
          songId: composeType === "song_scoped" ? composeSongId : null,
          threadType: composeType,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || "Failed to create thread")
        return
      }
      const { id } = await res.json()
      setComposeOpen(false)
      setComposeSubject("")
      setComposeParticipantIds([])
      setComposeSongId("")
      setComposeType("group")
      await loadThreads()
      await selectThread(id)
    } finally {
      setCreatingThread(false)
    }
  }

  const togglePeer = (id: string) => {
    if (composeType === "direct") {
      setComposeParticipantIds([id])
      return
    }
    setComposeParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  if (status === "loading" || loadingThreads) {
    return <div>Loading messages...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Messages</h1>
        <Button type="button" onClick={() => setComposeOpen(true)}>
          New conversation
        </Button>
      </div>

      {composeOpen && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-lg">Start a conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4 max-w-lg" onSubmit={handleCreateThread}>
              <div className="space-y-2">
                <Label htmlFor="subj">Subject</Label>
                <Input
                  id="subj"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  required
                  placeholder="Topic"
                />
              </div>
              <div className="space-y-2">
                <Label>Channel type</Label>
                <Select
                  value={composeType}
                  onValueChange={(v) => {
                    setComposeType(v as ThreadType)
                    setComposeParticipantIds([])
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">Group</SelectItem>
                    <SelectItem value="direct">Direct (1 other person)</SelectItem>
                    <SelectItem value="song_scoped">Song-scoped</SelectItem>
                    {isAdmin && <SelectItem value="org_wide">Org-wide (admin)</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              {composeType === "song_scoped" && (
                <div className="space-y-2">
                  <Label>Song</Label>
                  <Select value={composeSongId} onValueChange={setComposeSongId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select song" />
                    </SelectTrigger>
                    <SelectContent>
                      {songs.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>
                  {composeType === "direct" ? "Other person" : "Participants"}
                </Label>
                <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                  {peers.length === 0 && (
                    <p className="text-sm text-muted-foreground">No collaborators available.</p>
                  )}
                  {peers.map((p) => {
                    const checked =
                      composeType === "direct"
                        ? composeParticipantIds[0] === p.id
                        : composeParticipantIds.includes(p.id)
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type={composeType === "direct" ? "radio" : "checkbox"}
                          name={composeType === "direct" ? "direct-peer" : undefined}
                          checked={checked}
                          onChange={() =>
                            composeType === "direct"
                              ? setComposeParticipantIds([p.id])
                              : togglePeer(p.id)
                          }
                        />
                        <span>
                          {p.firstName} {p.lastName}
                          {p.email ? ` (${p.email})` : ""}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={creatingThread}>
                  {creatingThread ? "Creating…" : "Create"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setComposeOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div
        className={`grid gap-4 ${threadPanelRootId ? "lg:grid-cols-[minmax(0,0.28fr)_minmax(0,0.42fr)_minmax(0,0.3fr)]" : "md:grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)]"}`}
      >
        <Card className="h-[70vh] flex flex-col">
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
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
                <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground mt-0.5">
                  {THREAD_TYPE_LABEL[thread.threadType] ?? thread.threadType}
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

        <Card className="h-[70vh] flex flex-col min-w-0">
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
                <div className="space-y-1 shrink-0">
                  <h2 className="text-lg font-semibold">{selectedThread.subject}</h2>
                  <p className="text-xs text-muted-foreground">
                    {THREAD_TYPE_LABEL[selectedThread.threadType] ?? selectedThread.threadType}
                  </p>
                  {selectedThread.song && (
                    <p className="text-sm text-muted-foreground">
                      Related song: {selectedThread.song.title}
                    </p>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto border rounded-md p-3 space-y-3 bg-background min-h-0">
                  {mainMessages.map((m) => (
                    <div key={m.id} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{displayName(m.sender)}</span>
                        <span>{new Date(m.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="rounded-md bg-muted px-3 py-2 text-sm">
                        {m.bodyHtml ? (
                          <div dangerouslySetInnerHTML={{ __html: m.bodyHtml }} />
                        ) : (
                          <p className="whitespace-pre-wrap">{m.bodyText}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setThreadPanelRootId(m.id)
                            setThreadReplyBody("")
                          }}
                        >
                          {threadPanelRootId === m.id ? "Thread open" : "Reply in thread"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <form className="space-y-2 shrink-0" onSubmit={handleSendReply}>
                  <textarea
                    className="w-full min-h-[80px] resize-y rounded-md border px-3 py-2 text-sm"
                    placeholder="Message…"
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                  />
                  <Button type="submit" disabled={sendingReply || !replyBody.trim()}>
                    {sendingReply ? "Sending…" : "Send"}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        {threadPanelRootId && selectedThread && (
          <Card className="h-[70vh] flex flex-col min-w-0 border-l-4 border-l-primary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">Thread</CardTitle>
              <Button type="button" variant="ghost" size="sm" onClick={() => setThreadPanelRootId(null)}>
                Close
              </Button>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-1">
                {threadPanelMessages.map((m) => (
                  <div key={m.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{displayName(m.sender)}</span>
                      <span>{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="rounded-md bg-muted/80 px-3 py-2 text-sm">
                      {m.bodyHtml ? (
                        <div dangerouslySetInnerHTML={{ __html: m.bodyHtml }} />
                      ) : (
                        <p className="whitespace-pre-wrap">{m.bodyText}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <form className="space-y-2" onSubmit={handleSendThreadReply}>
                <textarea
                  className="w-full min-h-[64px] resize-y rounded-md border px-3 py-2 text-sm"
                  placeholder="Reply in thread…"
                  value={threadReplyBody}
                  onChange={(e) => setThreadReplyBody(e.target.value)}
                />
                <Button type="submit" disabled={sendingThreadReply || !threadReplyBody.trim()}>
                  {sendingThreadReply ? "Sending…" : "Send"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
