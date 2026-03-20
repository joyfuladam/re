import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canAccessSong, canManageSongs } from "@/lib/permissions"
import { createWorkForSong } from "@/lib/work-helpers"
import { z } from "zod"

const songUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  isrcCode: z.string().optional().nullable(),
  iswcCode: z.string().optional().nullable(),
  catalogNumber: z.string().optional().nullable(),
  releaseDate: z.string().datetime().optional().nullable(),
  proWorkRegistrationNumber: z.string().optional().nullable(),
  publishingAdmin: z.string().optional().nullable(),
  masterOwner: z.string().optional().nullable(),
  genre: z.string().optional().nullable(),
  subGenre: z.string().optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
  recordingDate: z.string().datetime().optional().nullable(),
  recordingLocation: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  promoMaterialsFolderId: z.string().optional().nullable(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  /** Link to a composition; use `"__create__"` to create a new Work from the song title; `null` unlinks. */
  workId: z.union([z.string().cuid(), z.literal("__create__"), z.null()]).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canAccess = await canAccessSong(session, params.id)
    if (!canAccess) {
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this song" },
        { status: 403 }
      )
    }

    const song = await db.song.findUnique({
      where: { id: params.id },
      include: {
        songCollaborators: {
          include: {
            collaborator: true,
          },
        },
        songPublishingEntities: {
          include: {
            publishingEntity: true,
          },
        },
        media: true,
        work: {
          select: {
            id: true,
            title: true,
            iswcCode: true,
          },
        },
      },
    })

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 })
    }

    return NextResponse.json(song)
  } catch (error: unknown) {
    console.error("Error fetching song:", error)
    return NextResponse.json(
      { error: "Failed to fetch song" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can update songs
    const canManage = await canManageSongs(session)
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can update songs" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = songUpdateSchema.parse(body)

    // Remove catalogNumber from update - it's permanent and cannot be changed
    const { catalogNumber, workId, ...rest } = validated

    // Build update data with proper Date conversions
    const updateData: any = { ...rest }
    if (validated.releaseDate) {
      updateData.releaseDate = new Date(validated.releaseDate)
    }
    if (validated.recordingDate) {
      updateData.recordingDate = new Date(validated.recordingDate)
    }

    if (workId !== undefined) {
      if (workId === null) {
        updateData.workId = null
      } else if (workId === "__create__") {
        const existing = await db.song.findUnique({
          where: { id: params.id },
          select: { title: true, iswcCode: true },
        })
        if (!existing) {
          return NextResponse.json({ error: "Song not found" }, { status: 404 })
        }
        const titleForWork = validated.title ?? existing.title
        const w = await createWorkForSong(db, titleForWork, validated.iswcCode ?? existing.iswcCode)
        updateData.workId = w.id
      } else {
        const w = await db.work.findUnique({ where: { id: workId } })
        if (!w) {
          return NextResponse.json({ error: "Work not found" }, { status: 404 })
        }
        updateData.workId = workId
      }
    }

    const song = await db.song.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(song)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating song:", error)
    return NextResponse.json(
      { error: "Failed to update song" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can delete songs
    const canManage = await canManageSongs(session)
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can delete songs" },
        { status: 403 }
      )
    }

    await db.song.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting song:", error)
    return NextResponse.json(
      { error: "Failed to delete song" },
      { status: 500 }
    )
  }
}

