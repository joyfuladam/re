import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"
import { z } from "zod"

const publishingEntitySchema = z.object({
  name: z.string().min(1),
  isInternal: z.boolean().default(false),
  contactName: z.string().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  proAffiliation: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const publishingEntities = await db.publishingEntity.findMany({
      orderBy: [
        { isInternal: "desc" }, // Internal entities first
        { name: "asc" },
      ],
    })

    return NextResponse.json(publishingEntities)
  } catch (error) {
    console.error("Error fetching publishing entities:", error)
    return NextResponse.json(
      { error: "Failed to fetch publishing entities" },
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

    // Only admins can create publishing entities
    const userIsAdmin = await isAdmin(session)
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can create publishing entities" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = publishingEntitySchema.parse(body)

    const publishingEntity = await db.publishingEntity.create({
      data: {
        name: validated.name,
        isInternal: validated.isInternal,
        contactName: validated.contactName || null,
        contactEmail: validated.contactEmail || null,
        contactPhone: validated.contactPhone || null,
        address: validated.address || null,
        proAffiliation: validated.proAffiliation || null,
        notes: validated.notes || null,
      },
    })

    return NextResponse.json(publishingEntity, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating publishing entity:", error)
    return NextResponse.json(
      { error: "Failed to create publishing entity" },
      { status: 500 }
    )
  }
}




