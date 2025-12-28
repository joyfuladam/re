import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canAccessSong } from "@/lib/permissions"
import { z } from "zod"

const getContractsSchema = z.object({
  songId: z.string(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const songId = searchParams.get("songId")

    if (!songId) {
      return NextResponse.json(
        { error: "songId is required" },
        { status: 400 }
      )
    }

    // Check if user can access this song
    const canAccess = await canAccessSong(session, songId)
    if (!canAccess) {
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this song" },
        { status: 403 }
      )
    }

    // Get all contracts for this song
    const contracts = await db.contract.findMany({
      where: {
        songId,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({
      contracts,
    })
  } catch (error) {
    console.error("Error fetching contracts:", error)
    return NextResponse.json(
      { error: "Failed to fetch contracts" },
      { status: 500 }
    )
  }
}

