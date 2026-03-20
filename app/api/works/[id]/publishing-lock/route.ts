import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canManageSplits } from "@/lib/permissions"
import { validateCombinedPublishingSplits } from "@/lib/validators"
import {
  getPublishingValidationDataByWorkId,
  isPublishingLockedForWork,
} from "@/lib/work-publishing-sync"
import { z } from "zod"

export const dynamic = "force-dynamic"

const bodySchema = z.object({
  action: z.enum(["lock", "unlock"]).optional().default("lock"),
})

export async function PATCH(
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

    const body = await request.json()
    const validated = bodySchema.parse(body)

    if (validated.action === "unlock") {
      await db.work.update({
        where: { id: params.id },
        data: {
          publishingLocked: false,
          publishingLockedAt: null,
        },
      })
      await db.song.updateMany({
        where: { workId: params.id },
        data: {
          publishingLocked: false,
          publishingLockedAt: null,
          masterLocked: false,
          masterLockedAt: null,
        },
      })
      return NextResponse.json({ success: true })
    }

    if (await isPublishingLockedForWork(params.id)) {
      return NextResponse.json(
        { error: "Publishing splits are already locked" },
        { status: 400 }
      )
    }

    const splitData = await getPublishingValidationDataByWorkId(params.id)
    if (!splitData) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 })
    }

    const validation = validateCombinedPublishingSplits({
      collaborators: splitData.collaboratorSplits,
      entities: splitData.entitySplits,
    })

    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Cannot lock: validation failed", details: validation.errors },
        { status: 400 }
      )
    }

    const now = new Date()
    await db.work.update({
      where: { id: params.id },
      data: {
        publishingLocked: true,
        publishingLockedAt: now,
      },
    })
    await db.song.updateMany({
      where: { workId: params.id },
      data: {
        publishingLocked: true,
        publishingLockedAt: now,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error locking work publishing:", error)
    return NextResponse.json(
      { error: "Failed to lock publishing splits" },
      { status: 500 }
    )
  }
}
