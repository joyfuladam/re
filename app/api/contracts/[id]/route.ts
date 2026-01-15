import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canAccessSong } from "@/lib/permissions"
import { z } from "zod"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const contract = await db.contract.findUnique({
      where: {
        id: params.id,
      },
      include: {
        song: true,
        songCollaborator: {
          include: {
            collaborator: true,
          },
        },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 })
    }

    // Check if user can access this song
    const canAccess = await canAccessSong(session, contract.songId)
    if (!canAccess) {
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this contract" },
        { status: 403 }
      )
    }

    // Get contract HTML by regenerating it
    // For now, return contract data - the frontend will handle regeneration
    // TODO: Store generated HTML in database for faster retrieval

    const collaboratorName = [
      contract.songCollaborator.collaborator.firstName,
      contract.songCollaborator.collaborator.middleName,
      contract.songCollaborator.collaborator.lastName,
    ]
      .filter(Boolean)
      .join(" ")

    return NextResponse.json({
      contract: {
        id: contract.id,
        contractType: contract.templateType,
        esignatureStatus: contract.esignatureStatus,
        signedAt: contract.signedAt,
        collaboratorName,
      },
      // Signal that HTML needs to be regenerated
      regenerateHtml: true,
    })
  } catch (error) {
    console.error("Error fetching contract:", error)
    return NextResponse.json(
      { error: "Failed to fetch contract" },
      { status: 500 }
    )
  }
}




