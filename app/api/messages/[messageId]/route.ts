import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

interface Params {
  params: { messageId: string }
}

async function assertThreadParticipant(threadId: string, userId: string) {
  const p = await db.messageParticipant.findFirst({
    where: { threadId, userId },
    select: { id: true },
  })
  return !!p
}

const patchSchema = z.object({
  bodyText: z.string().min(1).optional(),
  bodyHtml: z.string().optional().nullable(),
})

/** Edit own message (or admin — optional: allow only sender) */
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const messageId = params.messageId

  const msg = await db.message.findUnique({
    where: { id: messageId },
    select: { id: true, threadId: true, senderId: true, deletedAt: true },
  })
  if (!msg || msg.deletedAt) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 })
  }

  if (msg.senderId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const ok = await assertThreadParticipant(msg.threadId, userId)
  if (!ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 })
  }

  const { bodyText, bodyHtml } = parsed.data
  if (bodyText === undefined && bodyHtml === undefined) {
    return NextResponse.json({ error: "No changes" }, { status: 400 })
  }

  await db.message.update({
    where: { id: messageId },
    data: {
      ...(bodyText !== undefined ? { bodyText } : {}),
      ...(bodyHtml !== undefined ? { bodyHtml } : {}),
    },
  })

  return NextResponse.json({ ok: true })
}

/** Soft-delete own message */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const messageId = params.messageId

  const msg = await db.message.findUnique({
    where: { id: messageId },
    select: { id: true, threadId: true, senderId: true, deletedAt: true },
  })
  if (!msg || msg.deletedAt) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 })
  }

  if (msg.senderId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const ok = await assertThreadParticipant(msg.threadId, userId)
  if (!ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await db.message.update({
    where: { id: messageId },
    data: {
      deletedAt: new Date(),
      bodyText: null,
      bodyHtml: null,
    },
  })

  return NextResponse.json({ ok: true })
}
