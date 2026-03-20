"use client"

import type { ReactNode } from "react"
import type { ThreadMessage } from "./types"
import { MessageRow } from "./MessageRow"
import { formatDayLabel, sameDay } from "./dateSeparators"

export function MessageTimeline({
  messages,
  currentUserId,
  onReplyInThread,
  threadPanelRootId,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
}: {
  messages: ThreadMessage[]
  currentUserId: string
  onReplyInThread: (messageId: string) => void
  threadPanelRootId: string | null
  onToggleReaction: (messageId: string, emoji: string) => void
  onEditMessage: (messageId: string, newText: string) => Promise<void>
  onDeleteMessage: (messageId: string) => Promise<void>
}) {
  const items: ReactNode[] = []
  let lastDate: Date | null = null

  messages.forEach((m) => {
    const d = new Date(m.createdAt)
    if (!lastDate || !sameDay(lastDate, d)) {
      items.push(
        <div key={`sep-${m.id}`} className="relative py-4">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs font-medium text-muted-foreground">
              {formatDayLabel(d)}
            </span>
          </div>
        </div>
      )
      lastDate = d
    }
    items.push(
      <MessageRow
        key={m.id}
        message={m}
        currentUserId={currentUserId}
        threadOpen={threadPanelRootId === m.id}
        onReplyInThread={() => onReplyInThread(m.id)}
        onToggleReaction={(emoji) => onToggleReaction(m.id, emoji)}
        onEdit={(text) => onEditMessage(m.id, text)}
        onDelete={() => onDeleteMessage(m.id)}
      />
    )
  })

  return (
    <div className="min-h-0 flex-1 space-y-0 overflow-y-auto px-2 py-2" role="log" aria-live="polite">
      {items.length === 0 ? (
        <p className="p-4 text-center text-sm text-muted-foreground">No messages yet. Say hello below.</p>
      ) : (
        items
      )}
    </div>
  )
}
