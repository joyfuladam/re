import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export const dynamic = 'force-dynamic'

export async function DELETE(
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

    // Delete the account request
    await db.accountRequest.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      message: "Account request deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting account request:", error)
    return NextResponse.json(
      { error: "Failed to delete request" },
      { status: 500 }
    )
  }
}
