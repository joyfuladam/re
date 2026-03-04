import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUploadsBaseDir } from "@/lib/uploads"
import path from "node:path"
import fs from "node:fs"
import { Readable } from "node:stream"

// Public, read-only media endpoint for artwork used on smart links.
// Only serves SongMedia records in the "images" category so that audio/video
// masters remain protected behind the authenticated admin route.
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const media = await db.songMedia.findUnique({
    where: { id: params.id },
    select: { category: true, storagePath: true, mimeType: true, filename: true },
  })

  if (!media || media.category !== "images") {
    return NextResponse.json({ error: "Media not found" }, { status: 404 })
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

