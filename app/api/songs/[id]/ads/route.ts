import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canAccessSong } from "@/lib/permissions"
import { z } from "zod"

const createAdSchema = z.object({
  name: z.string().min(1),
  headline: z.string().min(1),
  primaryText: z.string().min(1),
  callToAction: z.string().optional().nullable(),
  destinationUrl: z.string().url().optional().nullable().or(z.literal("")),
  imageMediaId: z.string().optional().nullable(),
  videoMediaId: z.string().optional().nullable(),
  audioMediaId: z.string().optional().nullable(),
  format: z.enum(["image", "video", "carousel"]),
})

const updateAdSchema = createAdSchema.partial()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const canAccess = await canAccessSong(session, params.id)
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const drafts = await db.adDraft.findMany({
    where: { songId: params.id },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json(drafts)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const canAccess = await canAccessSong(session, params.id)
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const song = await db.song.findUnique({
    where: { id: params.id },
    select: { id: true },
  })
  if (!song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = createAdSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  const draft = await db.adDraft.create({
    data: {
      songId: params.id,
      name: data.name,
      headline: data.headline,
      primaryText: data.primaryText,
      callToAction: data.callToAction || undefined,
      destinationUrl: data.destinationUrl || undefined,
      imageMediaId: data.imageMediaId || undefined,
      videoMediaId: data.videoMediaId || undefined,
      audioMediaId: data.audioMediaId || undefined,
      format: data.format,
    },
  })

  return NextResponse.json(draft)
}
