"use client"

import type { ReactNode } from "react"

export function MessagesShell({
  sidebar,
  main,
  thread,
  hasThread,
}: {
  sidebar: ReactNode
  main: ReactNode
  thread: ReactNode
  hasThread: boolean
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background shadow-sm lg:flex-row">
      <aside className="flex max-h-[38vh] shrink-0 flex-col border-b bg-muted/30 lg:max-h-none lg:w-[280px] lg:border-b-0 lg:border-r">
        {sidebar}
      </aside>
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">{main}</section>
      {hasThread && (
        <aside className="flex max-h-[45vh] min-h-0 w-full shrink-0 flex-col border-t bg-muted/20 lg:max-h-none lg:w-[min(100%,360px)] lg:border-l lg:border-t-0">
          {thread}
        </aside>
      )}
    </div>
  )
}
