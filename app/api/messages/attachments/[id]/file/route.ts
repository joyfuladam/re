import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import fs from "node:fs"
import path from "node:path"
import { getUploadsBaseDir } from "@/lib/uploads"

export const runtime = "nodejs"

interface Params {
  params: { id: string }
}

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const attachmentId = params.id

  const att = await db.messageAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      message: {
        select: {
          threadId: true,
        },
      },
    },
  })

  if (!att) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const participant = await db.messageParticipant.findFirst({
    where: { threadId: att.message.threadId, userId },
    select: { id: true },
  })
  if (!participant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const base = getUploadsBaseDir()
  const absolute = path.join(base, att.storagePath)
  if (!fs.existsSync(absolute)) {
    return NextResponse.json({ error: "File missing" }, { status: 404 })
  }

  const buf = fs.readFileSync(absolute)
  return new NextResponse(buf, {
    headers: {
      "Content-Type": att.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(att.fileName)}"`,
    },
  })
}
