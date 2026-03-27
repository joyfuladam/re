import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { isAdmin } from "@/lib/permissions"
import { CollaboratorRole } from "@prisma/client"
import { isPublishingEligible } from "@/lib/roles"
import { addWorkCollaboratorsMirrorToSongs, isPublishingLockedForWork } from "@/lib/work-publishing-sync"

const addSchema = z.object({
  collaboratorId: z.string().min(1),
  rolesInWork: z.array(z.nativeEnum(CollaboratorRole)).min(1),
  publishingOwnershipPercent: z.number().min(0).max(100).optional().nullable(),
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
    if (!(await isAdmin(session))) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can add composition collaborators" },
        { status: 403 }
      )
    }

    const workId = params.id
    const work = await db.work.findUnique({ where: { id: workId }, select: { id: true } })
    if (!work) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 })
    }

    if (await isPublishingLockedForWork(workId)) {
      return NextResponse.json(
        { error: "Publishing splits are locked and cannot be modified" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validated = addSchema.parse(body)

    const hasPublishingRole = validated.rolesInWork.some((r) => isPublishingEligible(r))
    if (!hasPublishingRole) {
      return NextResponse.json(
        {
          error:
            "At least one role must be eligible for publishing (writer, artist, or label).",
        },
        { status: 400 }
      )
    }

    const collaborator = await db.collaborator.findUnique({
      where: { id: validated.collaboratorId },
    })
    if (!collaborator) {
      return NextResponse.json({ error: "Collaborator not found" }, { status: 404 })
    }

    const invalidRoles = validated.rolesInWork.filter(
      (role) => role !== "label" && !collaborator.capableRoles.includes(role)
    )
    if (invalidRoles.length > 0) {
      return NextResponse.json(
        {
          error: `This collaborator is not capable of: ${invalidRoles.join(", ")}. Capable roles: ${collaborator.capableRoles.join(", ")}`,
        },
        { status: 400 }
      )
    }

    try {
      await addWorkCollaboratorsMirrorToSongs({
        workId,
        collaboratorId: validated.collaboratorId,
        roles: validated.rolesInWork,
        publishingOwnershipPercent: validated.publishingOwnershipPercent ?? null,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to add collaborator"
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("POST /api/works/[id]/collaborators:", error)
    return NextResponse.json({ error: "Failed to add composition collaborator" }, { status: 500 })
  }
}
