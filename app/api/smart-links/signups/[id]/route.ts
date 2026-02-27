import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"
import { z } from "zod"

const updateSignupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name cannot be empty")
      .max(200, "Name is too long")
      .optional()
      .nullable(),
    email: z
      .string()
      .trim()
      .email("Invalid email address")
      .optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.email !== undefined,
    "At least one of name or email must be provided"
  )

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userIsAdmin = await isAdmin(session)
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can edit smart link signups" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = updateSignupSchema.parse(body)

    const data: Record<string, any> = {}
    if ("name" in validated) {
      data.name = validated.name ?? null
    }
    if ("email" in validated) {
      data.email = validated.email
    }

    const updated = await db.smartLinkSignup.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      createdAt: updated.createdAt,
      smartLinkId: updated.smartLinkId,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating smart link signup:", error)
    return NextResponse.json(
      { error: "Failed to update smart link signup" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userIsAdmin = await isAdmin(session)
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can delete smart link signups" },
        { status: 403 }
      )
    }

    await db.smartLinkSignup.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting smart link signup:", error)
    return NextResponse.json(
      { error: "Failed to delete smart link signup" },
      { status: 500 }
    )
  }
}

