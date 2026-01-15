import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const askQuestionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validated = askQuestionSchema.parse(body)

    // Save submission to database
    const submission = await db.faqSubmission.create({
      data: {
        name: validated.name,
        email: validated.email,
        subject: validated.subject,
        message: validated.message,
        read: false,
      },
    })

    return NextResponse.json({ 
      success: true,
      message: "Question submitted successfully",
      id: submission.id
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error processing question:", error)
    return NextResponse.json(
      { error: "Failed to submit question" },
      { status: 500 }
    )
  }
}
