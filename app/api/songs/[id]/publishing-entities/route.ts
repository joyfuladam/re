import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canManageSplits } from "@/lib/permissions"
import { numberToDecimal } from "@/lib/validators"
import { z } from "zod"

const updateSongPublishingEntitiesSchema = z.object({
  entities: z.array(
    z.object({
      publishingEntityId: z.string(),
      ownershipPercentage: z.number().min(0).max(100),
    })
  ),
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

    const songPublishingEntities = await db.songPublishingEntity.findMany({
      where: { songId: params.id },
      include: {
        publishingEntity: true,
      },
    })

    return NextResponse.json(songPublishingEntities)
  } catch (error) {
    console.error("Error fetching song publishing entities:", error)
    return NextResponse.json(
      { error: "Failed to fetch song publishing entities" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can manage publishing entity splits
    const canManage = await canManageSplits(session)
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can manage publishing entity splits" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = updateSongPublishingEntitiesSchema.parse(body)

    // Validate that publisher's share (entity splits) totals 50% (music industry standard)
    // Writer's share (collaborator splits) must also total 50% separately
    const totalPercentage = validated.entities.reduce((sum, entity) => sum + entity.ownershipPercentage, 0)
    if (Math.abs(totalPercentage - 50) > 0.01) {
      return NextResponse.json(
        { error: "Publisher's share must total exactly 50%", details: `Current total: ${totalPercentage.toFixed(2)}%` },
        { status: 400 }
      )
    }

    // Verify song exists
    const song = await db.song.findUnique({
      where: { id: params.id },
    })

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 })
    }

    if (song.publishingLocked) {
      return NextResponse.json(
        { error: "Publishing splits are locked and cannot be modified" },
        { status: 400 }
      )
    }

    // Delete existing entities for this song
    await db.songPublishingEntity.deleteMany({
      where: { songId: params.id },
    })

    // Create new entities
    if (validated.entities.length > 0) {
      await db.songPublishingEntity.createMany({
        data: validated.entities.map((entity) => ({
          songId: params.id,
          publishingEntityId: entity.publishingEntityId,
          ownershipPercentage: numberToDecimal(entity.ownershipPercentage / 100),
        })),
      })
    }

    // Fetch and return the updated entities
    const updatedEntities = await db.songPublishingEntity.findMany({
      where: { songId: params.id },
      include: {
        publishingEntity: true,
      },
    })

    return NextResponse.json(updatedEntities, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating song publishing entities:", error)
    return NextResponse.json(
      { error: "Failed to update song publishing entities" },
      { status: 500 }
    )
  }
}

