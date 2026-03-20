import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canManageSongs } from "@/lib/permissions"
import { numberToDecimal } from "@/lib/validators"
import { Prisma } from "@prisma/client"
import { z } from "zod"

export const dynamic = "force-dynamic"

const patchWorkSchema = z.object({
  title: z.string().min(1).optional(),
  iswcCode: z.string().optional().nullable(),
  /** Label share of the composition’s publishing (0–100), stored as 0–1 on Work. */
  labelPublishingSharePercent: z.number().min(0).max(100).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canManage = await canManageSongs(session)
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const work = await db.work.findUnique({
      where: { id: params.id },
      include: {
        songs: {
          select: {
            id: true,
            title: true,
            isrcCode: true,
            catalogNumber: true,
            status: true,
          },
          orderBy: { title: "asc" },
        },
      },
    })

    if (!work) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 })
    }

    return NextResponse.json(work)
  } catch (error) {
    console.error("Error fetching work:", error)
    return NextResponse.json({ error: "Failed to fetch work" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canManage = await canManageSongs(session)
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validated = patchWorkSchema.parse(body)

    const existing = await db.work.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 })
    }

    const data: Prisma.WorkUpdateInput = {}

    if (validated.title !== undefined) {
      data.title = validated.title
    }
    if (validated.iswcCode !== undefined) {
      if (validated.iswcCode) {
        const other = await db.work.findFirst({
          where: {
            iswcCode: validated.iswcCode,
            NOT: { id: params.id },
          },
          select: { id: true },
        })
        if (other) {
          return NextResponse.json(
            { error: "This ISWC is already assigned to another composition" },
            { status: 409 }
          )
        }
      }
      data.iswcCode = validated.iswcCode
    }
    if (validated.labelPublishingSharePercent !== undefined) {
      data.labelPublishingShare = numberToDecimal(
        validated.labelPublishingSharePercent / 100
      )
    }

    try {
      const work = await db.work.update({
        where: { id: params.id },
        data,
        include: {
          songs: {
            select: {
              id: true,
              title: true,
              isrcCode: true,
              catalogNumber: true,
              status: true,
            },
            orderBy: { title: "asc" },
          },
        },
      })
      return NextResponse.json(work)
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "Unique constraint failed (e.g. duplicate ISWC)" },
          { status: 409 }
        )
      }
      throw e
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating work:", error)
    return NextResponse.json({ error: "Failed to update work" }, { status: 500 })
  }
}
