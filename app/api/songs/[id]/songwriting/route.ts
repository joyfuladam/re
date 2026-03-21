import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canAccessSong } from "@/lib/permissions"
import { Prisma } from "@prisma/client"
import { z } from "zod"

export const dynamic = "force-dynamic"

const lineSchema = z.object({
  chords: z.string().optional().nullable(),
  text: z.string(),
})

const patchSchema = z.object({
  /** Stacked lines: chords above lyrics per row */
  lines: z.array(lineSchema).min(0),
})

interface Params {
  params: { id: string }
}

/** Save collaborative lyrics + chord lines (JSON on Song). */
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const songId = params.id
  if (!(await canAccessSong(session, songId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 })
  }

  const { lines } = parsed.data
  await db.song.update({
    where: { id: songId },
    data: { songwritingLyricsJson: lines as Prisma.InputJsonValue },
  })

  return NextResponse.json({ ok: true })
}
