import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

export const dynamic = 'force-dynamic'

const setupSchema = z.object({
  token: z.string(),
  password: z.string().min(6),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = setupSchema.parse(body)

    const accountRequest = await db.accountRequest.findUnique({
      where: { setupToken: validated.token },
    })

    if (!accountRequest) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 404 }
      )
    }

    if (accountRequest.status !== "approved") {
      return NextResponse.json(
        { error: "This request has not been approved" },
        { status: 400 }
      )
    }

    if (!accountRequest.tokenExpiry || accountRequest.tokenExpiry < new Date()) {
      return NextResponse.json(
        { error: "This setup link has expired" },
        { status: 400 }
      )
    }

    // Check if account already exists
    const existingCollaborator = await db.collaborator.findUnique({
      where: { email: accountRequest.email },
    })

    if (existingCollaborator) {
      return NextResponse.json(
        { error: "Account already exists. Please login instead." },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validated.password, 10)

    // Create collaborator account
    const collaborator = await db.collaborator.create({
      data: {
        firstName: accountRequest.firstName,
        lastName: accountRequest.lastName,
        email: accountRequest.email,
        password: hashedPassword,
        role: "collaborator",
        capableRoles: [],
        status: "active",
      },
    })

    // Invalidate the setup token
    await db.accountRequest.update({
      where: { id: accountRequest.id },
      data: {
        setupToken: null,
        tokenExpiry: null,
      },
    })

    return NextResponse.json(
      { 
        message: "Account created successfully",
        collaboratorId: collaborator.id 
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    
    console.error("Error setting up account:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? errorMessage : "Failed to set up account. Please try again." },
      { status: 500 }
    )
  }
}
