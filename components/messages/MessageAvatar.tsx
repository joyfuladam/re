"use client"

import type { MessageSender } from "./types"
import { displayName } from "./types"

function initials(sender: MessageSender) {
  const f = sender.firstName?.[0] ?? ""
  const l = sender.lastName?.[0] ?? ""
  if (f || l) return (f + l).toUpperCase()
  return (sender.email?.[0] ?? "?").toUpperCase()
}

export function MessageAvatar({
  sender,
  size = 36,
  className = "",
}: {
  sender: MessageSender
  size?: number
  className?: string
}) {
  const img = sender.image
  const isRemote = img?.startsWith("http") || img?.startsWith("//")

  if (img && isRemote) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={img}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-md object-cover ${className}`}
      />
    )
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-md bg-muted font-semibold text-muted-foreground ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.32) }}
      title={displayName(sender)}
    >
      {initials(sender)}
    </div>
  )
}
