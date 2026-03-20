import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { MessageThreadType } from "@prisma/client"
import { z } from "zod"

interface Params {
  params: { id: string }
}

function peerDisplayName(u: {
  firstName: string
  lastName: string
  email: string | null
}) {
  const n = `${u.firstName} ${u.lastName}`.trim()
  return n || u.email || "Unknown"
}

function groupReactions(rows: { emoji: string; userId: string }[]) {
  const map = new Map<string, string[]>()
  for (const r of rows) {
    const arr = map.get(r.emoji) ?? []
    arr.push(r.userId)
    map.set(r.emoji, arr)
  }
  return Array.from(map.entries()).map(([emoji, userIds]) => ({ emoji, userIds }))
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
          work: {
            select: { id: true, title: true },
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "asc" },
            include: {
              sender: {
                select: { id: true, firstName: true, lastName: true, email: true, image: true },
              },
              reactions: {
                select: { emoji: true, userId: true },
              },
              attachments: {
                select: {
                  id: true,
                  fileName: true,
                  mimeType: true,
                  fileSize: true,
                  storagePath: true,
                },
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

  let directPeerName: string | null = null
  if (thread.threadType === MessageThreadType.direct) {
    const other = thread.participants.find((p) => p.userId !== userId)
    if (other?.user) {
      directPeerName = peerDisplayName(other.user)
    }
  }

  const participantsPayload = thread.participants.map((p) => ({
    userId: p.userId,
    firstName: p.user.firstName,
    lastName: p.user.lastName,
    email: p.user.email,
    image: p.user.image,
  }))

  return NextResponse.json({
    id: thread.id,
    subject: thread.subject,
    threadType: thread.threadType,
    song: thread.song
      ? {
          id: thread.song.id,
          title: thread.song.title,
        }
      : null,
    work: thread.work
      ? {
          id: thread.work.id,
          title: thread.work.title,
        }
      : null,
    directPeerName,
    participants: participantsPayload,
    messages: thread.messages.map((m) => ({
      id: m.id,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      deletedAt: m.deletedAt,
      bodyHtml: m.bodyHtml,
      bodyText: m.bodyText,
      parentMessageId: m.parentMessageId,
      rootMessageId: m.rootMessageId,
      sender: m.sender,
      reactions: groupReactions(m.reactions),
      attachments: m.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
        url: `/api/messages/attachments/${a.id}/file`,
      })),
    })),
  })
}

const replySchema = z.object({
  bodyHtml: z.string().optional(),
  bodyText: z.string().optional(),
  /** Reply in thread (Slack-style); omit for main channel message */
  parentMessageId: z.string().optional().nullable(),
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

  const { bodyHtml, bodyText, parentMessageId } = parsed.data
  if (!bodyHtml && !bodyText) {
    return NextResponse.json({ error: "Message body is required" }, { status: 400 })
  }

  let rootMessageId: string | null = null
  if (parentMessageId) {
    const parent = await db.message.findFirst({
      where: { id: parentMessageId, threadId },
      select: { id: true, rootMessageId: true },
    })
    if (!parent) {
      return NextResponse.json({ error: "Parent message not found in this thread" }, { status: 400 })
    }
    rootMessageId = parent.rootMessageId || parent.id
  }

  const message = await db.message.create({
    data: {
      threadId,
      senderId: userId,
      bodyHtml: bodyHtml || null,
      bodyText: bodyText || null,
      parentMessageId: parentMessageId || null,
      rootMessageId,
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

