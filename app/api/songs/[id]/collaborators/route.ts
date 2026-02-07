import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { decimalToNumber, numberToDecimal } from "@/lib/validators"
import { canAccessSong, isAdmin } from "@/lib/permissions"

const addCollaboratorSchema = z.object({
  collaboratorId: z.string(),
  rolesInSong: z.array(z.enum(["musician", "writer", "producer", "artist", "vocalist", "label"])).min(1), // Accept array of roles
  publishingOwnership: z.number().min(0).max(100).optional().nullable(),
  masterOwnership: z.number().min(0).max(100).optional().nullable(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can add collaborators to songs
    const userIsAdmin = await isAdmin(session)
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can add collaborators to songs" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = addCollaboratorSchema.parse(body)

    // Verify song exists
    const song = await db.song.findUnique({
      where: { id: params.id },
    })

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 })
    }

    // Verify collaborator exists
    const collaborator = await db.collaborator.findUnique({
      where: { id: validated.collaboratorId },
    })

    if (!collaborator) {
      return NextResponse.json(
        { error: "Collaborator not found" },
        { status: 404 }
      )
    }

    // Verify that the collaborator is capable of all requested roles
    // Label is always allowed (system role), but other roles must be in capableRoles
    const invalidRoles = validated.rolesInSong.filter(
      (role) => role !== "label" && !collaborator.capableRoles.includes(role)
    )
    if (invalidRoles.length > 0) {
      return NextResponse.json(
        { error: `This collaborator is not capable of the following roles: ${invalidRoles.join(", ")}. Their capable roles are: ${collaborator.capableRoles.join(", ")}` },
        { status: 400 }
      )
    }

    // Create multiple song collaborator relationships (one per role)
    const songCollaborators = await Promise.all(
      validated.rolesInSong.map((role) =>
        db.songCollaborator.create({
          data: {
            songId: params.id,
            collaboratorId: validated.collaboratorId,
            roleInSong: role,
            publishingOwnership: validated.publishingOwnership
              ? numberToDecimal(validated.publishingOwnership / 100)
              : null,
            masterOwnership: validated.masterOwnership
              ? numberToDecimal(validated.masterOwnership / 100)
              : null,
          },
          include: {
            collaborator: true,
          },
        })
      )
    )

    return NextResponse.json(songCollaborators, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error adding collaborator to song:", error)
    return NextResponse.json(
      { error: "Failed to add collaborator to song" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user can access this song
    const canAccess = await canAccessSong(session, params.id)
    if (!canAccess) {
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this song" },
        { status: 403 }
      )
    }

    const songCollaborators = await db.songCollaborator.findMany({
      where: { songId: params.id },
      include: {
        collaborator: true,
      },
    })

    return NextResponse.json(songCollaborators)
  } catch (error) {
    console.error("Error fetching song collaborators:", error)
    return NextResponse.json(
      { error: "Failed to fetch song collaborators" },
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

    // Only admins can delete collaborators from songs
    const userIsAdmin = await isAdmin(session)
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can remove collaborators from songs" },
        { status: 403 }
      )
    }    // Get songCollaboratorId from query params
    const { searchParams } = new URL(request.url)
    const songCollaboratorId = searchParams.get("songCollaboratorId")

    if (!songCollaboratorId) {
      return NextResponse.json(
        { error: "songCollaboratorId is required" },
        { status: 400 }
      )
    }

    // Verify the song collaborator exists and belongs to this song
    const songCollaborator = await db.songCollaborator.findUnique({
      where: { id: songCollaboratorId },
    })

    if (!songCollaborator) {
      return NextResponse.json(
        { error: "Song collaborator not found" },
        { status: 404 }
      )
    }

    if (songCollaborator.songId !== params.id) {
      return NextResponse.json(
        { error: "Song collaborator does not belong to this song" },
        { status: 400 }
      )
    }

    // Delete the song collaborator
    await db.songCollaborator.delete({
      where: { id: songCollaboratorId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting song collaborator:", error)
    return NextResponse.json(
      { error: "Failed to delete song collaborator" },
      { status: 500 }
    )
  }
}