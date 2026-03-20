"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MessagesShell } from "@/components/messages/MessagesShell"
import { ConversationSidebar } from "@/components/messages/ConversationSidebar"
import { ConversationHeader } from "@/components/messages/ConversationHeader"
import { MessageTimeline } from "@/components/messages/MessageTimeline"
import { MessageComposer } from "@/components/messages/MessageComposer"
import { ThreadPanelCol } from "@/components/messages/ThreadPanelCol"
import { ComposeThreadDialog } from "@/components/messages/ComposeThreadDialog"
import { MessagesSearchModal } from "@/components/messages/MessagesSearchModal"
import type { Peer, SongOption, WorkOption } from "@/components/messages/compose-types"
import type { ThreadDetail, ThreadMessage, ThreadSummary, ThreadType } from "@/components/messages/types"

export default function MessagesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === "admin"
  const currentUserId = session?.user?.id ?? ""

  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [selectedThread, setSelectedThread] = useState<ThreadDetail | null>(null)
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [loadingThread, setLoadingThread] = useState(false)
  const [replyBody, setReplyBody] = useState("")
  const [sendingReply, setSendingReply] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const [threadPanelRootId, setThreadPanelRootId] = useState<string | null>(null)
  const [threadReplyBody, setThreadReplyBody] = useState("")
  const [sendingThreadReply, setSendingThreadReply] = useState(false)

  const [composeOpen, setComposeOpen] = useState(false)
  const [composeSubject, setComposeSubject] = useState("")
  const [composeType, setComposeType] = useState<ThreadType>("group")
  const [composeSongId, setComposeSongId] = useState("")
  const [composeParticipantIds, setComposeParticipantIds] = useState<string[]>([])
  const [peers, setPeers] = useState<Peer[]>([])
  const [songs, setSongs] = useState<SongOption[]>([])
  const [worksOptions, setWorksOptions] = useState<WorkOption[]>([])
  const [composeWorkId, setComposeWorkId] = useState("")
  const [creatingThread, setCreatingThread] = useState(false)

  const [sidebarSearch, setSidebarSearch] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)

  const setComposeTypeSafe = useCallback((v: ThreadType) => {
    setComposeType(v)
    setComposeParticipantIds([])
    setComposeSongId("")
    setComposeWorkId("")
  }, [])

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
      return
    }
    void loadThreads()
    void loadComposeData()
  }, [status, session, router])

  /** Poll active thread + list for “realtime-lite” */
  useEffect(() => {
    if (!selectedThreadId || status !== "authenticated") return
    const tick = () => {
      void loadThreads()
      void selectThread(selectedThreadId, false)
    }
    const id = setInterval(tick, 12000)
    const onVis = () => {
      if (document.visibilityState === "visible") tick()
    }
    document.addEventListener("visibilitychange", onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [selectedThreadId, status])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const loadComposeData = async () => {
    try {
      const [peersRes, songsRes, worksRes] = await Promise.all([
        fetch("/api/messages/compose-candidates", { cache: "no-store" }),
        fetch("/api/songs", { cache: "no-store" }),
        fetch("/api/works?limit=500", { cache: "no-store" }),
      ])
      if (peersRes.ok) setPeers(await peersRes.json())
      if (songsRes.ok) setSongs(await songsRes.json())
      if (worksRes.ok) {
        const w = await worksRes.json()
        setWorksOptions(Array.isArray(w) ? w : [])
      }
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
        void selectThread(data[0].id, true)
      }
    } finally {
      setLoadingThreads(false)
    }
  }

  const selectThread = async (threadId: string, markRead = true) => {
    setSelectedThreadId(threadId)
    setThreadPanelRootId(null)
    try {
      setLoadingThread(true)
      const q = markRead ? "?markRead=true" : ""
      const res = await fetch(`/api/messages/threads/${threadId}${q}`, { cache: "no-store" })
      if (!res.ok) return
      const data: ThreadDetail = await res.json()
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

  const uploadFilesToMessage = async (messageId: string, files: File[]) => {
    for (const file of files) {
      const fd = new FormData()
      fd.append("file", file)
      await fetch(`/api/messages/${messageId}/attachments`, {
        method: "POST",
        body: fd,
      })
    }
  }

  const sendReply = async (body: string, parentMessageId: string | null): Promise<string | null> => {
    if (!selectedThreadId || !body.trim()) return null
    const res = await fetch(`/api/messages/threads/${selectedThreadId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bodyText: body,
        parentMessageId: parentMessageId ?? undefined,
      }),
    })
    if (!res.ok) return null
    const data = await res.json().catch(() => ({}))
    return typeof data.id === "string" ? data.id : null
  }

  const handleSendReply = async () => {
    if (!selectedThreadId || !replyBody.trim()) return
    setSendingReply(true)
    try {
      const id = await sendReply(replyBody, null)
      if (!id) return
      if (pendingFiles.length > 0) {
        await uploadFilesToMessage(id, pendingFiles)
        setPendingFiles([])
      }
      setReplyBody("")
      await selectThread(selectedThreadId, true)
      await loadThreads()
    } finally {
      setSendingReply(false)
    }
  }

  const handleSendThreadReply = async () => {
    if (!selectedThreadId || !threadReplyBody.trim() || !threadPanelRootId) return
    setSendingThreadReply(true)
    try {
      const parentId = lastMessageInThreadPanel?.id ?? threadPanelRootId
      const id = await sendReply(threadReplyBody, parentId)
      if (!id) return
      setThreadReplyBody("")
      await selectThread(selectedThreadId, true)
      await loadThreads()
    } finally {
      setSendingThreadReply(false)
    }
  }

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    const res = await fetch(`/api/messages/${messageId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    })
    if (res.ok && selectedThreadId) {
      await selectThread(selectedThreadId, false)
    }
  }

  const handleEditMessage = async (messageId: string, newText: string) => {
    const res = await fetch(`/api/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bodyText: newText }),
    })
    if (res.ok && selectedThreadId) {
      await selectThread(selectedThreadId, false)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    const res = await fetch(`/api/messages/${messageId}`, { method: "DELETE" })
    if (res.ok && selectedThreadId) {
      await selectThread(selectedThreadId, false)
      await loadThreads()
    }
  }

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!composeSubject.trim() || composeParticipantIds.length === 0) return
    if (composeType === "song_scoped" && !composeSongId) return
    if (composeType === "work_collab" && !composeWorkId) return
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
          workId: composeType === "work_collab" ? composeWorkId : null,
          threadType: composeType,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert((err as { error?: string }).error || "Failed to create thread")
        return
      }
      const { id } = await res.json()
      setComposeOpen(false)
      setComposeSubject("")
      setComposeParticipantIds([])
      setComposeSongId("")
      setComposeWorkId("")
      setComposeTypeSafe("group")
      await loadThreads()
      await selectThread(id, true)
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
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
        Loading messages…
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-3 pt-2 md:px-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Messages</h1>
          <p className="text-xs text-muted-foreground">
            <kbd className="rounded border bg-muted px-1 py-0.5 text-[0.65rem]">⌘K</kbd> search · Enter
            to send
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setSearchOpen(true)}>
            Search
          </Button>
          <Button type="button" size="sm" onClick={() => setComposeOpen(true)}>
            New conversation
          </Button>
        </div>
      </div>

      <ComposeThreadDialog
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        isAdmin={!!isAdmin}
        composeSubject={composeSubject}
        setComposeSubject={setComposeSubject}
        composeType={composeType}
        setComposeType={setComposeTypeSafe}
        composeSongId={composeSongId}
        setComposeSongId={setComposeSongId}
        composeWorkId={composeWorkId}
        setComposeWorkId={setComposeWorkId}
        composeParticipantIds={composeParticipantIds}
        peers={peers}
        songs={songs}
        worksOptions={worksOptions}
        creatingThread={creatingThread}
        onSubmit={handleCreateThread}
        togglePeer={togglePeer}
      />

      <MessagesSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectThread={(id) => void selectThread(id, true)}
      />

      <MessagesShell
        hasThread={!!threadPanelRootId}
        sidebar={
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Inbox
              </span>
            </div>
            <ConversationSidebar
              threads={threads}
              selectedThreadId={selectedThreadId}
              onSelect={(id) => void selectThread(id, true)}
              search={sidebarSearch}
              onSearchChange={setSidebarSearch}
            />
          </div>
        }
        main={
          <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
            {loadingThread && (
              <p className="p-4 text-sm text-muted-foreground">Loading conversation…</p>
            )}
            {!loadingThread && !selectedThread && (
              <p className="p-6 text-sm text-muted-foreground">Select a conversation from the list.</p>
            )}
            {!loadingThread && selectedThread && (
              <>
                <ConversationHeader thread={selectedThread} />
                <MessageTimeline
                  messages={mainMessages}
                  currentUserId={currentUserId}
                  threadPanelRootId={threadPanelRootId}
                  onReplyInThread={(messageId) => {
                    setThreadPanelRootId(messageId)
                    setThreadReplyBody("")
                  }}
                  onToggleReaction={handleToggleReaction}
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={handleDeleteMessage}
                />
                <MessageComposer
                  value={replyBody}
                  onChange={setReplyBody}
                  onSubmit={() => void handleSendReply()}
                  sending={sendingReply}
                  disabled={false}
                  onFilesSelected={(files) => {
                    if (files?.length) setPendingFiles((p) => [...p, ...Array.from(files)])
                  }}
                />
                {pendingFiles.length > 0 && (
                  <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                    {pendingFiles.length} file(s) will attach after send ·{" "}
                    <button
                      type="button"
                      className="text-primary underline"
                      onClick={() => setPendingFiles([])}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        }
        thread={
          threadPanelRootId && selectedThread ? (
            <ThreadPanelCol
              messages={threadPanelMessages}
              onClose={() => setThreadPanelRootId(null)}
              replyBody={threadReplyBody}
              onReplyBodyChange={setThreadReplyBody}
              onSendReply={() => void handleSendThreadReply()}
              sending={sendingThreadReply}
            />
          ) : (
            <div />
          )
        }
      />
    </div>
  )
}
