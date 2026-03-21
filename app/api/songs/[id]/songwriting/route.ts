import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canAccessSong } from "@/lib/permissions"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import {
  MAX_CHORDPRO_LENGTH,
  linesToChordPro,
  serializeSongwritingForDb,
  type LegacyLyricLine,
} from "@/lib/songwriting/chordpro-storage"

export const dynamic = "force-dynamic"

const lineSchema = z.object({
  chords: z.string().optional().nullable(),
  text: z.string(),
})

const patchSchema = z
  .object({
    /** ChordPro source (preferred). */
    chordpro: z.string().max(MAX_CHORDPRO_LENGTH).optional(),
    /** Legacy stacked rows — converted to v2 ChordPro on save. */
    lines: z.array(lineSchema).min(0).optional(),
  })
  .refine((d) => d.chordpro !== undefined || d.lines !== undefined, {
    message: "Provide chordpro or lines",
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

  let json: Prisma.InputJsonValue
  if (parsed.data.chordpro !== undefined) {
    json = serializeSongwritingForDb(parsed.data.chordpro) as unknown as Prisma.InputJsonValue
  } else {
    const legacy: LegacyLyricLine[] = (parsed.data.lines ?? []).map((row) => ({
      chords: row.chords ?? "",
      text: row.text,
    }))
    json = serializeSongwritingForDb(linesToChordPro(legacy)) as unknown as Prisma.InputJsonValue
  }

  await db.song.update({
    where: { id: songId },
    data: { songwritingLyricsJson: json },
  })

  return NextResponse.json({ ok: true })
}
