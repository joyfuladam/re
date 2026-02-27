import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"
import { z } from "zod"
import { searchTrackByIsrc } from "@/lib/spotify"
import { searchSongByIsrc } from "@/lib/apple-music"

const discoverSchema = z.object({
  songId: z.string().min(1),
  providers: z
    .array(z.enum(["spotify", "apple_music"]))
    .optional()
    .default(["spotify", "apple_music"]),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userIsAdmin = await isAdmin(session)
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can auto-discover streaming links" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = discoverSchema.parse(body)

    const song = await db.song.findUnique({
      where: { id: validated.songId },
      select: { id: true, isrcCode: true, title: true },
    })

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 })
    }

    const isrc = (song.isrcCode || "").trim()
    if (!isrc) {
      return NextResponse.json(
        { error: "Song does not have an ISRC code set. Auto-discovery requires an ISRC." },
        { status: 400 }
      )
    }

    const smartLink = await db.smartLink.findFirst({
      where: { songId: song.id },
      include: { destinations: true },
    })

    if (!smartLink) {
      return NextResponse.json(
        { error: "No smart link exists for this song yet. Create one first, then auto-discover." },
        { status: 400 }
      )
    }

    const results: Record<
      "spotify" | "apple_music",
      { status: "ok" | "not_found" | "error"; message: string; url?: string }
    > = {
      spotify: { status: "not_found", message: "Spotify not requested" },
      apple_music: { status: "not_found", message: "Apple Music not requested" },
    } as any

    // Discover Spotify
    if (validated.providers.includes("spotify")) {
      try {
        const match = await searchTrackByIsrc(isrc)
        if (!match) {
          results.spotify = {
            status: "not_found",
            message: `No Spotify track found for ISRC ${isrc}`,
          }
        } else {
          const existing = smartLink.destinations.find(
            (d) => d.serviceKey === "spotify"
          )
          if (existing) {
            await db.smartLinkDestination.update({
              where: { id: existing.id },
              data: {
                url: match.url,
                label: existing.label || "Spotify",
              },
            })
          } else {
            const order = smartLink.destinations.length
            await db.smartLinkDestination.create({
              data: {
                smartLinkId: smartLink.id,
                serviceKey: "spotify",
                label: "Spotify",
                url: match.url,
                sortOrder: order,
              },
            })
          }
          results.spotify = {
            status: "ok",
            message: "Spotify link discovered",
            url: match.url,
          }
        }
      } catch (error) {
        console.error("Spotify discovery error:", error)
        results.spotify = {
          status: "error",
          message: "Spotify API error during discovery",
        }
      }
    }

    // Discover Apple Music
    if (validated.providers.includes("apple_music")) {
      try {
        const match = await searchSongByIsrc(isrc)
        if (!match) {
          results.apple_music = {
            status: "not_found",
            message: `No Apple Music song found for ISRC ${isrc}`,
          }
        } else {
          const existing = smartLink.destinations.find(
            (d) => d.serviceKey === "apple_music"
          )
          if (existing) {
            await db.smartLinkDestination.update({
              where: { id: existing.id },
              data: {
                url: match.url,
                label: existing.label || "Apple Music",
              },
            })
          } else {
            const order = smartLink.destinations.length
            await db.smartLinkDestination.create({
              data: {
                smartLinkId: smartLink.id,
                serviceKey: "apple_music",
                label: "Apple Music",
                url: match.url,
                sortOrder: order,
              },
            })
          }
          results.apple_music = {
            status: "ok",
            message: "Apple Music link discovered",
            url: match.url,
          }
        }
      } catch (error) {
        console.error("Apple Music discovery error:", error)
        results.apple_music = {
          status: "error",
          message: "Apple Music API error during discovery",
        }
      }
    }

    // Reload the smart link with updated destinations
    const updatedSmartLink = await db.smartLink.findUnique({
      where: { id: smartLink.id },
      include: {
        destinations: {
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    return NextResponse.json({
      smartLink: updatedSmartLink,
      results,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error during smart link discovery:", error)
    return NextResponse.json(
      { error: "Failed to auto-discover streaming links" },
      { status: 500 }
    )
  }
}

