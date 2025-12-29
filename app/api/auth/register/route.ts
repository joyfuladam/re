import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

export const dynamic = 'force-dynamic'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  middleName: z.string().optional(),
  lastName: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = registerSchema.parse(body)

    // Check if collaborator already exists
    const existingCollaborator = await db.collaborator.findUnique({
      where: { email: validated.email },
    })

    if (existingCollaborator) {
      return NextResponse.json(
        { error: "Collaborator with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validated.password, 10)

    // Create collaborator record (collaborators are the users - unified model)
    const collaborator = await db.collaborator.create({
      data: {
        firstName: validated.firstName,
        middleName: validated.middleName || null,
        lastName: validated.lastName,
        email: validated.email,
        password: hashedPassword,
        role: "collaborator", // Default role - admins must be assigned manually
        capableRoles: [], // Will be set later by admin
        status: "active",
      },
    })

    return NextResponse.json(
      { message: "Collaborator created successfully", collaboratorId: collaborator.id },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    
    // Log detailed error for debugging
    console.error("Error creating user:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorStack = error instanceof Error ? error.stack : undefined
    
    // Return more detailed error in development, generic in production
    return NextResponse.json(
      { 
        error: "Failed to create user",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
        stack: process.env.NODE_ENV === "development" ? errorStack : undefined
      },
      { status: 500 }
    )
  }
}

