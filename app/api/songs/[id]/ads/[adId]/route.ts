import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"
import { z } from "zod"

const updateAdSchema = z.object({
  name: z.string().min(1).optional(),
  headline: z.string().min(1).optional(),
  primaryText: z.string().min(1).optional(),
  callToAction: z.string().optional().nullable(),
  destinationUrl: z.string().url().optional().nullable().or(z.literal("")),
  imageMediaId: z.string().optional().nullable(),
  videoMediaId: z.string().optional().nullable(),
  audioMediaId: z.string().optional().nullable(),
  format: z.enum(["image", "video", "carousel"]).optional(),
  status: z.enum(["draft", "ready"]).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; adId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userIsAdmin = await isAdmin(session)
  if (!userIsAdmin) {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
  }

  const draft = await db.adDraft.findFirst({
    where: { id: params.adId, songId: params.id },
  })
  if (!draft) {
    return NextResponse.json({ error: "Ad draft not found" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = updateAdSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  const updateData: Record<string, unknown> = { ...data }
  if (data.destinationUrl === "") updateData.destinationUrl = null
  if (data.callToAction === "") updateData.callToAction = null

  const updated = await db.adDraft.update({
    where: { id: params.adId },
    data: updateData,
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; adId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userIsAdmin = await isAdmin(session)
  if (!userIsAdmin) {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
  }

  const draft = await db.adDraft.findFirst({
    where: { id: params.adId, songId: params.id },
  })
  if (!draft) {
    return NextResponse.json({ error: "Ad draft not found" }, { status: 404 })
  }

  await db.adDraft.delete({
    where: { id: params.adId },
  })

  return NextResponse.json({ success: true })
}
