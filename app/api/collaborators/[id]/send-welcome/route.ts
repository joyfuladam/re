import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { randomBytes } from "crypto"
import { sendEmail, getAccountApprovalEmail } from "@/lib/email"

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the collaborator
    const collaborator = await db.collaborator.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        password: true,
      },
    })

    if (!collaborator) {
      return NextResponse.json({ error: "Collaborator not found" }, { status: 404 })
    }

    if (!collaborator.email) {
      return NextResponse.json(
        { error: "This collaborator has no email address. Please add an email first." },
        { status: 400 }
      )
    }

    // Check if they already have a password
    if (collaborator.password) {
      return NextResponse.json(
        { error: "This collaborator already has a password set up. They can use 'Forgot Password' if needed." },
        { status: 400 }
      )
    }

    // Create or update account request with setup token
    const setupToken = randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours

    // Check if account request already exists for this email
    const existingRequest = await db.accountRequest.findUnique({
      where: { email: collaborator.email },
    })

    if (existingRequest) {
      // Update existing request with new token
      await db.accountRequest.update({
        where: { email: collaborator.email },
        data: {
          status: "approved",
          approvedBy: session.user.id,
          approvedAt: new Date(),
          setupToken,
          tokenExpiry,
        },
      })
    } else {
      // Create new account request
      await db.accountRequest.create({
        data: {
          firstName: collaborator.firstName,
          lastName: collaborator.lastName,
          email: collaborator.email,
          status: "approved",
          approvedBy: session.user.id,
          approvedAt: new Date(),
          setupToken,
          tokenExpiry,
        },
      })
    }

    // Send welcome email with setup link
    const setupLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/setup-account?token=${setupToken}`
    const { html, text } = getAccountApprovalEmail(
      collaborator.firstName,
      setupLink
    )

    try {
      await sendEmail({
        to: collaborator.email,
        subject: "Set Up Your River & Ember Account Password",
        html,
        text,
      })
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError)
      const errorMessage = emailError instanceof Error ? emailError.message : "Unknown error"
      return NextResponse.json(
        { 
          error: `Failed to send email: ${errorMessage}. Setup link: ${setupLink}`,
          setupLink,
        },
        { status: 207 } // Partial success
      )
    }

    return NextResponse.json({
      message: "Welcome email sent successfully",
      email: collaborator.email,
    })
  } catch (error) {
    console.error("Error sending welcome email:", error)
    return NextResponse.json(
      { error: "Failed to send welcome email" },
      { status: 500 }
    )
  }
}
