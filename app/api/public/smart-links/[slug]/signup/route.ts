import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"

const signupSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().min(1).max(320).email("Invalid email address"),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const parsed = signupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const smartLink = await db.smartLink.findUnique({
      where: { slug: params.slug },
      select: { id: true, isActive: true },
    })

    if (!smartLink || !smartLink.isActive) {
      return NextResponse.json(
        { error: "Smart link not found" },
        { status: 404 }
      )
    }

    const { name, email } = parsed.data

    // For v1, allow multiple signups per email; we may dedupe later if needed.
    await db.smartLinkSignup.create({
      data: {
        smartLinkId: smartLink.id,
        name: name && name.length > 0 ? name : null,
        email,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error creating smart link signup:", error)
    return NextResponse.json(
      { error: "Failed to create signup" },
      { status: 500 }
    )
  }
}

