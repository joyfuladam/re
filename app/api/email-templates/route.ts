import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/permissions"
import { z } from "zod"

const emailTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  bodyHtml: z.string().optional().nullable(),
  bodyText: z.string().optional().nullable(),
  scope: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userIsAdmin = await isAdmin(session)
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can view email templates" },
        { status: 403 }
      )
    }

    const templates = await db.emailTemplate.findMany({
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error("Error fetching email templates:", error)
    return NextResponse.json(
      { error: "Failed to fetch email templates" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userIsAdmin = await isAdmin(session)
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only admins can create email templates" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = emailTemplateSchema.parse(body)

    const template = await db.emailTemplate.create({
      data: {
        name: validated.name,
        subject: validated.subject,
        bodyHtml: validated.bodyHtml ?? null,
        bodyText: validated.bodyText ?? null,
        scope: validated.scope ?? null,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating email template:", error)
    return NextResponse.json(
      { error: "Failed to create email template" },
      { status: 500 }
    )
  }
}

