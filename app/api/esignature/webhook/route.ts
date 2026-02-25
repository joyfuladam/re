import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import crypto from "crypto"

/**
 * SignWell webhook endpoint
 * Receives notifications when documents are completed, declined, or canceled
 * 
 * Webhook events to handle:
 * - document.completed: Contract was signed
 * - document.declined: Contract was declined
 * - document.canceled: Contract was canceled
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("x-signwell-signature") || 
                      request.headers.get("x-signature")

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.SIGNWELL_WEBHOOK_SECRET
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
      // SignWell sends JSON data
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

    // Extract event type and document ID
    // SignWell docs: event is an object with event.type (e.g. "document_completed"); document is at data.object
    // See https://developers.signwell.com/reference/event-data
    const eventType =
      (typeof eventData.event === "object" ? eventData.event?.type : null) ||
      eventData.event ||
      eventData.type
    const documentId =
      eventData.data?.object?.id ||
      eventData.data?.document?.id ||
      eventData.document?.id ||
      eventData.id

    if (!eventType || !documentId) {
      console.error("Invalid webhook event data:", eventData)
      return NextResponse.json({ error: "Invalid event data" }, { status: 400 })
    }

    // Find contract by document ID (stored in esignatureDocId)
    const contract = await db.contract.findFirst({
      where: { esignatureDocId: documentId },
    })

    if (!contract) {
      console.warn(`Contract not found for document ID: ${documentId}`)
      // Return 200 to acknowledge receipt (contract might be from another system)
      return NextResponse.json({ received: true })
    }

    // Handle different event types (SignWell uses underscores: document_completed, document_signed, etc.)
    const doc = eventData.data?.object || eventData.data?.document || eventData.document || {}
    switch (eventType) {
      case "document_completed":
      case "document.completed":
      case "document_signed":
      case "document.signed":
      case "document.finished":
        // Contract was signed
        const signedAt =
          doc.completed_at ||
          doc.signed_at ||
          doc.finished_at ||
          doc.updated_at ||
          eventData.data?.document?.completed_at ||
          eventData.document?.completed_at

        await db.contract.update({
          where: { id: contract.id },
          data: {
            esignatureStatus: "signed",
            signedAt: signedAt ? new Date(signedAt) : new Date(),
          },
        })
        break

      case "document_declined":
      case "document.declined":
      case "document.rejected":
        // Contract was declined
        await db.contract.update({
          where: { id: contract.id },
          data: {
            esignatureStatus: "declined",
          },
        })
        break

      case "document_canceled":
      case "document.canceled":
      case "document.cancelled":
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
    // Still return 200 to prevent SignWell from retrying
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




