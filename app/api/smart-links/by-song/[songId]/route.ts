import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"

export async function GET(
  request: NextRequest,
  { params }: { params: { songId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userIsAdmin = await isAdmin(session)
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can view smart links" },
        { status: 403 }
      )
    }

    const smartLink = await db.smartLink.findFirst({
      where: { songId: params.songId },
      include: {
        destinations: {
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    if (!smartLink) {
      return NextResponse.json(null)
    }

    // Aggregate simple click stats by service
    const clicks = await db.smartLinkClick.groupBy({
      by: ["serviceKey"],
      where: { smartLinkId: smartLink.id },
      _count: {
        _all: true,
      },
    })

    const clickStats: Record<string, number> = {}
    clicks.forEach((c) => {
      clickStats[c.serviceKey] = c._count._all
    })

    return NextResponse.json({
      ...smartLink,
      clickStats,
    })
  } catch (error) {
    console.error("Error fetching smart link by song:", error)
    return NextResponse.json(
      { error: "Failed to fetch smart link" },
      { status: 500 }
    )
  }
}

