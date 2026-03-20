import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canManageSplits } from "@/lib/permissions"
import { numberToDecimal } from "@/lib/validators"
import {
  isPublishingLockedForWork,
  syncWorkPublishingSplitsToAllSongs,
} from "@/lib/work-publishing-sync"
import { z } from "zod"

export const dynamic = "force-dynamic"

const bodySchema = z.object({
  splits: z.array(
    z.object({
      workCollaboratorId: z.string(),
      percentage: z.number().min(0).max(100),
    })
  ),
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

    const canManage = await canManageSplits(session)
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const work = await db.work.findUnique({ where: { id: params.id } })
    if (!work) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 })
    }

    if (await isPublishingLockedForWork(params.id)) {
      return NextResponse.json(
        { error: "Publishing splits are locked and cannot be modified" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validated = bodySchema.parse(body)

    for (const split of validated.splits) {
      const row = await db.workCollaborator.findFirst({
        where: {
          id: split.workCollaboratorId,
          workId: params.id,
        },
      })
      if (!row) {
        return NextResponse.json(
          { error: `Invalid workCollaboratorId: ${split.workCollaboratorId}` },
          { status: 400 }
        )
      }
      await db.workCollaborator.update({
        where: { id: split.workCollaboratorId },
        data: {
          publishingOwnership: numberToDecimal(split.percentage / 100),
        },
      })
    }

    await syncWorkPublishingSplitsToAllSongs(params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating work publishing splits:", error)
    return NextResponse.json(
      { error: "Failed to update publishing splits" },
      { status: 500 }
    )
  }
}
