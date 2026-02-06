import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

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

    // Update request status
    const updatedRequest = await db.accountRequest.update({
      where: { id: params.id },
      data: {
        status: "rejected",
        rejectedBy: session.user.id,
        rejectedAt: new Date(),
        setupToken: null,
        tokenExpiry: null,
      },
    })

    return NextResponse.json({
      message: "Account request rejected",
      request: updatedRequest,
    })
  } catch (error) {
    console.error("Error rejecting account request:", error)
    return NextResponse.json(
      { error: "Failed to reject request" },
      { status: 500 }
    )
  }
}
