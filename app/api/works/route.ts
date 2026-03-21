import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canManageSongs, getUserPermissions } from "@/lib/permissions"
import type { Prisma, WorkCompositionStatus } from "@prisma/client"
import { createWorkForSong } from "@/lib/work-helpers"
import { z } from "zod"

export const dynamic = "force-dynamic"

const createWorkSchema = z.object({
  title: z.string().min(1),
  iswcCode: z.string().optional().nullable(),
})

/** List works (admins: all; collaborators: works linked to recordings they’re on). */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canManage = await canManageSongs(session)
    const permissions = await getUserPermissions(session)
    if (!permissions) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const q = request.nextUrl.searchParams.get("q")?.trim()
    const limitRaw = request.nextUrl.searchParams.get("limit")
    const compositionStatusParam = request.nextUrl.searchParams.get("compositionStatus")?.trim()
    const limit = Math.min(
      500,
      Math.max(1, limitRaw ? parseInt(limitRaw, 10) || 200 : 200)
    )

    const where: Prisma.WorkWhereInput = {}
    if (q) {
      where.title = { contains: q, mode: "insensitive" }
    }
    if (compositionStatusParam === "in_progress" || compositionStatusParam === "finalized") {
      where.compositionStatus = compositionStatusParam as WorkCompositionStatus
    }

    if (!canManage) {
      if (!permissions.collaboratorId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const linked = await db.song.findMany({
        where: {
          workId: { not: null },
          songCollaborators: {
            some: { collaboratorId: permissions.collaboratorId },
          },
        },
        select: { workId: true },
      })
      const workIds = [...new Set(linked.map((s) => s.workId).filter(Boolean))] as string[]
      if (workIds.length === 0) {
        return NextResponse.json([])
      }
      where.id = { in: workIds }
    }

    const works = await db.work.findMany({
      where,
      select: {
        id: true,
        title: true,
        iswcCode: true,
        compositionStatus: true,
        labelPublishingShare: true,
        createdAt: true,
        _count: { select: { songs: true } },
        songs: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { id: true },
        },
      },
      orderBy: { title: "asc" },
      take: limit,
    })

    const payload = works.map(({ songs, ...rest }) => ({
      ...rest,
      primarySongId: songs[0]?.id ?? null,
    }))

    return NextResponse.json(payload)
  } catch (error) {
    console.error("Error fetching works:", error)
    return NextResponse.json({ error: "Failed to fetch works" }, { status: 500 })
  }
}

/** Create a standalone Work (optional). Admins only. */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canManage = await canManageSongs(session)
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validated = createWorkSchema.parse(body)

    const work = await db.$transaction((tx) =>
      createWorkForSong(tx, validated.title, validated.iswcCode)
    )

    return NextResponse.json(work, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating work:", error)
    return NextResponse.json({ error: "Failed to create work" }, { status: 500 })
  }
}
