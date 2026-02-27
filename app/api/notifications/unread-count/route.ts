import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ count: 0 }, { status: 200 })
  }

  const userId = session.user.id

  const count = await db.notification.count({
    where: {
      userId,
      readAt: null,
    },
  })

  return NextResponse.json({ count })
}

