import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import crypto from "crypto"

/**
 * HelloSign webhook endpoint
 * Receives notifications when signature requests are signed, declined, or canceled
 * 
 * Webhook events to handle:
 * - signature_request_signed: Contract was signed
 * - signature_request_declined: Contract was declined
 * - signature_request_canceled: Contract was canceled
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("x-hellosign-signature")

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.HELLOSIGN_WEBHOOK_SECRET
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
      // HelloSign sends JSON data
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

    // Extract event type and signature request ID
    const eventType = eventData.event?.event_type || eventData.event_type
    const signatureRequestId =
      eventData.event?.event_hash?.signature_request?.signature_request_id ||
      eventData.signature_request?.signature_request_id

    if (!eventType || !signatureRequestId) {
      console.error("Invalid webhook event data:", eventData)
      return NextResponse.json({ error: "Invalid event data" }, { status: 400 })
    }

    // Find contract by signature request ID
    const contract = await db.contract.findFirst({
      where: { esignatureDocId: signatureRequestId },
    })

    if (!contract) {
      console.warn(`Contract not found for signature request ID: ${signatureRequestId}`)
      // Return 200 to acknowledge receipt (contract might be from another system)
      return NextResponse.json({ received: true })
    }

    // Handle different event types
    switch (eventType) {
      case "signature_request_signed":
        // Contract was signed
        const signedAt =
          eventData.event?.event_hash?.signature_request?.signed_at ||
          eventData.signature_request?.signed_at

        await db.contract.update({
          where: { id: contract.id },
          data: {
            esignatureStatus: "signed",
            signedAt: signedAt ? new Date(signedAt * 1000) : new Date(),
          },
        })
        break

      case "signature_request_declined":
        // Contract was declined
        await db.contract.update({
          where: { id: contract.id },
          data: {
            esignatureStatus: "declined",
          },
        })
        break

      case "signature_request_canceled":
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
    // Still return 200 to prevent HelloSign from retrying
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


