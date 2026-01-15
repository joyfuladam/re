import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can mark submissions as read
    const admin = await isAdmin(session)
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { read } = body

    const submission = await db.faqSubmission.update({
      where: { id: params.id },
      data: {
        read: read === true,
        readAt: read === true ? new Date() : null,
        readBy: read === true ? session.user.id : null,
      },
    })

    return NextResponse.json({ submission })
  } catch (error) {
    console.error("Error updating FAQ submission:", error)
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can delete submissions
    const admin = await isAdmin(session)
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await db.faqSubmission.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting FAQ submission:", error)
    return NextResponse.json(
      { error: "Failed to delete submission" },
      { status: 500 }
    )
  }
}
