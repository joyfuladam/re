import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canAccessCollaborator, canUpdateCollaborator, canManageCollaborators, getUserPermissions } from "@/lib/permissions"
import { CollaboratorRole } from "@prisma/client"
import { z } from "zod"
import bcrypt from "bcryptjs"

const collaboratorUpdateSchema = z.object({
  firstName: z.string().min(1).optional(),
  middleName: z.string().optional().nullable(),
  lastName: z.string().min(1).optional(),
  email: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "") ? null : val,
    z.string().email().nullable().optional()
  ),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  role: z.enum(["admin", "collaborator"]).optional(),
  capableRoles: z.array(z.enum(["musician", "writer", "producer", "artist"])).min(1).optional(),
  proAffiliation: z.string().optional().nullable(),
  ipiNumber: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  publishingCompany: z.string().optional().nullable(),
  managerName: z.string().optional().nullable(),
  managerEmail: z.string().email().optional().nullable(),
  managerPhone: z.string().optional().nullable(),
  royaltyAccountInfo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user can access this collaborator
    const canAccess = await canAccessCollaborator(session, params.id)
    if (!canAccess) {
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this collaborator" },
        { status: 403 }
      )
    }

    // Check if user is admin (to determine if role should be included)
    const permissions = await getUserPermissions(session)
    const isAdmin = permissions?.isAdmin ?? false

    const collaborator = await db.collaborator.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        capableRoles: true,
        proAffiliation: true,
        ipiNumber: true,
        taxId: true,
        publishingCompany: true,
        managerName: true,
        managerEmail: true,
        managerPhone: true,
        royaltyAccountInfo: true,
        notes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        // Explicitly exclude password field
      },
    })

    if (!collaborator) {
      return NextResponse.json(
        { error: "Collaborator not found" },
        { status: 404 }
      )
    }

    // Remove role from response if user is not admin
    const response = isAdmin
      ? collaborator
      : { ...collaborator, role: undefined }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching collaborator:", error)
    return NextResponse.json(
      { error: "Failed to fetch collaborator" },
      { status: 500 }
    )
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

    // Check if user can update this collaborator
    const canUpdate = await canUpdateCollaborator(session, params.id)
    if (!canUpdate) {
      return NextResponse.json(
        { error: "Forbidden: You don't have permission to update this collaborator" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = collaboratorUpdateSchema.parse(body)

    // Check if user is admin (only admins can change passwords and roles)
    const permissions = await getUserPermissions(session)
    if (validated.password && !permissions?.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can change passwords" },
        { status: 403 }
      )
    }

    // Only admins can change roles
    if (validated.role !== undefined && !permissions?.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can change roles" },
        { status: 403 }
      )
    }

    // Only admins can change capableRoles
    if (validated.capableRoles !== undefined && !permissions?.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can change capable roles" },
        { status: 403 }
      )
    }

    // Build update data - use spread operator like in create route
    const updateData: any = { ...validated }
    
    // Convert empty email strings to null
    if (validated.email !== undefined) {
      updateData.email = validated.email || null
    }

    // Handle password hashing if password is being updated
    if (validated.password) {
      const hashedPassword = await bcrypt.hash(validated.password, 10)
      updateData.password = hashedPassword
    } else {
      // Remove password from updateData if not provided
      delete updateData.password
    }

    // capableRoles is validated by Zod and should work directly
    // Prisma accepts string arrays that match enum values

    const collaborator = await db.collaborator.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        capableRoles: true,
        proAffiliation: true,
        ipiNumber: true,
        taxId: true,
        publishingCompany: true,
        managerName: true,
        managerEmail: true,
        managerPhone: true,
        royaltyAccountInfo: true,
        notes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        // Explicitly exclude password field
      },
    })

    return NextResponse.json(collaborator)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error updating collaborator:", error.errors)
      return NextResponse.json({ 
        error: "Validation failed", 
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
          code: e.code
        }))
      }, { status: 400 })
    }
    console.error("Error updating collaborator:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { 
        error: "Failed to update collaborator",
        details: errorMessage 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can delete collaborators
    const canManage = await canManageCollaborators(session)
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can delete collaborators" },
        { status: 403 }
      )
    }

    await db.collaborator.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting collaborator:", error)
    return NextResponse.json(
      { error: "Failed to delete collaborator" },
      { status: 500 }
    )
  }
}

