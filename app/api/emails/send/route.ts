import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"
import { z } from "zod"
import { applyEmailTemplatePlaceholders, renderEmailTemplate, sendTemplatedEmail } from "@/lib/email"

const sendEmailSchema = z.object({
  templateId: z.string().optional().nullable(),
  subject: z.string().min(1, "Subject is required").optional(),
  bodyHtml: z.string().optional(),
  bodyText: z.string().optional().nullable(),
  scope: z.enum(["all_collaborators", "song_collaborators", "specific_collaborators"]),
  songId: z.string().optional().nullable(),
  collaboratorIds: z.array(z.string()).optional().nullable(),
  // For now we primarily support single_bcc, but keep the field for future extension
  bccMode: z.enum(["single_bcc", "per_recipient"]).optional().default("single_bcc"),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userIsAdmin = await isAdmin(session)
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can send broadcast emails" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = sendEmailSchema.parse(body)

    // Resolve recipients based on scope
    let recipientEmails: string[] = []
    let songTitle: string | undefined

    if (validated.scope === "all_collaborators") {
      const collaborators = await db.collaborator.findMany({
        where: {
          email: {
            not: null,
          },
          status: "active",
        },
        select: { email: true },
      })
      recipientEmails = collaborators
        .map((c) => c.email)
        .filter((e): e is string => !!e)
    } else if (validated.scope === "song_collaborators") {
      if (!validated.songId) {
        return NextResponse.json(
          { error: "songId is required when scope is song_collaborators" },
          { status: 400 }
        )
      }

      const song = await db.song.findUnique({
        where: { id: validated.songId },
        select: {
          id: true,
          title: true,
          songCollaborators: {
            include: {
              collaborator: {
                select: { email: true, status: true },
              },
            },
          },
        },
      })

      if (!song) {
        return NextResponse.json({ error: "Song not found" }, { status: 404 })
      }

      songTitle = song.title
      recipientEmails = song.songCollaborators
        .map((sc) => sc.collaborator.email)
        .filter((email): email is string => !!email)
    } else if (validated.scope === "specific_collaborators") {
      if (!validated.collaboratorIds || validated.collaboratorIds.length === 0) {
        return NextResponse.json(
          { error: "collaboratorIds is required when scope is specific_collaborators" },
          { status: 400 }
        )
      }

      const collaborators = await db.collaborator.findMany({
        where: {
          id: { in: validated.collaboratorIds },
          email: { not: null },
        },
        select: { email: true },
      })
      recipientEmails = collaborators
        .map((c) => c.email)
        .filter((e): e is string => !!e)
    }

    // De-duplicate and filter invalid emails
    const uniqueEmails = Array.from(new Set(recipientEmails)).filter(Boolean)

    if (uniqueEmails.length === 0) {
      return NextResponse.json(
        { error: "No recipients with valid email addresses were found for this selection" },
        { status: 400 }
      )
    }

    // Load template if provided
    let baseSubject = validated.subject || ""
    let baseHtml = validated.bodyHtml || ""
    let baseText = validated.bodyText || undefined

    if (validated.templateId) {
      const template = await db.emailTemplate.findUnique({
        where: { id: validated.templateId },
      })

      if (!template) {
        return NextResponse.json({ error: "Email template not found" }, { status: 404 })
      }

      baseSubject = validated.subject || template.subject
      baseHtml = validated.bodyHtml || template.bodyHtml || ""
      baseText = validated.bodyText || template.bodyText || undefined
    }

    if (!baseSubject || !baseHtml) {
      return NextResponse.json(
        { error: "Subject and HTML body are required (either from template or request)" },
        { status: 400 }
      )
    }

    // Detect collaborator-specific placeholders that require per-recipient sending
    const combinedContent = `${baseSubject}\n${baseHtml}\n${baseText ?? ""}`
    const usesCollaboratorName = combinedContent.includes("{{collaborator_name}}")
    if (usesCollaboratorName && validated.bccMode === "single_bcc") {
      return NextResponse.json(
        {
          error:
            'Templates using {{collaborator_name}} require per-recipient sending. Per-recipient delivery is not enabled yet when bccMode is "single_bcc".',
        },
        { status: 400 }
      )
    }

    // Build placeholder context (shared across recipients)
    const templateContext: Record<string, string | number | null | undefined> = {
      song_title: songTitle,
    }

    // Render subject/body with placeholders
    const rendered = renderEmailTemplate(baseSubject, baseHtml, baseText, templateContext)

    // Determine a safe \"to\" address for the broadcast
    const adminEmail =
      process.env.CEO_EMAIL ||
      session.user?.email ||
      process.env.RESEND_FROM_EMAIL ||
      "no-reply@riverandember.com"

    // For now we only support single_bcc; per-recipient can be added later
    await sendTemplatedEmail({
      to: adminEmail,
      bcc: uniqueEmails,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    })

    // Create email log entry (best-effort; errors here shouldn't fail the send)
    try {
      await db.emailLog.create({
        data: {
          templateId: validated.templateId || null,
          subject: rendered.subject,
          bodyHtml: rendered.html,
          bodyPreview: rendered.html.slice(0, 1000),
          scope: validated.scope,
          songId: validated.songId || null,
          recipientCount: uniqueEmails.length,
          recipientEmails: uniqueEmails.join(","),
          triggeredById: session.user?.id || null,
          triggeredByEmail: session.user?.email || null,
        },
      })
    } catch (logError) {
      console.error("Failed to create EmailLog entry:", logError)
    }

    return NextResponse.json({
      success: true,
      recipients: uniqueEmails.length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error sending broadcast email:", error)
    return NextResponse.json(
      { error: "Failed to send email", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

