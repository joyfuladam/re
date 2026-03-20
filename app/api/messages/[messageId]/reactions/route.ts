import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

interface Params {
  params: { messageId: string }
}

const schema = z.object({
  emoji: z.string().min(1).max(32),
})

/** Toggle reaction: POST adds if missing, removes if present */
export async function POST(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const messageId = params.messageId

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid emoji" }, { status: 400 })
  }
  const { emoji } = parsed.data

  const msg = await db.message.findUnique({
    where: { id: messageId },
    select: { id: true, threadId: true, deletedAt: true },
  })
  if (!msg || msg.deletedAt) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 })
  }

  const participant = await db.messageParticipant.findFirst({
    where: { threadId: msg.threadId, userId },
    select: { id: true },
  })
  if (!participant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const existing = await db.messageReaction.findFirst({
    where: { messageId, userId, emoji },
  })

  if (existing) {
    await db.messageReaction.delete({ where: { id: existing.id } })
    return NextResponse.json({ toggled: "off" })
  }

  await db.messageReaction.create({
    data: {
      messageId,
      userId,
      emoji,
    },
  })
  return NextResponse.json({ toggled: "on" })
}
