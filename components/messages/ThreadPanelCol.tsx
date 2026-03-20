"use client"

import { Button } from "@/components/ui/button"
import { MessageAvatar } from "./MessageAvatar"
import type { ThreadMessage } from "./types"
import { displayName } from "./types"
import { MessageComposer } from "./MessageComposer"

export function ThreadPanelCol({
  messages,
  onClose,
  replyBody,
  onReplyBodyChange,
  onSendReply,
  sending,
}: {
  messages: ThreadMessage[]
  onClose: () => void
  replyBody: string
  onReplyBodyChange: (v: string) => void
  onSendReply: () => void
  sending: boolean
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-semibold">Thread</span>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((m) => {
          if (m.deletedAt) {
            return (
              <p key={m.id} className="text-sm italic text-muted-foreground">
                Message removed
              </p>
            )
          }
          return (
            <div key={m.id} className="flex gap-2">
              <MessageAvatar sender={m.sender} size={28} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{displayName(m.sender)}</span>
                  <span>{new Date(m.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
                </div>
                <div className="mt-0.5 rounded-md bg-muted/80 px-2 py-1.5 text-sm">
                  {m.bodyHtml ? (
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: m.bodyHtml }} />
                  ) : (
                    <p className="whitespace-pre-wrap">{m.bodyText}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <MessageComposer
        value={replyBody}
        onChange={onReplyBodyChange}
        onSubmit={onSendReply}
        sending={sending}
        disabled={false}
        placeholder="Reply in thread…"
        minHeight={64}
      />
    </div>
  )
}
