import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { smartLinkId: string; service: string } }
) {
  try {
    const destination = await db.smartLinkDestination.findFirst({
      where: {
        smartLinkId: params.smartLinkId,
        serviceKey: decodeURIComponent(params.service),
      },
      include: {
        smartLink: true,
      },
    })

    if (!destination || !destination.smartLink.isActive) {
      return NextResponse.json(
        { error: "Destination not found" },
        { status: 404 }
      )
    }

    const userAgent = request.headers.get("user-agent") || undefined
    const referrer =
      request.headers.get("referer") || request.headers.get("referrer") || undefined

    // Insert click log (fire-and-forget, but we still await to ensure it's recorded normally)
    await db.smartLinkClick.create({
      data: {
        smartLinkId: destination.smartLinkId,
        serviceKey: destination.serviceKey,
        userAgent,
        referrer,
      },
    })

    return NextResponse.redirect(destination.url, 302)
  } catch (error) {
    console.error("Error handling smart link redirect:", error)
    return NextResponse.json(
      { error: "Failed to handle redirect" },
      { status: 500 }
    )
  }
}

