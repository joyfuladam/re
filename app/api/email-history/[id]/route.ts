import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"

interface Params {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userIsAdmin = await isAdmin(session)
  if (!userIsAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const log = await db.emailLog.findUnique({
    where: { id: params.id },
    include: {
      template: {
        select: { id: true, name: true },
      },
      song: {
        select: { id: true, title: true },
      },
    },
  })

  if (!log) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(log)
}

