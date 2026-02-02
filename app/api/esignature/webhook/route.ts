import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import crypto from "crypto"

/**
 * DocuSeal webhook endpoint
 * Receives notifications when submissions are completed, declined, or canceled
 * 
 * Webhook events to handle:
 * - submission.completed: Contract was signed
 * - submission.declined: Contract was declined
 * - submission.canceled: Contract was canceled
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("x-docuseal-signature") || 
                      request.headers.get("x-signature")

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.DOCUSEAL_WEBHOOK_SECRET
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex")

      if (signature !== expectedSignature) {
        console.error("Webhook signature verification failed")
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    // Parse webhook event
    let eventData: any
    try {
      // DocuSeal sends JSON data
      eventData = JSON.parse(body)
    } catch (error) {
      // Some webhook providers send form-encoded data
      const params = new URLSearchParams(body)
      const jsonData = params.get("json")
      if (jsonData) {
        eventData = JSON.parse(jsonData)
      } else {
        return NextResponse.json({ error: "Invalid webhook data" }, { status: 400 })
      }
    }

    // Extract event type and submission ID
    // DocuSeal webhook format: { event: "submission.completed", data: { submission: { id: ... } } }
    const eventType = eventData.event || eventData.type
    const submissionId =
      eventData.data?.submission?.id ||
      eventData.submission?.id ||
      eventData.id

    if (!eventType || !submissionId) {
      console.error("Invalid webhook event data:", eventData)
      return NextResponse.json({ error: "Invalid event data" }, { status: 400 })
    }

    // Find contract by submission ID (stored in esignatureDocId)
    const contract = await db.contract.findFirst({
      where: { esignatureDocId: submissionId },
    })

    if (!contract) {
      console.warn(`Contract not found for submission ID: ${submissionId}`)
      // Return 200 to acknowledge receipt (contract might be from another system)
      return NextResponse.json({ received: true })
    }

    // Handle different event types
    // DocuSeal events: submission.completed, submission.declined, submission.canceled
    switch (eventType) {
      case "submission.completed":
      case "submission.finished":
        // Contract was signed
        const signedAt =
          eventData.data?.submission?.completed_at ||
          eventData.data?.submission?.finished_at ||
          eventData.submission?.completed_at ||
          eventData.submission?.finished_at ||
          eventData.completed_at ||
          eventData.finished_at

        await db.contract.update({
          where: { id: contract.id },
          data: {
            esignatureStatus: "signed",
            signedAt: signedAt ? new Date(signedAt) : new Date(),
          },
        })
        break

      case "submission.declined":
      case "submission.rejected":
        // Contract was declined
        await db.contract.update({
          where: { id: contract.id },
          data: {
            esignatureStatus: "declined",
          },
        })
        break

      case "submission.canceled":
      case "submission.cancelled":
        // Contract was canceled
        await db.contract.update({
          where: { id: contract.id },
          data: {
            esignatureStatus: "pending", // Reset to pending so it can be resent
            esignatureDocId: null,
          },
        })
        break

      default:
        console.log(`Unhandled webhook event type: ${eventType}`)
    }

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    // Still return 200 to prevent DocuSeal from retrying
    // Log the error for debugging
    return NextResponse.json({ received: true, error: "Processing failed" }, { status: 200 })
  }
}

// Handle GET requests (webhook verification)
export async function GET(request: NextRequest) {
  // Some webhook providers send GET requests for verification
  // Return a simple response
  return NextResponse.json({ status: "webhook endpoint active" })
}




