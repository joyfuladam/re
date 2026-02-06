import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { z } from "zod"
import { sendEmail, getAccountRequestNotificationEmail } from "@/lib/email"

export const dynamic = 'force-dynamic'

const requestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = requestSchema.parse(body)

    // Check if email is already registered as a collaborator
    const existingCollaborator = await db.collaborator.findUnique({
      where: { email: validated.email },
    })

    if (existingCollaborator) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please try logging in instead." },
        { status: 400 }
      )
    }

    // Check if there's already a pending request for this email
    const existingRequest = await db.accountRequest.findUnique({
      where: { email: validated.email },
    })

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        return NextResponse.json(
          { error: "A request with this email is already pending review." },
          { status: 400 }
        )
      } else if (existingRequest.status === "approved") {
        return NextResponse.json(
          { error: "This email has already been approved. Check your inbox for the setup link." },
          { status: 400 }
        )
      }
      // If rejected, allow a new request (will update the existing record)
    }

    // Create or update account request
    const accountRequest = existingRequest
      ? await db.accountRequest.update({
          where: { email: validated.email },
          data: {
            firstName: validated.firstName,
            lastName: validated.lastName,
            status: "pending",
            approvedBy: null,
            approvedAt: null,
            rejectedBy: null,
            rejectedAt: null,
            setupToken: null,
            tokenExpiry: null,
          },
        })
      : await db.accountRequest.create({
          data: {
            firstName: validated.firstName,
            lastName: validated.lastName,
            email: validated.email,
            status: "pending",
          },
        })

    // Notify admins (optional - send email to all admin users)
    try {
      const admins = await db.collaborator.findMany({
        where: { role: "admin" },
        select: { email: true, firstName: true },
      })

      const dashboardUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard`
      
      for (const admin of admins) {
        if (admin.email) {
          const { html, text } = getAccountRequestNotificationEmail(
            validated.firstName,
            validated.lastName,
            validated.email,
            dashboardUrl
          )
          
          await sendEmail({
            to: admin.email,
            subject: "New Account Request - River & Ember",
            html,
            text,
          })
        }
      }
    } catch (emailError) {
      // Log but don't fail the request if email fails
      console.error("Failed to send admin notification emails:", emailError)
    }

    return NextResponse.json(
      { 
        message: "Account request submitted successfully",
        requestId: accountRequest.id 
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    console.error("Error creating account request:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    
    return NextResponse.json(
      { error: process.env.NODE_ENV === "development" ? errorMessage : "Failed to submit request. Please try again." },
      { status: 500 }
    )
  }
}
