import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canManageSplits } from "@/lib/permissions"
import { numberToDecimal } from "@/lib/validators"
import { z } from "zod"

const updateLabelShareSchema = z.object({
  labelMasterShare: z.number().min(0).max(100),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can manage label share
    const canManage = await canManageSplits(session)
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can manage label share" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = updateLabelShareSchema.parse(body)

    // Verify song exists
    const song = await db.song.findUnique({
      where: { id: params.id },
    })

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 })
    }

    if (song.masterLocked) {
      return NextResponse.json(
        { error: "Master splits are locked and cannot be modified" },
        { status: 400 }
      )
    }

    // Update label master share on song
    await db.song.update({
      where: { id: params.id },
      data: {
        labelMasterShare: numberToDecimal(validated.labelMasterShare / 100),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating label share:", error)
    return NextResponse.json(
      { error: "Failed to update label share" },
      { status: 500 }
    )
  }
}


