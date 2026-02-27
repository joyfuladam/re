import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"
import { z } from "zod"

const destinationSchema = z.object({
  id: z.string().optional(),
  serviceKey: z.string().min(1),
  label: z.string().min(1),
  url: z.string().url(),
  sortOrder: z.number().int().optional().default(0),
})

const createSmartLinkSchema = z.object({
  songId: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  // Allow relative or absolute URLs for the image (e.g. /api/media/...)
  imageUrl: z.string().min(1).optional().nullable(),
  destinations: z.array(destinationSchema).optional().default([]),
})

const updateSmartLinkSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  // Allow relative or absolute URLs for the image (e.g. /api/media/...)
  imageUrl: z.string().min(1).optional().nullable(),
  isActive: z.boolean().optional(),
  destinations: z.array(destinationSchema).optional(),
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
        { error: "Forbidden: Only admins can create smart links" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = createSmartLinkSchema.parse(body)

    const existingSlug = await db.smartLink.findUnique({
      where: { slug: validated.slug },
      select: { id: true },
    })
    if (existingSlug) {
      return NextResponse.json(
        { error: "Slug already exists. Please choose another." },
        { status: 400 }
      )
    }

    const smartLink = await db.smartLink.create({
      data: {
        songId: validated.songId,
        slug: validated.slug,
        title: validated.title,
        description: validated.description ?? null,
        imageUrl: validated.imageUrl ?? null,
        destinations: {
          create: (validated.destinations || []).map((d) => ({
            serviceKey: d.serviceKey,
            label: d.label,
            url: d.url,
            sortOrder: d.sortOrder ?? 0,
          })),
        },
      },
      include: {
        destinations: {
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    return NextResponse.json(smartLink, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating smart link:", error)
    return NextResponse.json(
      { error: "Failed to create smart link" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userIsAdmin = await isAdmin(session)
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can update smart links" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = updateSmartLinkSchema.parse(body)

    const existing = await db.smartLink.findUnique({
      where: { id: validated.id },
      include: { destinations: true },
    })
    if (!existing) {
      return NextResponse.json({ error: "Smart link not found" }, { status: 404 })
    }

    if (validated.slug && validated.slug !== existing.slug) {
      const slugConflict = await db.smartLink.findUnique({
        where: { slug: validated.slug },
        select: { id: true },
      })
      if (slugConflict && slugConflict.id !== existing.id) {
        return NextResponse.json(
          { error: "Slug already exists. Please choose another." },
          { status: 400 }
        )
      }
    }

    // Update main smart link fields
    const updated = await db.smartLink.update({
      where: { id: validated.id },
      data: {
        slug: validated.slug ?? existing.slug,
        title: validated.title ?? existing.title,
        description:
          validated.description !== undefined
            ? validated.description
            : existing.description,
        imageUrl:
          validated.imageUrl !== undefined ? validated.imageUrl : existing.imageUrl,
        isActive:
          validated.isActive !== undefined ? validated.isActive : existing.isActive,
      },
    })

    // Update destinations if provided
    if (validated.destinations) {
      const keepIds = validated.destinations
        .map((d) => d.id)
        .filter((id): id is string => !!id)

      // Delete removed destinations
      if (existing.destinations.length > 0) {
        const toDelete = existing.destinations
          .filter((d) => !keepIds.includes(d.id))
          .map((d) => d.id)
        if (toDelete.length > 0) {
          await db.smartLinkDestination.deleteMany({
            where: { id: { in: toDelete } },
          })
        }
      }

      // Upsert current list
      for (const dest of validated.destinations) {
        if (dest.id) {
          await db.smartLinkDestination.update({
            where: { id: dest.id },
            data: {
              serviceKey: dest.serviceKey,
              label: dest.label,
              url: dest.url,
              sortOrder: dest.sortOrder ?? 0,
            },
          })
        } else {
          await db.smartLinkDestination.create({
            data: {
              smartLinkId: validated.id,
              serviceKey: dest.serviceKey,
              label: dest.label,
              url: dest.url,
              sortOrder: dest.sortOrder ?? 0,
            },
          })
        }
      }
    }

    const result = await db.smartLink.findUnique({
      where: { id: validated.id },
      include: {
        destinations: {
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating smart link:", error)
    return NextResponse.json(
      { error: "Failed to update smart link" },
      { status: 500 }
    )
  }
}

