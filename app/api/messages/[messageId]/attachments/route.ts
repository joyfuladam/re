import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import fs from "node:fs"
import { resolveMessageAttachmentPath } from "@/lib/uploads"
import { MESSAGE_ATTACHMENT_MAX_BYTES } from "@/lib/uploads"

export const runtime = "nodejs"

interface Params {
  params: { messageId: string }
}

async function assertParticipant(threadId: string, userId: string) {
  const p = await db.messageParticipant.findFirst({
    where: { threadId, userId },
    select: { id: true },
  })
  return !!p
}

/** Multipart upload: attach one file to an existing message (field name: `file`) */
export async function POST(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const messageId = params.messageId

  const msg = await db.message.findUnique({
    where: { id: messageId },
    select: { id: true, threadId: true, senderId: true, deletedAt: true },
  })
  if (!msg || msg.deletedAt) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 })
  }

  if (msg.senderId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (!(await assertParticipant(msg.threadId, userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  if (buf.length > MESSAGE_ATTACHMENT_MAX_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 })
  }

  const filename = (file as File).name || "upload"
  const mime = (file as File).type || "application/octet-stream"

  const { absolutePath, storagePath } = resolveMessageAttachmentPath(
    msg.threadId,
    messageId,
    filename
  )

  fs.writeFileSync(absolutePath, buf)

  const row = await db.messageAttachment.create({
    data: {
      messageId,
      uploaderId: userId,
      fileName: filename,
      mimeType: mime,
      fileSize: buf.length,
      storagePath,
    },
  })

  return NextResponse.json({
    id: row.id,
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    url: `/api/messages/attachments/${row.id}/file`,
  })
}
