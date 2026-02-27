import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const smartLink = await db.smartLink.findUnique({
      where: { slug: params.slug },
      include: {
        destinations: {
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    if (!smartLink || !smartLink.isActive) {
      return NextResponse.json(
        { error: "Smart link not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: smartLink.id,
      slug: smartLink.slug,
      title: smartLink.title,
      description: smartLink.description,
      imageUrl: smartLink.imageUrl,
      destinations: smartLink.destinations.map((d) => ({
        id: d.id,
        serviceKey: d.serviceKey,
        label: d.label,
      })),
    })
  } catch (error) {
    console.error("Error loading public smart link:", error)
    return NextResponse.json(
      { error: "Failed to load smart link" },
      { status: 500 }
    )
  }
}

