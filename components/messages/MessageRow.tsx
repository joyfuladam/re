"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MessageAvatar } from "./MessageAvatar"
import type { ThreadMessage } from "./types"
import { displayName } from "./types"

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "👀"]

export function MessageRow({
  message,
  currentUserId,
  onReplyInThread,
  threadOpen,
  onToggleReaction,
  onEdit,
  onDelete,
}: {
  message: ThreadMessage
  currentUserId: string
  onReplyInThread: () => void
  threadOpen: boolean
  onToggleReaction: (emoji: string) => void
  onEdit: (newText: string) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(message.bodyText || "")
  const [saving, setSaving] = useState(false)
  const isMine = message.sender.id === currentUserId
  const deleted = !!message.deletedAt

  const time = new Date(message.createdAt).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })

  if (deleted) {
    return (
      <div className="flex gap-3 py-1 pl-2 text-sm italic text-muted-foreground">
        <div className="w-9 shrink-0" />
        <p>This message was deleted.</p>
      </div>
    )
  }

  return (
    <div className="group flex gap-3 py-2 pl-2 pr-1 hover:bg-muted/40">
      <MessageAvatar sender={message.sender} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
          <span className="font-semibold">{displayName(message.sender)}</span>
          <span className="text-xs text-muted-foreground">{time}</span>
          {message.updatedAt &&
            new Date(message.updatedAt).getTime() !== new Date(message.createdAt).getTime() && (
              <span className="text-[0.65rem] text-muted-foreground">(edited)</span>
            )}
        </div>
        {editing ? (
          <div className="mt-1 space-y-2">
            <textarea
              className="w-full min-h-[72px] rounded-md border bg-background px-3 py-2 text-sm"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                type="button"
                disabled={saving || !editText.trim()}
                onClick={async () => {
                  setSaving(true)
                  try {
                    await onEdit(editText.trim())
                    setEditing(false)
                  } finally {
                    setSaving(false)
                  }
                }}
              >
                Save
              </Button>
              <Button size="sm" type="button" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-0.5 text-sm">
            {message.bodyHtml ? (
              <div className="prose prose-sm dark:prose-invert max-w-none [&_a]:text-primary" dangerouslySetInnerHTML={{ __html: message.bodyHtml }} />
            ) : (
              <p className="whitespace-pre-wrap">{message.bodyText}</p>
            )}
            {message.attachments && message.attachments.length > 0 && (
              <ul className="mt-2 space-y-1">
                {message.attachments.map((a) => (
                  <li key={a.id}>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2 hover:text-primary/80"
                    >
                      {a.fileName}
                    </a>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({Math.round(a.fileSize / 1024)} KB)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onReplyInThread}
          >
            {threadOpen ? "Thread open" : "Reply in thread"}
          </Button>
          {isMine && !editing && (
            <>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive"
                onClick={() => {
                  if (confirm("Delete this message?")) void onDelete()
                }}
              >
                Delete
              </Button>
            </>
          )}
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="rounded px-1.5 py-0.5 text-sm hover:bg-muted"
              onClick={() => onToggleReaction(emoji)}
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onToggleReaction(r.emoji)}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                  r.userIds.includes(currentUserId) ? "border-primary bg-primary/10" : "border-border bg-muted/50"
                }`}
              >
                <span>{r.emoji}</span>
                <span className="text-muted-foreground">{r.userIds.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
