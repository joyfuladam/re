import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { createHelloSignClient } from "@/lib/hellosign"
import { z } from "zod"

const sendContractSchema = z.object({
  contractId: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validated = sendContractSchema.parse(body)

    // Get contract
    const contract = await db.contract.findUnique({
      where: { id: validated.contractId },
      include: {
        song: true,
        songCollaborator: {
          include: {
            collaborator: true,
          },
        },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 })
    }

    if (!contract.songCollaborator.collaborator.email) {
      return NextResponse.json(
        { error: "Collaborator email is required" },
        { status: 400 }
      )
    }

    // Initialize HelloSign client
    const apiKey = process.env.HELLOSIGN_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "HelloSign API key not configured" },
        { status: 500 }
      )
    }

    const client = createHelloSignClient(apiKey)

    // Send contract for signature
    // Note: In production, you'd need to convert HTML to PDF first
    const result = await client.sendContract({
      contractHTML: "", // Would be the generated PDF
      signerEmail: contract.songCollaborator.collaborator.email,
      signerName: [contract.songCollaborator.collaborator.firstName, contract.songCollaborator.collaborator.middleName, contract.songCollaborator.collaborator.lastName].filter(Boolean).join(" "),
      title: `Contract for ${contract.song.title}`,
    })

    // Update contract with signature request ID
    await db.contract.update({
      where: { id: validated.contractId },
      data: {
        esignatureDocId: result.signatureRequestId,
        esignatureStatus: "sent",
      },
    })

    return NextResponse.json({ success: true, signatureRequestId: result.signatureRequestId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error sending contract:", error)
    return NextResponse.json(
      { error: "Failed to send contract" },
      { status: 500 }
    )
  }
}

