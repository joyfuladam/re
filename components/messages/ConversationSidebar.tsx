"use client"

import { Input } from "@/components/ui/input"
import type { ThreadSummary, ThreadType } from "./types"
import { THREAD_SECTION_ORDER, THREAD_TYPE_LABEL, threadListTitle } from "./types"

export function ConversationSidebar({
  threads,
  selectedThreadId,
  onSelect,
  search,
  onSearchChange,
}: {
  threads: ThreadSummary[]
  selectedThreadId: string | null
  onSelect: (id: string) => void
  search: string
  onSearchChange: (v: string) => void
}) {
  const q = search.trim().toLowerCase()
  const filtered = q
    ? threads.filter((t) => {
        const title = threadListTitle(t).toLowerCase()
        const sub = t.subject.toLowerCase()
        const prev = t.lastMessage?.preview?.toLowerCase() ?? ""
        return title.includes(q) || sub.includes(q) || prev.includes(q)
      })
    : threads

  const byType = (type: ThreadType) => filtered.filter((t) => t.threadType === type)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b p-3">
        <Input
          placeholder="Search conversations…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 bg-background"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {filtered.length === 0 && (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">No matches.</p>
        )}
        {THREAD_SECTION_ORDER.map((type) => {
          const list = byType(type)
          if (list.length === 0) return null
          return (
            <div key={type} className="mb-4">
              <div className="px-2 pb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                {THREAD_TYPE_LABEL[type]}
              </div>
              <ul className="space-y-0.5">
                {list.map((thread) => (
                  <li key={thread.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(thread.id)}
                      className={`w-full rounded-md px-2 py-2 text-left text-sm transition-colors ${
                        selectedThreadId === thread.id ? "bg-primary/15 font-medium" : "hover:bg-muted/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="line-clamp-2">{threadListTitle(thread)}</span>
                        {thread.unreadCount > 0 && (
                          <span className="mt-0.5 inline-flex min-h-[1.1rem] min-w-[1.1rem] shrink-0 items-center justify-center rounded-full bg-red-600 px-1 text-[0.65rem] font-bold text-white">
                            {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                          </span>
                        )}
                      </div>
                      {thread.song && (
                        <div className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">
                          {thread.threadType === "songwriting"
                            ? `Songwriting · ${thread.song.title}`
                            : `Recording · ${thread.song.title}`}
                        </div>
                      )}
                      {thread.work && (
                        <div className="mt-0.5 truncate text-[0.7rem] text-muted-foreground">
                          Composition · {thread.work.title}
                        </div>
                      )}
                      {thread.lastMessage && (
                        <div className="mt-1 line-clamp-2 text-[0.75rem] text-muted-foreground">
                          {thread.lastMessage.preview || "…"}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
