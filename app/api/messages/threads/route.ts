import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

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
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              sender: {
                select: { id: true, firstName: true, lastName: true, email: true },
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
            ...(p.lastReadAt
              ? {
                  createdAt: {
                    gt: p.lastReadAt,
                  },
                }
              : {}),
          },
        })

        return {
          id: thread.id,
          subject: thread.subject,
          song: thread.song
            ? {
                id: thread.song.id,
                title: thread.song.title,
              }
            : null,
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

