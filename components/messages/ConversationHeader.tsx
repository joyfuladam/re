"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { ThreadDetail } from "./types"
import { THREAD_TYPE_LABEL } from "./types"

export function ConversationHeader({ thread }: { thread: ThreadDetail }) {
  const title =
    thread.threadType === "direct" && thread.directPeerName
      ? thread.directPeerName
      : thread.subject

  return (
    <div className="shrink-0 border-b bg-background px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold leading-tight">{title}</h2>
        <Badge variant="secondary" className="text-[0.65rem] font-normal">
          {THREAD_TYPE_LABEL[thread.threadType] ?? thread.threadType}
        </Badge>
      </div>
      {thread.song && (
        <p className="mt-1 text-sm text-muted-foreground">
          Recording:{" "}
          <Link href={`/dashboard/songs/${thread.song.id}`} className="font-medium text-primary hover:underline">
            {thread.song.title}
          </Link>
        </p>
      )}
      {thread.work && (
        <p className="mt-1 text-sm text-muted-foreground">
          Composition:{" "}
          <Link href={`/dashboard/works/${thread.work.id}`} className="font-medium text-primary hover:underline">
            {thread.work.title}
          </Link>
        </p>
      )}
    </div>
  )
}
