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

    const accountRequest = await db.accountRequest.findUnique({
      where: { id: params.id },
    })

    if (!accountRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    if (accountRequest.status === "approved") {
      return NextResponse.json(
        { error: "This request has already been approved" },
        { status: 400 }
      )
    }

    // Generate setup token (valid for 48 hours)
    const setupToken = randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours

    // Update request status
    const updatedRequest = await db.accountRequest.update({
      where: { id: params.id },
      data: {
        status: "approved",
        approvedBy: session.user.id,
        approvedAt: new Date(),
        setupToken,
        tokenExpiry,
      },
    })

    // Send approval email with setup link
    const setupLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/setup-account?token=${setupToken}`
    const { html, text } = getAccountApprovalEmail(
      updatedRequest.firstName,
      setupLink
    )

    try {
      await sendEmail({
        to: updatedRequest.email,
        subject: "Your River & Ember Account Has Been Approved!",
        html,
        text,
      })
    } catch (emailError) {
      console.error("Failed to send approval email:", emailError)
      // Rollback the approval if email fails
      await db.accountRequest.update({
        where: { id: params.id },
        data: {
          status: "pending",
          approvedBy: null,
          approvedAt: null,
          setupToken: null,
          tokenExpiry: null,
        },
      })
      return NextResponse.json(
        { error: "Failed to send approval email. Please try again." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Account request approved and email sent",
      request: updatedRequest,
    })
  } catch (error) {
    console.error("Error approving account request:", error)
    return NextResponse.json(
      { error: "Failed to approve request" },
      { status: 500 }
    )
  }
}
