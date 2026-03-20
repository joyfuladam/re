import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canManageSplits } from "@/lib/permissions"
import {
  isPublishingLockedForWork,
  replaceWorkPublishingEntities,
} from "@/lib/work-publishing-sync"
import { z } from "zod"

export const dynamic = "force-dynamic"

const bodySchema = z.object({
  entities: z.array(
    z.object({
      publishingEntityId: z.string(),
      ownershipPercentage: z.number().min(0).max(100),
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

    const totalPercentage = validated.entities.reduce(
      (sum, e) => sum + e.ownershipPercentage,
      0
    )
    if (Math.abs(totalPercentage - 50) > 0.01) {
      return NextResponse.json(
        {
          error: "Publisher's share must total exactly 50%",
          details: `Current total: ${totalPercentage.toFixed(2)}%`,
        },
        { status: 400 }
      )
    }

    await replaceWorkPublishingEntities(params.id, validated.entities)

    const updated = await db.workPublishingEntity.findMany({
      where: { workId: params.id },
      include: {
        publishingEntity: true,
      },
    })

    return NextResponse.json(updated, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating work publishing entities:", error)
    return NextResponse.json(
      { error: "Failed to update publishing entities" },
      { status: 500 }
    )
  }
}
