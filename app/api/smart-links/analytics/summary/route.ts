import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"

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

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userIsAdmin = await isAdmin(session)
  if (!userIsAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const { from, to, range } = resolveRange(searchParams)

  const where: any = {}
  if (from || to) {
    where.createdAt = {}
    if (from) {
      where.createdAt.gte = from
    }
    if (to) {
      where.createdAt.lte = to
    }
  }

  const grouped = await db.smartLinkClick.groupBy({
    by: ["smartLinkId", "serviceKey"],
    where,
    _count: {
      _all: true,
    },
  })

  if (!grouped.length) {
    return NextResponse.json({
      range,
      items: [],
    })
  }

  const smartLinkIds = Array.from(new Set(grouped.map((g) => g.smartLinkId)))

  const smartLinks = await db.smartLink.findMany({
    where: { id: { in: smartLinkIds } },
    include: {
      song: {
        select: { id: true, title: true },
      },
    },
  })

  const smartLinkMap = new Map(
    smartLinks.map((sl) => [
      sl.id,
      {
        id: sl.id,
        slug: sl.slug,
        title: sl.title,
        songId: sl.song?.id ?? null,
        songTitle: sl.song?.title ?? null,
      },
    ])
  )

  const summaries: Array<{
    smartLinkId: string
    slug: string
    title: string
    songId: string | null
    songTitle: string | null
    totalClicks: number
    clicksByService: Record<string, number>
  }> = []

  const bySmartLink: Record<
    string,
    {
      total: number
      byService: Record<string, number>
    }
  > = {}

  for (const row of grouped) {
    if (!bySmartLink[row.smartLinkId]) {
      bySmartLink[row.smartLinkId] = { total: 0, byService: {} }
    }
    bySmartLink[row.smartLinkId].total += row._count._all
    const serviceKey = row.serviceKey
    bySmartLink[row.smartLinkId].byService[serviceKey] =
      (bySmartLink[row.smartLinkId].byService[serviceKey] || 0) + row._count._all
  }

  for (const smartLinkId of Object.keys(bySmartLink)) {
    const meta = smartLinkMap.get(smartLinkId)
    if (!meta) continue
    const agg = bySmartLink[smartLinkId]
    summaries.push({
      smartLinkId,
      slug: meta.slug,
      title: meta.title,
      songId: meta.songId,
      songTitle: meta.songTitle,
      totalClicks: agg.total,
      clicksByService: agg.byService,
    })
  }

  // Order by total clicks desc
  summaries.sort((a, b) => b.totalClicks - a.totalClicks)

  return NextResponse.json({
    range,
    items: summaries,
  })
}

