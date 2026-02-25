import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { createSignWellClient } from "@/lib/signwell"
import { z } from "zod"

export const dynamic = 'force-dynamic'

const statusSchema = z.object({
  contractId: z.string(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can check status
    if (session.user?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Only admins can check status" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const contractId = searchParams.get("contractId")

    if (!contractId) {
      return NextResponse.json({ error: "contractId is required" }, { status: 400 })
    }

    const validated = statusSchema.parse({ contractId })

    // Get contract from database
    const contract = await db.contract.findUnique({
      where: { id: validated.contractId },
    })

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 })
    }

    // If contract was never sent (no SignWell document ID), return database status only
    if (!contract.esignatureDocId) {
      return NextResponse.json({
        status: contract.esignatureStatus || "pending",
        signedAt: contract.signedAt?.toISOString() || null,
        source: "database",
      })
    }

    // Initialize SignWell client
    const apiKey = process.env.SIGNWELL_API_KEY
    const apiUrl = process.env.SIGNWELL_API_URL // Optional, defaults to https://api.signwell.com

    if (!apiKey) {
      // If SignWell not configured, return database status
      return NextResponse.json({
        status: contract.esignatureStatus || "pending",
        signedAt: contract.signedAt?.toISOString() || null,
        source: "database",
        warning: "SignWell not configured, returning database status",
      })
    }

    // Get status from SignWell API
    try {
      const client = createSignWellClient(apiKey, apiUrl)
      const signWellStatus = await client.getSignatureStatus(contract.esignatureDocId)

      // Update database if status changed
      if (signWellStatus.status !== contract.esignatureStatus) {
        await db.contract.update({
          where: { id: contract.id },
          data: {
            esignatureStatus: signWellStatus.status,
            signedAt: signWellStatus.signedAt ? new Date(signWellStatus.signedAt) : null,
          },
        })
      }

      return NextResponse.json({
        status: signWellStatus.status,
        signedAt: signWellStatus.signedAt,
        signers: signWellStatus.signers,
        source: "signwell",
      })
    } catch (error) {
      console.error("Error fetching status from SignWell:", error)
      // Return database status as fallback
      return NextResponse.json({
        status: contract.esignatureStatus || "pending",
        signedAt: contract.signedAt?.toISOString() || null,
        source: "database",
        error: error instanceof Error ? error.message : "Failed to fetch from SignWell",
      })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error checking status:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to check status"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
