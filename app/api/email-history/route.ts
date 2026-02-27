import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"

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
  const page = Number(searchParams.get("page") || "1")
  const pageSize = Number(searchParams.get("pageSize") || "20")
  const scope = searchParams.get("scope") || undefined
  const songId = searchParams.get("songId") || undefined
  const q = searchParams.get("q") || undefined

  const take = Math.max(1, Math.min(pageSize, 100))
  const skip = (Math.max(1, page) - 1) * take

  const where: any = {}

  if (scope) {
    where.scope = scope
  }

  if (songId) {
    where.songId = songId
  }

  if (q) {
    where.OR = [
      { subject: { contains: q, mode: "insensitive" } },
      { triggeredByEmail: { contains: q, mode: "insensitive" } },
    ]
  }

  const [items, total] = await Promise.all([
    db.emailLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        template: {
          select: { name: true },
        },
        song: {
          select: { id: true, title: true },
        },
      },
    }),
    db.emailLog.count({ where }),
  ])

  return NextResponse.json({
    items,
    total,
    page,
    pageSize: take,
  })
}

