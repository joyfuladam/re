import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { sendEmail, getAccountApprovalEmail } from "@/lib/email"
import crypto from "crypto"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only admins can resend welcome emails
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      )
    }

    // Get the account request
    const accountRequest = await db.accountRequest.findUnique({
      where: { id: params.id },
    })

    if (!accountRequest) {
      return NextResponse.json(
        { error: "Account request not found" },
        { status: 404 }
      )
    }

    if (accountRequest.status !== "approved") {
      return NextResponse.json(
        { error: "Can only resend email for approved requests" },
        { status: 400 }
      )
    }

    // Generate new setup token and expiry
    const setupToken = crypto.randomBytes(32).toString("hex")
    const tokenExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours

    // Update the account request with new token
    await db.accountRequest.update({
      where: { id: params.id },
      data: {
        setupToken,
        tokenExpiry,
      },
    })

    // Build setup link
    const baseUrl = process.env.NEXTAUTH_URL || 'https://riverandember.com'
    const setupLink = `${baseUrl}/setup-account?token=${setupToken}`

    // Send approval email
    const { html, text } = getAccountApprovalEmail(accountRequest.firstName, setupLink)
    
    try {
      await sendEmail({
        to: accountRequest.email,
        subject: "Your River & Ember Account Has Been Approved!",
        html,
        text,
      })

      return NextResponse.json({
        success: true,
        message: "Welcome email resent successfully",
        email: accountRequest.email,
      })
    } catch (emailError) {
      console.error("Failed to send email:", emailError)
      
      // Return partial success with setup link
      return NextResponse.json(
        {
          success: false,
          error: "Failed to send email. Please copy the setup link and send it manually.",
          setupLink,
          email: accountRequest.email,
        },
        { status: 207 } // Multi-status
      )
    }
  } catch (error) {
    console.error("Error resending welcome email:", error)
    return NextResponse.json(
      { error: "Failed to resend welcome email" },
      { status: 500 }
    )
  }
}
