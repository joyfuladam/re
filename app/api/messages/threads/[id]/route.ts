import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

interface Params {
  params: { id: string }
}

// Fetch a single thread (and optionally mark as read)
export async function GET(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const threadId = params.id

  const participant = await db.messageParticipant.findFirst({
    where: { threadId, userId },
    include: {
      thread: {
        include: {
          song: {
            select: { id: true, title: true },
          },
          messages: {
            orderBy: { createdAt: "asc" },
            include: {
              sender: {
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
        },
      },
    },
  })

  if (!participant || !participant.thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const markRead = searchParams.get("markRead") === "true"

  if (markRead) {
    const now = new Date()
    await db.messageParticipant.updateMany({
      where: { threadId, userId },
      data: { lastReadAt: now },
    })

    await db.notification.updateMany({
      where: {
        userId,
        readAt: null,
        type: "MESSAGE",
        message: {
          threadId,
        },
      },
      data: {
        readAt: now,
      },
    })
  }

  const thread = participant.thread

  return NextResponse.json({
    id: thread.id,
    subject: thread.subject,
    song: thread.song
      ? {
          id: thread.song.id,
          title: thread.song.title,
        }
      : null,
    messages: thread.messages.map((m) => ({
      id: m.id,
      createdAt: m.createdAt,
      bodyHtml: m.bodyHtml,
      bodyText: m.bodyText,
      sender: m.sender,
    })),
  })
}

const replySchema = z.object({
  bodyHtml: z.string().optional(),
  bodyText: z.string().optional(),
})

// Post a reply to a thread
export async function POST(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const threadId = params.id

  const participant = await db.messageParticipant.findFirst({
    where: { threadId, userId },
    select: { id: true },
  })

  if (!participant) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 })
  }

  const body = await request.json()
  const parsed = replySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.errors }, { status: 400 })
  }

  const { bodyHtml, bodyText } = parsed.data
  if (!bodyHtml && !bodyText) {
    return NextResponse.json({ error: "Message body is required" }, { status: 400 })
  }

  const message = await db.message.create({
    data: {
      threadId,
      senderId: userId,
      bodyHtml: bodyHtml || null,
      bodyText: bodyText || null,
    },
  })

  const now = new Date()

  await db.messageThread.update({
    where: { id: threadId },
    data: { updatedAt: now },
  })

  await db.messageParticipant.updateMany({
    where: { threadId, userId },
    data: { lastReadAt: now },
  })

  const participants = await db.messageParticipant.findMany({
    where: { threadId },
    select: { userId: true },
  })

  if (participants.length > 0) {
    await db.notification.createMany({
      data: participants
        .filter((p) => p.userId !== userId)
        .map((p) => ({
          userId: p.userId,
          type: "MESSAGE",
          messageId: message.id,
        })),
    })
  }

  return NextResponse.json({ id: message.id })
}

