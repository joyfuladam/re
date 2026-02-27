import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"
import { filterHumanClicks } from "@/lib/smart-link-click-filter"

function resolveRange(searchParams: URLSearchParams): { from?: Date; to?: Date; range: string } {
  const range = searchParams.get("range") || "30d"
  const now = new Date()

  if (range === "all") {
    return { range, to: now }
  }

  const daysMatch = range.match(/^(\d+)d$/)
  const days = daysMatch ? parseInt(daysMatch[1], 10) : 30
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return { from, to: now, range: `${days}d` }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { smartLinkId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userIsAdmin = await isAdmin(session)
  if (!userIsAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const smartLink = await db.smartLink.findUnique({
    where: { id: params.smartLinkId },
    include: {
      song: {
        select: { id: true, title: true },
      },
    },
  })

  if (!smartLink) {
    return NextResponse.json({ error: "Smart link not found" }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const { from, to, range } = resolveRange(searchParams)
  const humanOnly = searchParams.get("humanOnly") !== "false"

  const where: any = {
    smartLinkId: params.smartLinkId,
  }
  if (from || to) {
    where.createdAt = {}
    if (from) {
      where.createdAt.gte = from
    }
    if (to) {
      where.createdAt.lte = to
    }
  }

  const rawClicks = await db.smartLinkClick.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      smartLinkId: true,
      serviceKey: true,
      createdAt: true,
      userAgent: true,
      referrer: true,
    },
  })

  const clicks = humanOnly ? filterHumanClicks(rawClicks) : rawClicks

  const totalClicks = clicks.length
  const clicksByService: Record<string, number> = {}
  const clicksByDateMap: Record<string, number> = {}

  for (const click of clicks) {
    const service = click.serviceKey
    clicksByService[service] = (clicksByService[service] || 0) + 1

    const dateKey = click.createdAt.toISOString().slice(0, 10)
    clicksByDateMap[dateKey] = (clicksByDateMap[dateKey] || 0) + 1
  }

  const clicksByDate = Object.entries(clicksByDateMap)
    .map(([date, count]) => ({ date, total: count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  const recentClicks = clicks.slice(-50).reverse().map((c) => ({
    createdAt: c.createdAt,
    serviceKey: c.serviceKey,
    referrer: c.referrer,
  }))

  return NextResponse.json({
    range,
    humanOnly,
    smartLink: {
      id: smartLink.id,
      slug: smartLink.slug,
      title: smartLink.title,
      songId: smartLink.song?.id ?? null,
      songTitle: smartLink.song?.title ?? null,
    },
    totalClicks,
    clicksByService,
    clicksByDate,
    recentClicks,
  })
}

