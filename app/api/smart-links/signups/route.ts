import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userIsAdmin = await isAdmin(session)
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can view smart link signups" },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const search = url.searchParams.get("search")?.trim() || ""
    const smartLinkId = url.searchParams.get("smartLinkId") || null
    const songId = url.searchParams.get("songId") || null

    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10), 1)
    const pageSize = Math.min(
      Math.max(parseInt(url.searchParams.get("pageSize") || "50", 10), 1),
      200
    )
    const skip = (page - 1) * pageSize

    const where: any = {}
    if (smartLinkId) {
      where.smartLinkId = smartLinkId
    }
    if (songId) {
      where.smartLink = { songId }
    }
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ]
    }

    const [total, signups] = await Promise.all([
      db.smartLinkSignup.count({ where }),
      db.smartLinkSignup.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          smartLink: {
            select: {
              id: true,
              slug: true,
              title: true,
              song: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      }),
    ])

    const items = signups.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      createdAt: s.createdAt,
      smartLinkId: s.smartLink.id,
      smartLinkSlug: s.smartLink.slug,
      smartLinkTitle: s.smartLink.title,
      songId: s.smartLink.song?.id ?? null,
      songTitle: s.smartLink.song?.title ?? null,
    }))

    return NextResponse.json({
      total,
      page,
      pageSize,
      items,
    })
  } catch (error) {
    console.error("Error fetching smart link signups:", error)
    return NextResponse.json(
      { error: "Failed to fetch smart link signups" },
      { status: 500 }
    )
  }
}

