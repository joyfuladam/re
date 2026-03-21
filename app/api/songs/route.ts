import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getUserPermissions, canManageSongs, canAccessSong } from "@/lib/permissions"
import { generateNextCatalogNumber } from "@/lib/catalog-number"
import { createWorkForSong } from "@/lib/work-helpers"
import { z } from "zod"

export const dynamic = 'force-dynamic'

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
  /** Link to an existing composition; if omitted, a new Work is created from the recording title. */
  workId: z.string().optional().nullable(),
  /**
   * When true (e.g. from songwriting flow), creates a new composition (Work) in progress
   * and must not link to an existing work.
   */
  songwritingIntent: z.boolean().optional(),
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
        work: {
          select: {
            id: true,
            title: true,
            iswcCode: true,
            compositionStatus: true,
          },
        },
      },
      orderBy: { title: "asc" },
    })

    console.log(`[API] Returning ${songs.length} songs`)
    if (songs.length > 0) {
      console.log(`[API] First song: ${songs[0].title} (${songs[0].id})`)
    }

    return NextResponse.json(songs)
  } catch (error) {
    console.error("Error fetching songs:", error)
    console.error("Error details:", error instanceof Error ? error.stack : error)
    return NextResponse.json(
      { error: "Failed to fetch songs", details: error instanceof Error ? error.message : String(error) },
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

    if (validated.songwritingIntent && validated.workId) {
      return NextResponse.json(
        { error: "Songwriting flow creates a new composition; omit workId or set songwritingIntent to false." },
        { status: 400 }
      )
    }

    // Auto-generate catalog number if not provided
    let catalogNumber = validated.catalogNumber
    if (!catalogNumber) {
      catalogNumber = await generateNextCatalogNumber()
    }

    const song = await db.$transaction(async (tx) => {
      let workId: string | null = validated.workId ?? null
      if (workId) {
        const w = await tx.work.findUnique({ where: { id: workId } })
        if (!w) {
          throw new Error("WORK_NOT_FOUND")
        }
      } else {
        const work = await createWorkForSong(tx, validated.title, validated.iswcCode, {
          compositionStatus: "in_progress",
        })
        workId = work.id
      }

      return tx.song.create({
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
          workId,
        },
        include: {
          work: {
            select: {
              id: true,
              title: true,
              iswcCode: true,
              compositionStatus: true,
            },
          },
        },
      })
    })

    return NextResponse.json(song, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    if (error instanceof Error && error.message === "WORK_NOT_FOUND") {
      return NextResponse.json({ error: "Work not found" }, { status: 404 })
    }
    console.error("Error creating song:", error)
    return NextResponse.json(
      { error: "Failed to create song" },
      { status: 500 }
    )
  }
}

