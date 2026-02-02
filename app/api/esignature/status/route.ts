import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { createDocuSealClient } from "@/lib/docuseal"
import { z } from "zod"

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

    // If contract hasn't been sent yet, return database status
    if (!contract.esignatureDocId || contract.esignatureStatus === "pending") {
      return NextResponse.json({
        status: contract.esignatureStatus || "pending",
        signedAt: contract.signedAt?.toISOString() || null,
        source: "database",
      })
    }

    // Initialize DocuSeal client
    const apiKey = process.env.DOCUSEAL_API_KEY
    const apiUrl = process.env.DOCUSEAL_API_URL

    if (!apiKey || !apiUrl) {
      // If DocuSeal not configured, return database status
      return NextResponse.json({
        status: contract.esignatureStatus || "pending",
        signedAt: contract.signedAt?.toISOString() || null,
        source: "database",
        warning: "DocuSeal not configured, returning database status",
      })
    }

    // Get status from DocuSeal API
    try {
      const client = createDocuSealClient(apiKey, apiUrl)
      const docuSealStatus = await client.getSignatureStatus(contract.esignatureDocId)

      // Update database if status changed
      if (docuSealStatus.status !== contract.esignatureStatus) {
        await db.contract.update({
          where: { id: contract.id },
          data: {
            esignatureStatus: docuSealStatus.status,
            signedAt: docuSealStatus.signedAt ? new Date(docuSealStatus.signedAt) : null,
          },
        })
      }

      return NextResponse.json({
        status: docuSealStatus.status,
        signedAt: docuSealStatus.signedAt,
        signers: docuSealStatus.signers,
        source: "docuseal",
      })
    } catch (error) {
      console.error("Error fetching status from DocuSeal:", error)
      // Return database status as fallback
      return NextResponse.json({
        status: contract.esignatureStatus || "pending",
        signedAt: contract.signedAt?.toISOString() || null,
        source: "database",
        error: error instanceof Error ? error.message : "Failed to fetch from DocuSeal",
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
