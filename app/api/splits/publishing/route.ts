import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { validateCombinedPublishingSplits, numberToDecimal } from "@/lib/validators"
import { isPublishingEligible } from "@/lib/roles"
import { canManageSplits } from "@/lib/permissions"
import { z } from "zod"

const updatePublishingSplitsSchema = z.object({
  songId: z.string(),
  splits: z.array(
    z.object({
      songCollaboratorId: z.string(), // Use songCollaboratorId to uniquely identify the role-specific record
      percentage: z.number().min(0).max(100),
    })
  ),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can manage splits
    const canManage = await canManageSplits(session)
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can manage splits" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = updatePublishingSplitsSchema.parse(body)

    // Validate that writer's share (collaborator splits) totals 50% (music industry standard)
    // Note: We don't validate total = 50% here - that's only required when locking
    // This allows users to save individual collaborator shares one at a time

    // Check if publishing is already locked
    const song = await db.song.findUnique({
      where: { id: validated.songId },
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

    // Update splits by songCollaboratorId (each record is unique per song+collaborator+role)
    for (const split of validated.splits) {
      await db.songCollaborator.update({
        where: { id: split.songCollaboratorId },
        data: {
          publishingOwnership: numberToDecimal(split.percentage / 100),
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Validation failed",
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join("; ")
      }, { status: 400 })
    }
    console.error("Error updating publishing splits:", error)
    return NextResponse.json(
      { error: "Failed to update publishing splits" },
      { status: 500 }
    )
  }
}

const lockPublishingSchema = z.object({
  songId: z.string(),
  action: z.enum(["lock", "unlock"]).optional().default("lock"),
})

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can lock splits
    const canManage = await canManageSplits(session)
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can lock splits" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = lockPublishingSchema.parse(body)

    // Get song with collaborators and publishing entities
    const song = await db.song.findUnique({
      where: { id: validated.songId },
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
      },
    })

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 })
    }

    if (validated.action === "unlock") {
      // Unlock publishing splits (also unlock master splits if they're locked)
      await db.song.update({
        where: { id: validated.songId },
        data: {
          publishingLocked: false,
          publishingLockedAt: null,
          masterLocked: false, // Also unlock master splits when publishing is unlocked
          masterLockedAt: null,
        },
      })
      return NextResponse.json({ success: true })
    }

    // Action is "lock"
    if (song.publishingLocked) {
      return NextResponse.json(
        { error: "Publishing splits are already locked" },
        { status: 400 }
      )
    }

    // Validate combined splits (collaborators + entities) before locking
    const collaboratorSplits = song.songCollaborators
      .filter((sc) => isPublishingEligible(sc.roleInSong))
      .map((sc) => ({
        collaboratorId: sc.collaboratorId,
        role: sc.roleInSong,
        percentage: sc.publishingOwnership
          ? parseFloat(sc.publishingOwnership.toString()) * 100
          : 0,
      }))

    const entitySplits = song.songPublishingEntities.map((spe) => ({
      publishingEntityId: spe.publishingEntityId,
      percentage: spe.ownershipPercentage
        ? parseFloat(spe.ownershipPercentage.toString()) * 100
        : 0,
    }))

    const validation = validateCombinedPublishingSplits({
      collaborators: collaboratorSplits,
      entities: entitySplits,
    })

    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Cannot lock: validation failed", details: validation.errors },
        { status: 400 }
      )
    }

    // Lock publishing splits
    await db.song.update({
      where: { id: validated.songId },
      data: {
        publishingLocked: true,
        publishingLockedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Validation failed",
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join("; ")
      }, { status: 400 })
    }
    console.error("Error locking publishing splits:", error)
    return NextResponse.json(
      { error: "Failed to lock publishing splits" },
      { status: 500 }
    )
  }
}

