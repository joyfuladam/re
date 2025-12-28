import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"
import { z } from "zod"

const publishingEntityUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  isInternal: z.boolean().optional(),
  contactName: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  proAffiliation: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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

    const publishingEntity = await db.publishingEntity.findUnique({
      where: { id: params.id },
    })

    if (!publishingEntity) {
      return NextResponse.json(
        { error: "Publishing entity not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(publishingEntity)
  } catch (error) {
    console.error("Error fetching publishing entity:", error)
    return NextResponse.json(
      { error: "Failed to fetch publishing entity" },
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

    // Only admins can update publishing entities
    const userIsAdmin = await isAdmin(session)
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can update publishing entities" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = publishingEntityUpdateSchema.parse(body)

    const publishingEntity = await db.publishingEntity.update({
      where: { id: params.id },
      data: {
        ...validated,
      },
    })

    return NextResponse.json(publishingEntity)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating publishing entity:", error)
    return NextResponse.json(
      { error: "Failed to update publishing entity" },
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

    // Only admins can delete publishing entities
    const userIsAdmin = await isAdmin(session)
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can delete publishing entities" },
        { status: 403 }
      )
    }

    // Check if entity is used in any songs
    const songsWithEntity = await db.songPublishingEntity.findFirst({
      where: { publishingEntityId: params.id },
    })

    if (songsWithEntity) {
      return NextResponse.json(
        { error: "Cannot delete publishing entity that is assigned to songs. Remove it from all songs first." },
        { status: 400 }
      )
    }

    await db.publishingEntity.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting publishing entity:", error)
    return NextResponse.json(
      { error: "Failed to delete publishing entity" },
      { status: 500 }
    )
  }
}

