import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canAccessSong } from "@/lib/permissions"
import { MessageThreadType } from "@prisma/client"

export const dynamic = "force-dynamic"

interface Params {
  params: { id: string }
}

/**
 * GET: return existing canonical songwriting thread for this song, or { threadId: null }.
 * POST: ensure the thread exists (create if missing) and return { threadId }.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const songId = params.id
  if (!(await canAccessSong(session, songId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const thread = await db.messageThread.findFirst({
    where: { songId, threadType: MessageThreadType.songwriting },
    select: { id: true },
  })

  return NextResponse.json({ threadId: thread?.id ?? null })
}

export async function POST(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const songId = params.id

  if (!(await canAccessSong(session, songId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const existing = await db.messageThread.findFirst({
    where: { songId, threadType: MessageThreadType.songwriting },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ threadId: existing.id })
  }

  const song = await db.song.findUnique({
    where: { id: songId },
    include: {
      songCollaborators: { select: { collaboratorId: true } },
    },
  })
  if (!song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 })
  }

  const participantIds = [...new Set([userId, ...song.songCollaborators.map((s) => s.collaboratorId)])]
  const now = new Date()

  const thread = await db.messageThread.create({
    data: {
      subject: `Songwriting · ${song.title}`,
      songId,
      threadType: MessageThreadType.songwriting,
      createdById: userId,
      participants: {
        createMany: {
          data: participantIds.map((uid) => ({
            userId: uid,
            lastReadAt: uid === userId ? now : null,
          })),
        },
      },
    },
    select: { id: true },
  })

  return NextResponse.json({ threadId: thread.id })
}
