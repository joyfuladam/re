import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getUserPermissions, canManageSongs, canAccessSong } from "@/lib/permissions"
import { generateNextCatalogNumber } from "@/lib/catalog-number"
import { z } from "zod"

const songSchema = z.object({
  title: z.string().min(1),
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
  status: z.enum(["draft", "active", "archived"]).default("draft"),
})

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

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")
    const status = searchParams.get("status")

    const where: any = {}
    if (status) where.status = status
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { isrcCode: { contains: search, mode: "insensitive" } },
        { iswcCode: { contains: search, mode: "insensitive" } },
        { catalogNumber: { contains: search, mode: "insensitive" } },
      ]
    }

    // Collaborators can only see songs they're on, admins see all
    if (!permissions.isAdmin && permissions.collaboratorId) {
      where.songCollaborators = {
        some: {
          collaboratorId: permissions.collaboratorId,
        },
      }
    }

    const songs = await db.song.findMany({
      where,
      include: {
        songCollaborators: {
          include: {
            collaborator: true,
          },
        },
      },
      orderBy: { title: "asc" },
    })

    return NextResponse.json(songs)
  } catch (error) {
    console.error("Error fetching songs:", error)
    return NextResponse.json(
      { error: "Failed to fetch songs" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can create songs
    const canManage = await canManageSongs(session)
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can create songs" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = songSchema.parse(body)

    // Auto-generate catalog number if not provided
    let catalogNumber = validated.catalogNumber
    if (!catalogNumber) {
      catalogNumber = await generateNextCatalogNumber()
    }

    const song = await db.song.create({
      data: {
        title: validated.title,
        isrcCode: validated.isrcCode,
        iswcCode: validated.iswcCode,
        catalogNumber: catalogNumber,
        releaseDate: validated.releaseDate ? new Date(validated.releaseDate) : null,
        proWorkRegistrationNumber: validated.proWorkRegistrationNumber,
        publishingAdmin: validated.publishingAdmin,
        masterOwner: validated.masterOwner,
        genre: validated.genre,
        subGenre: validated.subGenre,
        duration: validated.duration,
        recordingDate: validated.recordingDate ? new Date(validated.recordingDate) : null,
        recordingLocation: validated.recordingLocation,
        notes: validated.notes,
        status: validated.status,
      },
    })

    return NextResponse.json(song, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating song:", error)
    return NextResponse.json(
      { error: "Failed to create song" },
      { status: 500 }
    )
  }
}

