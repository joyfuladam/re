import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * Search message bodies and thread subjects for threads the current user participates in.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? ""
  const limit = Math.min(
    50,
    Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") || "20", 10) || 20)
  )

  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const myThreads = await db.messageParticipant.findMany({
    where: { userId },
    select: { threadId: true },
  })
  const threadIds = myThreads.map((t) => t.threadId)
  if (threadIds.length === 0) {
    return NextResponse.json({ results: [] })
  }

  const [subjectHits, messageHits] = await Promise.all([
    db.messageThread.findMany({
      where: {
        id: { in: threadIds },
        subject: { contains: q, mode: "insensitive" },
      },
      select: {
        id: true,
        subject: true,
        threadType: true,
      },
      take: limit,
    }),
    db.message.findMany({
      where: {
        threadId: { in: threadIds },
        deletedAt: null,
        OR: [
          { bodyText: { contains: q, mode: "insensitive" } },
          { bodyHtml: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        threadId: true,
        bodyText: true,
        bodyHtml: true,
        createdAt: true,
        thread: {
          select: {
            id: true,
            subject: true,
            threadType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ])

  const results: Array<{
    kind: "thread" | "message"
    threadId: string
    subject: string
    threadType: string
    messageId?: string
    preview?: string
  }> = []

  for (const t of subjectHits) {
    results.push({
      kind: "thread",
      threadId: t.id,
      subject: t.subject,
      threadType: t.threadType,
    })
  }

  for (const m of messageHits) {
    const preview = (m.bodyText || m.bodyHtml || "").replace(/<[^>]+>/g, "").slice(0, 120)
    results.push({
      kind: "message",
      threadId: m.threadId,
      subject: m.thread.subject,
      threadType: m.thread.threadType,
      messageId: m.id,
      preview,
    })
  }

  const seen = new Set<string>()
  const deduped = results.filter((r) => {
    const key = `${r.kind}-${r.threadId}-${r.messageId ?? ""}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return NextResponse.json({ results: deduped.slice(0, limit) })
}
