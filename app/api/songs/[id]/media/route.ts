import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"
import busboy from "busboy"
import { Readable } from "node:stream"
import fs from "node:fs"
import path from "node:path"
import {
  getMimeCategory,
  resolveSongMediaPath,
  MAX_FILE_SIZE_BYTES,
  type MediaCategory,
} from "@/lib/uploads"

export const runtime = "nodejs"

/** Sanitize filename: keep only basename and safe chars */
function safeFilename(original: string): string {
  const base = path.basename(original).replace(/[^a-zA-Z0-9._-]/g, "_")
  return base || "file"
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const songId = params.id
  const userIsAdmin = await isAdmin(session)
  if (!userIsAdmin) {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
  }

  const song = await db.song.findUnique({
    where: { id: songId },
    select: { id: true },
  })
  if (!song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const category = searchParams.get("category") as MediaCategory | null

  const where: { songId: string; category?: string } = { songId }
  if (category && ["audio", "images", "videos"].includes(category)) {
    where.category = category
  }

  const media = await db.songMedia.findMany({
    where,
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(media)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const songId = params.id
  const userIsAdmin = await isAdmin(session)
  if (!userIsAdmin) {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
  }

  const song = await db.song.findUnique({
    where: { id: songId },
    select: { id: true },
  })
  if (!song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 })
  }

  const contentType = request.headers.get("content-type") || ""
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Content-Type must be multipart/form-data" },
      { status: 400 }
    )
  }

  return new Promise<NextResponse>((resolve, reject) => {
    const headers = Object.fromEntries(request.headers)
    const bb = busboy({ headers })

    let resolvedCategory: MediaCategory | null = null
    let filename = ""
    let mimeType = ""
    let storagePath = ""
    let absolutePath = ""
    let fileSize = 0
    let label: string | null = null
    let writeStream: fs.WriteStream | null = null

    bb.on("field", (name, value) => {
      if (name === "category") {
        resolvedCategory = value as MediaCategory
      }
      if (name === "label") {
        label = value || null
      }
    })

    bb.on("file", (name, file, info) => {
      const mime = info.mimeType || "application/octet-stream"
      const cat = getMimeCategory(mime)
      const category = resolvedCategory || cat

      if (!category || !["audio", "images", "videos"].includes(category)) {
        file.resume()
        return
      }

      const maxSize = MAX_FILE_SIZE_BYTES[category]
      const originalName = info.filename || "file"
      filename = safeFilename(originalName)
      mimeType = mime
      resolvedCategory = category

      const { absolutePath: abs, storagePath: store } = resolveSongMediaPath(
        songId,
        category,
        filename
      )
      absolutePath = abs
      storagePath = store
      writeStream = fs.createWriteStream(absolutePath)

      file.on("data", (chunk: Buffer) => {
        fileSize += chunk.length
      })

      file.pipe(writeStream)
    })

    bb.on("close", async () => {
      try {
        if (writeStream && !writeStream.destroyed) {
          writeStream.end()
          await new Promise<void>((res, rej) => {
            writeStream!.on("finish", res)
            writeStream!.on("error", rej)
          })
        }

        if (!resolvedCategory || !filename || !storagePath) {
          return resolve(
            NextResponse.json(
              { error: "No valid file uploaded (check category and file type)" },
              { status: 400 }
            )
          )
        }

        const maxSize = MAX_FILE_SIZE_BYTES[resolvedCategory]
        if (fileSize > maxSize) {
          if (absolutePath && fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath)
          }
          return resolve(
            NextResponse.json(
              {
                error: `File exceeds max size for ${resolvedCategory} (${maxSize / 1024 / 1024}MB)`,
              },
              { status: 400 }
            )
          );
        }

        const media = await db.songMedia.create({
          data: {
            songId,
            category: resolvedCategory,
            filename,
            storagePath,
            mimeType,
            fileSize,
            label: label || undefined,
          },
        })

        resolve(NextResponse.json(media))
      } catch (err) {
        if (absolutePath && fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath)
        }
        reject(err)
      }
    })

    bb.on("error", (err) => {
      if (absolutePath && fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath)
      }
      reject(err)
    })

    const nodeStream = Readable.fromWeb(request.body as any)
    nodeStream.pipe(bb)
  }).catch((err) => {
    console.error("Media upload error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 400 }
    )
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const songId = params.id
  const userIsAdmin = await isAdmin(session)
  if (!userIsAdmin) {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const mediaId = searchParams.get("mediaId")
  if (!mediaId) {
    return NextResponse.json(
      { error: "Missing mediaId query parameter" },
      { status: 400 }
    )
  }

  const media = await db.songMedia.findFirst({
    where: { id: mediaId, songId },
  })
  if (!media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 })
  }

  const base = (await import("@/lib/uploads")).getUploadsBaseDir()
  const absolutePath = path.join(base, media.storagePath)
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath)
  }

  await db.songMedia.delete({
    where: { id: mediaId },
  })

  return NextResponse.json({ success: true })
}
