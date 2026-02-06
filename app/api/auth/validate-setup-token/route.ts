import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token is required" },
        { status: 400 }
      )
    }

    const accountRequest = await db.accountRequest.findUnique({
      where: { setupToken: token },
    })

    if (!accountRequest) {
      return NextResponse.json(
        { valid: false, error: "Invalid token" },
        { status: 404 }
      )
    }

    if (accountRequest.status !== "approved") {
      return NextResponse.json(
        { valid: false, error: "This request has not been approved" },
        { status: 400 }
      )
    }

    if (!accountRequest.tokenExpiry || accountRequest.tokenExpiry < new Date()) {
      return NextResponse.json(
        { valid: false, error: "This setup link has expired" },
        { status: 400 }
      )
    }

    // Check if account already created
    const existingCollaborator = await db.collaborator.findUnique({
      where: { email: accountRequest.email },
    })

    if (existingCollaborator) {
      return NextResponse.json(
        { valid: false, error: "Account already exists. Please login instead." },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      email: accountRequest.email,
    })
  } catch (error) {
    console.error("Error validating token:", error)
    return NextResponse.json(
      { valid: false, error: "Failed to validate token" },
      { status: 500 }
    )
  }
}
