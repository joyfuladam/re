import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { z } from "zod"

const askQuestionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validated = askQuestionSchema.parse(body)

    // Send email - using a simple approach that can be replaced with a proper email service
    // For production, integrate with Resend, SendGrid, Nodemailer, or AWS SES
    
    const emailSubject = `FAQ Question: ${validated.subject}`
    const emailBody = `
New question from River and Ember collaborator:

Name: ${validated.name}
Email: ${validated.email}
Subject: ${validated.subject}

Message:
${validated.message}

---
This message was sent from the River and Ember FAQ form.
Reply directly to this email to respond to ${validated.name} at ${validated.email}.
    `.trim()

    // For now, we'll use a simple fetch to send email via a service
    // You can replace this with your preferred email service
    // Example with Resend (recommended for Next.js):
    /*
    import { Resend } from 'resend'
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'noreply@riverandember.com',
      to: 'adam@riverandember.com',
      subject: emailSubject,
      text: emailBody,
      replyTo: validated.email,
    })
    */
    
    // For now, log the email (in production, replace with actual email service)
    console.log("=".repeat(50))
    console.log("EMAIL TO: adam@riverandember.com")
    console.log("SUBJECT:", emailSubject)
    console.log("FROM:", validated.email)
    console.log("BODY:")
    console.log(emailBody)
    console.log("=".repeat(50))
    
    // TODO: Replace with actual email service integration
    // Recommended: Use Resend (https://resend.com) for Next.js applications

    return NextResponse.json({ 
      success: true,
      message: "Question submitted successfully" 
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Error processing question:", error)
    return NextResponse.json(
      { error: "Failed to submit question" },
      { status: 500 }
    )
  }
}
