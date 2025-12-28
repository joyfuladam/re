import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getUserPermissions, canManageCollaborators, canAccessCollaborator } from "@/lib/permissions"
import { z } from "zod"
import bcrypt from "bcryptjs"

const collaboratorSchema = z.object({
  firstName: z.string().min(1),
  middleName: z.string().optional().nullable(),
  lastName: z.string().min(1),
  email: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "") ? null : val,
    z.string().email().nullable().optional()
  ), // Optional - only needed for login accounts
  password: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "") ? undefined : val,
    z.string().min(6).optional()
  ), // Optional - only needed if creating login account
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
      capableRoles: z.array(z.enum(["musician", "writer", "producer", "artist"])).min(1), // At least one role, but label is not assignable
  proAffiliation: z.string().optional().nullable(),
  ipiNumber: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  publishingCompany: z.string().optional().nullable(),
  managerName: z.string().optional().nullable(),
  managerEmail: z.string().email().optional().nullable(),
  managerPhone: z.string().optional().nullable(),
  royaltyAccountInfo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const permissions = await getUserPermissions(session)
    if (!permissions) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get("role")
    const search = searchParams.get("search")
    const status = searchParams.get("status") || "active"

    const where: any = {}
    
    // Collaborators can only see their own record, admins see all
    if (!permissions.isAdmin && permissions.collaboratorId) {
      where.id = permissions.collaboratorId
    }
    
    // Filter by role - check if role is in capableRoles array
    if (role) {
      where.capableRoles = { has: role }
    }
    if (status) where.status = status
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ]
    }

    const collaborators = await db.collaborator.findMany({
      where,
      orderBy: {
        lastName: "asc",
      },
    })

    return NextResponse.json(collaborators)
  } catch (error) {
    console.error("Error fetching collaborators:", error)
    return NextResponse.json(
      { error: "Failed to fetch collaborators" },
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

    // Only admins can create collaborators
    const canManage = await canManageCollaborators(session)
    if (!canManage) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can create collaborators" },
        { status: 403 }
      )
    }

    const body = await request.json()
    console.log("Received collaborator creation request:", JSON.stringify(body, null, 2))
    
    const validated = collaboratorSchema.parse(body)
    console.log("Validation passed:", validated)

    // Create collaborator with capable roles (multiple roles allowed)
    // Note: Label is not assignable to collaborators - it's system-only
    // Collaborators are the users - unified model
    const createData: any = {
      firstName: validated.firstName,
      middleName: validated.middleName || null,
      lastName: validated.lastName,
      email: validated.email || null,
      phone: validated.phone,
      address: validated.address,
      capableRoles: validated.capableRoles,
      proAffiliation: validated.proAffiliation,
      ipiNumber: validated.ipiNumber,
      taxId: validated.taxId,
      publishingCompany: validated.publishingCompany,
      managerName: validated.managerName,
      managerEmail: validated.managerEmail,
      managerPhone: validated.managerPhone,
      royaltyAccountInfo: validated.royaltyAccountInfo,
      notes: validated.notes,
      status: validated.status,
      role: "collaborator", // Default role - admins must be assigned manually
    }

    // If password provided, hash it
    if (validated.password) {
      createData.password = await bcrypt.hash(validated.password, 10)
    }

    const collaborator = await db.collaborator.create({
      data: createData,
    })

    return NextResponse.json(collaborator, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors)
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 })
    }
    console.error("Error creating collaborator:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: "Failed to create collaborator", details: errorMessage },
      { status: 500 }
    )
  }
}

