import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"
import { createMetaImageAdFromDraft } from "@/lib/meta-ads"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; adId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userIsAdmin = await isAdmin(session)
  if (!userIsAdmin) {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
  }

  const songId = params.id
  const adId = params.adId

  const draft = await db.adDraft.findFirst({
    where: { id: adId, songId },
  })

  if (!draft) {
    return NextResponse.json({ error: "Ad draft not found" }, { status: 404 })
  }

  if (draft.format !== "image") {
    return NextResponse.json(
      { error: "Meta publishing is currently supported only for image ads." },
      { status: 400 }
    )
  }

  if (!draft.imageMediaId) {
    return NextResponse.json(
      { error: "Select an image for this ad before publishing to Meta." },
      { status: 400 }
    )
  }

  if (!draft.destinationUrl) {
    return NextResponse.json(
      { error: "Destination URL is required before publishing to Meta." },
      { status: 400 }
    )
  }

  try {
    const imagePath = `/api/media/${draft.imageMediaId}/file`

    const result = await createMetaImageAdFromDraft({
      name: draft.name,
      headline: draft.headline,
      primaryText: draft.primaryText,
      destinationUrl: draft.destinationUrl,
      imageUrl: imagePath,
      callToActionLabel: draft.callToAction,
    })

    const updated = await db.adDraft.update({
      where: { id: adId },
      data: {
        status: "ready",
      },
    })

    return NextResponse.json({
      draft: updated,
      meta: result,
    })
  } catch (error: any) {
    console.error("Error publishing ad draft to Meta:", error)
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to publish ad to Meta. Check Meta credentials and configuration.",
      },
      { status: 500 }
    )
  }
}

