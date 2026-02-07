import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { numberToDecimal, validateMasterSplits } from "@/lib/validators"
import { isMasterEligible } from "@/lib/roles"
import { canManageSplits } from "@/lib/permissions"
import { z } from "zod"

const updateMasterSplitsSchema = z.object({
  songId: z.string(),
  splits: z.array(
    z.object({
      songCollaboratorId: z.string(), // Use songCollaboratorId to uniquely identify the role-specific record
      percentage: z.number().min(0).max(100),
    })
  ),
  labelMasterShare: z.number().min(0).max(100).optional(), // Optional label share for validation
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
    const validated = updateMasterSplitsSchema.parse(body)

    // Check if publishing is locked and master is not locked
    const song = await db.song.findUnique({
      where: { id: validated.songId },
      include: {
        songCollaborators: {
          include: {
            collaborator: true,
          },
        },
      },
    })

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 })
    }

    if (!song.publishingLocked) {
      return NextResponse.json(
        { error: "Publishing splits must be locked before master splits can be set" },
        { status: 400 }
      )
    }

    if (song.masterLocked) {
      return NextResponse.json(
        { error: "Master splits are locked and cannot be modified" },
        { status: 400 }
      )
    }

    // Validate splits - need to fetch roles for validation
    const splitsWithRoles = validated.splits.map((split) => {
      const songCollaborator = song.songCollaborators.find((sc) => sc.id === split.songCollaboratorId)
      if (!songCollaborator) {
        throw new Error(`SongCollaborator with id ${split.songCollaboratorId} not found`)
      }
      return {
        songCollaboratorId: split.songCollaboratorId,
        collaboratorId: songCollaborator.collaboratorId,
        role: songCollaborator.roleInSong,
        percentage: split.percentage,
      }
    })

    // Validate splits with role information
    // Allow partial since label share is handled separately and will be included in total validation
    const validation = validateMasterSplits(splitsWithRoles, true)
    if (!validation.isValid) {
      // Filter out INVALID_TOTAL errors since we'll check combined total with label share separately
      const nonTotalErrors = validation.errors.filter(e => e.code !== 'INVALID_TOTAL')
      if (nonTotalErrors.length > 0) {
        console.error("Master split validation errors:", nonTotalErrors)
        return NextResponse.json(
          { 
            error: "Validation failed", 
            details: nonTotalErrors.map(e => e.message).join("; ")
          },
          { status: 400 }
        )
      }
    }

    // Check combined total (collaborators + label share) must equal 100%
    const collaboratorTotal = validated.splits.reduce((sum, split) => sum + split.percentage, 0)
    // Use label share from request if provided, otherwise use from database
    const labelShare = validated.labelMasterShare !== undefined
      ? validated.labelMasterShare
      : (song.labelMasterShare ? parseFloat(song.labelMasterShare.toString()) * 100 : 0)
    const total = collaboratorTotal + labelShare
    
    if (Math.abs(total - 100) > 0.01) {
      return NextResponse.json(
        { 
          error: "Master splits must total exactly 100%", 
          details: `Current total: ${total.toFixed(2)}% (Collaborators: ${collaboratorTotal.toFixed(2)}%, Label: ${labelShare.toFixed(2)}%)` 
        },
        { status: 400 }
      )
    }

    // Update splits by songCollaboratorId (each record is unique per song+collaborator+role)
    for (const split of validated.splits) {
      await db.songCollaborator.update({
        where: { id: split.songCollaboratorId },
        data: {
          masterOwnership: numberToDecimal(split.percentage / 100),
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
    console.error("Error updating master splits:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { 
        error: "Failed to update master splits",
        details: errorMessage 
      },
      { status: 500 }
    )
  }
}

const lockMasterSchema = z.object({
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
    const validated = lockMasterSchema.parse(body)

    // Get song with collaborators
    const song = await db.song.findUnique({
      where: { id: validated.songId },
      include: {
        songCollaborators: {
          include: {
            collaborator: true,
          },
        },
      },
    })

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 })
    }

    if (validated.action === "unlock") {
      // Unlock master splits
      await db.song.update({
        where: { id: validated.songId },
        data: {
          masterLocked: false,
          masterLockedAt: null,
        },
      })
      return NextResponse.json({ success: true })
    }

    // Action is "lock"
    if (!song.publishingLocked) {
      return NextResponse.json(
        { error: "Publishing splits must be locked first" },
        { status: 400 }
      )
    }

    if (song.masterLocked) {
      return NextResponse.json(
        { error: "Master splits are already locked" },
        { status: 400 }
      )
    }

    // Validate splits before locking - check total is 100%
    // Include both collaborator splits and label share
    const collaboratorSplits = song.songCollaborators
      .filter((sc) => isMasterEligible(sc.roleInSong) && sc.roleInSong !== "label")
      .map((sc) => ({
        percentage: sc.masterOwnership
          ? parseFloat(sc.masterOwnership.toString()) * 100
          : 0,
      }))

    const labelShare = song.labelMasterShare
      ? parseFloat(song.labelMasterShare.toString()) * 100
      : 0

    const totalPercentage = collaboratorSplits.reduce((sum, split) => sum + split.percentage, 0) + labelShare
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return NextResponse.json(
        { error: "Cannot lock: Master splits must total exactly 100%", details: `Current total: ${totalPercentage.toFixed(2)}% (Collaborators: ${collaboratorSplits.reduce((sum, split) => sum + split.percentage, 0).toFixed(2)}%, Label: ${labelShare.toFixed(2)}%)` },
        { status: 400 }
      )
    }

    // Lock master splits
    await db.song.update({
      where: { id: validated.songId },
      data: {
        masterLocked: true,
        masterLockedAt: new Date(),
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
    console.error("Error locking master splits:", error)
    return NextResponse.json(
      { error: "Failed to lock master splits" },
      { status: 500 }
    )
  }
}

