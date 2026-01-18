import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getUserPermissions } from "@/lib/permissions"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const permissions = await getUserPermissions(session)
    if (!permissions) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Build where clauses based on permissions
    const songWhere: any = {}
    const collaboratorWhere: any = { status: "active" }
    
    // Admins only see active songs, collaborators see all their songs regardless of status
    if (permissions.isAdmin) {
      songWhere.status = "active"
    }
    
    // Collaborators can only see their own songs
    if (!permissions.isAdmin && permissions.collaboratorId) {
      songWhere.songCollaborators = {
        some: {
          collaboratorId: permissions.collaboratorId,
        },
      }
      collaboratorWhere.id = permissions.collaboratorId
    }

    // Build contract where clause based on permissions
    const contractWhere: any = { esignatureStatus: "pending" }
    
    // Collaborators can only see contracts for songs they're involved in
    if (!permissions.isAdmin && permissions.collaboratorId) {
      contractWhere.song = {
        songCollaborators: {
          some: {
            collaboratorId: permissions.collaboratorId,
          },
        },
      }
    }

    const [totalSongs, totalCollaborators, pendingContracts, lockedSongs] = await Promise.all([
      db.song.count({ where: songWhere }),
      db.collaborator.count({ where: collaboratorWhere }),
      db.contract.count({ where: contractWhere }),
      db.song.count({
        where: {
          ...songWhere,
          AND: [{ publishingLocked: true }, { masterLocked: true }],
        },
      }),
    ])

    return NextResponse.json({
      totalSongs,
      totalCollaborators,
      pendingContracts,
      lockedSongs,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    )
  }
}

