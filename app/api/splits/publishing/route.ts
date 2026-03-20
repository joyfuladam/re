import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { validateCombinedPublishingSplits, numberToDecimal } from "@/lib/validators"
import { canManageSplits } from "@/lib/permissions"
import {
  getPublishingValidationData,
  isPublishingLockedForSong,
  mirrorSongPublishingSplitsToWork,
} from "@/lib/work-publishing-sync"
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

    const locked = await isPublishingLockedForSong(validated.songId)
    if (locked) {
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

    await mirrorSongPublishingSplitsToWork(validated.songId)

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
      if (song.workId) {
        await db.work.update({
          where: { id: song.workId },
          data: {
            publishingLocked: false,
            publishingLockedAt: null,
          },
        })
        await db.song.updateMany({
          where: { workId: song.workId },
          data: {
            publishingLocked: false,
            publishingLockedAt: null,
            masterLocked: false,
            masterLockedAt: null,
          },
        })
      } else {
        await db.song.update({
          where: { id: validated.songId },
          data: {
            publishingLocked: false,
            publishingLockedAt: null,
            masterLocked: false,
            masterLockedAt: null,
          },
        })
      }
      return NextResponse.json({ success: true })
    }

    // Action is "lock"
    const alreadyLocked = await isPublishingLockedForSong(validated.songId)
    if (alreadyLocked) {
      return NextResponse.json(
        { error: "Publishing splits are already locked" },
        { status: 400 }
      )
    }

    const splitData = await getPublishingValidationData(validated.songId)
    if (!splitData) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 })
    }

    const validation = validateCombinedPublishingSplits({
      collaborators: splitData.collaboratorSplits,
      entities: splitData.entitySplits,
    })

    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Cannot lock: validation failed", details: validation.errors },
        { status: 400 }
      )
    }

    const now = new Date()
    if (song.workId) {
      await db.work.update({
        where: { id: song.workId },
        data: {
          publishingLocked: true,
          publishingLockedAt: now,
        },
      })
      await db.song.updateMany({
        where: { workId: song.workId },
        data: {
          publishingLocked: true,
          publishingLockedAt: now,
        },
      })
    } else {
      await db.song.update({
        where: { id: validated.songId },
        data: {
          publishingLocked: true,
          publishingLockedAt: now,
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
    console.error("Error locking publishing splits:", error)
    return NextResponse.json(
      { error: "Failed to lock publishing splits" },
      { status: 500 }
    )
  }
}

