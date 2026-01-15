import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can view submissions
    const admin = await isAdmin(session)
    if (!admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter") // "all", "unread", "read"

    let where: any = {}
    if (filter === "unread") {
      where.read = false
    } else if (filter === "read") {
      where.read = true
    }

    const submissions = await db.faqSubmission.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ submissions })
  } catch (error) {
    console.error("Error fetching FAQ submissions:", error)
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    )
  }
}
