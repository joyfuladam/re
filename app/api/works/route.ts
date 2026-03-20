import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canManageSongs } from "@/lib/permissions"
import { createWorkForSong } from "@/lib/work-helpers"
import { z } from "zod"

export const dynamic = "force-dynamic"

const createWorkSchema = z.object({
  title: z.string().min(1),
  iswcCode: z.string().optional().nullable(),
})

/** List works (for linking recordings). Admins only. */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canManage = await canManageSongs(session)
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const q = request.nextUrl.searchParams.get("q")?.trim()
    const where = q
      ? { title: { contains: q, mode: "insensitive" as const } }
      : {}

    const works = await db.work.findMany({
      where,
      select: {
        id: true,
        title: true,
        iswcCode: true,
        createdAt: true,
      },
      orderBy: { title: "asc" },
      take: 200,
    })

    return NextResponse.json(works)
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
