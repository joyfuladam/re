import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"
import { MessageThreadType } from "@prisma/client"
import { z } from "zod"

function peerDisplayName(u: {
  firstName: string
  lastName: string
  email: string | null
}) {
  const n = `${u.firstName} ${u.lastName}`.trim()
  return n || u.email || "Unknown"
}

const createThreadSchema = z.object({
  subject: z.string().min(1).max(500),
  participantIds: z.array(z.string().min(1)).min(1),
  songId: z.string().optional().nullable(),
  workId: z.string().optional().nullable(),
  threadType: z.nativeEnum(MessageThreadType),
})

// List message threads for the current user
export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  const participants = await db.messageParticipant.findMany({
    where: { userId },
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
            orderBy: { createdAt: "desc" },
            take: 1,
            where: { deletedAt: null },
            include: {
              sender: {
                select: { id: true, firstName: true, lastName: true, email: true, image: true },
              },
            },
          },
        },
      },
    },
    orderBy: {
      thread: {
        updatedAt: "desc",
      },
    },
  })

  const threads = await Promise.all(
    participants
      .filter((p) => p.thread)
      .map(async (p) => {
        const thread = p.thread!
        const lastMessage = thread.messages[0]

        const unreadCount = await db.message.count({
          where: {
            threadId: thread.id,
            deletedAt: null,
            ...(p.lastReadAt
              ? {
                  createdAt: {
                    gt: p.lastReadAt,
                  },
                }
              : {}),
          },
        })

        let directPeerName: string | null = null
        if (thread.threadType === MessageThreadType.direct) {
          const other = thread.participants.find((part) => part.userId !== userId)
          if (other?.user) {
            directPeerName = peerDisplayName(other.user)
          }
        }

        return {
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
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                createdAt: lastMessage.createdAt,
                sender: lastMessage.sender,
                preview: (lastMessage.bodyText || lastMessage.bodyHtml || "").slice(0, 200),
              }
            : null,
          updatedAt: thread.updatedAt,
          unreadCount,
        }
      })
  )

  return NextResponse.json(threads)
}

/** Create a new thread (DM, group, song-scoped, org-wide, etc.) */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const body = await request.json().catch(() => null)
  const parsed = createThreadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
  }

  const { subject, participantIds, songId, workId, threadType } = parsed.data

  if (threadType === MessageThreadType.org_wide) {
    const allowed = await isAdmin(session)
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden: only admins can create org-wide channels" }, { status: 403 })
    }
  }

  if (threadType === MessageThreadType.song_scoped && !songId) {
    return NextResponse.json({ error: "songId is required for song_scoped threads" }, { status: 400 })
  }

  if (threadType === MessageThreadType.work_collab && !workId) {
    return NextResponse.json({ error: "workId is required for work_collab threads" }, { status: 400 })
  }

  if (threadType === MessageThreadType.direct && participantIds.length !== 1) {
    return NextResponse.json(
      { error: "Direct messages must include exactly one other participant" },
      { status: 400 }
    )
  }

  const uniqueOthers = [...new Set(participantIds)].filter((id) => id !== userId)
  if (uniqueOthers.length === 0) {
    return NextResponse.json({ error: "Select at least one other participant" }, { status: 400 })
  }

  const allIds = [userId, ...uniqueOthers]
  const users = await db.collaborator.findMany({
    where: { id: { in: allIds }, status: "active" },
    select: { id: true },
  })
  if (users.length !== allIds.length) {
    return NextResponse.json({ error: "One or more participants are invalid or inactive" }, { status: 400 })
  }

  if (songId) {
    const song = await db.song.findUnique({ where: { id: songId }, select: { id: true } })
    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 })
    }
  }

  if (workId) {
    const work = await db.work.findUnique({ where: { id: workId }, select: { id: true } })
    if (!work) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 })
    }
  }

  const now = new Date()

  const thread = await db.messageThread.create({
    data: {
      subject: subject.trim(),
      songId: songId || null,
      workId: workId || null,
      threadType,
      createdById: userId,
      participants: {
        createMany: {
          data: allIds.map((id) => ({
            userId: id,
            lastReadAt: id === userId ? now : null,
          })),
        },
      },
    },
  })

  return NextResponse.json({ id: thread.id, threadType: thread.threadType })
}

