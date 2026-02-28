import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"

/**
 * DELETE: Admin-only. Deletes all smart link click records (resets counts to zero).
 */
export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userIsAdmin = await isAdmin(session)
  if (!userIsAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const result = await db.smartLinkClick.deleteMany({})
  return NextResponse.json({
    deleted: result.count,
    message: `Cleared ${result.count} click record(s). Counts are now zero.`,
  })
}
