import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"
import { getUploadsBaseDir } from "@/lib/uploads"
import path from "node:path"
import fs from "node:fs"
import { Readable } from "node:stream"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const media = await db.songMedia.findUnique({
    where: { id: params.id },
    select: { songId: true, storagePath: true, mimeType: true, filename: true },
  })
  if (!media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 })
  }

  const userIsAdmin = await isAdmin(session)
  if (!userIsAdmin) {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
  }

  const base = getUploadsBaseDir()
  const absolutePath = path.join(base, media.storagePath)
  if (!fs.existsSync(absolutePath)) {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
  }

  const stat = fs.statSync(absolutePath)
  const nodeStream = fs.createReadStream(absolutePath)
  const webStream = Readable.toWeb(nodeStream) as ReadableStream

  const headers = new Headers({
    "Content-Type": media.mimeType,
    "Content-Length": stat.size.toString(),
    "Content-Disposition": `inline; filename="${media.filename}"`,
  })

  return new Response(webStream, {
    status: 200,
    headers,
  })
}
