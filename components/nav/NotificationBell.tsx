"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import { cn } from "@/lib/utils"

export function NotificationBell() {
  const { status } = useSession()
  const router = useRouter()
  const [count, setCount] = useState<number>(0)

  useEffect(() => {
    if (status !== "authenticated") return

    let cancelled = false

    const fetchCount = async () => {
      try {
        const res = await fetch("/api/notifications/unread-count", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && typeof data.count === "number") {
          setCount(data.count)
        }
      } catch {
        // ignore errors for badge
      }
    }

    void fetchCount()
    const intervalId = setInterval(fetchCount, 30000)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [status])

  if (status !== "authenticated") {
    return null
  }

  return (
    <button
      type="button"
      onClick={() => router.push("/dashboard/messages")}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
      aria-label={count > 0 ? `You have ${count} unread notifications` : "No new notifications"}
    >
      <Bell className={cn("h-5 w-5", "text-black")} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 inline-flex min-h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[0.65rem] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  )
}

