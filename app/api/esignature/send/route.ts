import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { createDocuSealClient } from "@/lib/docuseal"
import { convertHTMLToPDF } from "@/lib/pdf-converter"
import { hasTemplate, renderContractTemplate } from "@/lib/contract-templates"
import { buildContractData } from "@/lib/contract-data-builder"
import { contractConfig } from "@/lib/config"
import { generateContractHTML } from "@/lib/pdf-generator"
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

    // Get contract with full relations
    const contract = await db.contract.findUnique({
      where: { id: validated.contractId },
      include: {
        song: {
          include: {
            songCollaborators: {
              include: {
                collaborator: true,
              },
            },
          },
        },
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

    // Allow re-sending if status is "sent" but not if "signed"
    // If already signed, don't allow re-sending
    if (contract.esignatureStatus === "signed") {
      return NextResponse.json(
        { error: "Contract has already been signed and cannot be re-sent" },
        { status: 400 }
      )
    }

    // If re-sending, we'll create a new signature request
    // The old one will remain in DocuSeal but we'll track the new one

    // Initialize DocuSeal client
    const apiKey = process.env.DOCUSEAL_API_KEY
    const apiUrl = process.env.DOCUSEAL_API_URL
    if (!apiKey) {
      console.error("❌ DOCUSEAL_API_KEY not found in environment variables")
      return NextResponse.json(
        { error: "DocuSeal API key not configured" },
        { status: 500 }
      )
    }
    if (!apiUrl) {
      console.error("❌ DOCUSEAL_API_URL not found in environment variables")
      return NextResponse.json(
        { error: "DocuSeal API URL not configured" },
        { status: 500 }
      )
    }
    console.log("🔑 DocuSeal API key loaded (length:", apiKey.length, "chars)")
    console.log("🔗 DocuSeal API URL:", apiUrl)

    // Generate contract HTML (reuse logic from generate endpoint)
    const contractData = await buildContractData(
      contract.song,
      contract.songCollaborator,
      contract.song.songCollaborators,
      contractConfig,
      contract.templateType
    )

    let contractHTML: string
    try {
      if (hasTemplate(contract.templateType)) {
        contractHTML = renderContractTemplate(contract.templateType, contractData as any)
        // Wrap in HTML document structure with styling
        contractHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                font-family: 'Times New Roman', serif;
                line-height: 1.6;
                max-width: 800px;
                margin: 0 auto;
                padding: 40px;
              }
              h1 {
                text-align: center;
                margin-bottom: 30px;
              }
              h2 {
                margin-top: 30px;
                margin-bottom: 15px;
              }
              h3 {
                margin-top: 20px;
                margin-bottom: 10px;
              }
              .section {
                margin-bottom: 20px;
              }
              .signature-line {
                margin-top: 60px;
                border-top: 1px solid #000;
                width: 300px;
              }
              .contract-table {
                width: 100%;
                border-collapse: collapse;
                border-spacing: 0;
                margin: 20px 0;
                table-layout: fixed;
              }
              .contract-table th,
              .contract-table td {
                border: 1px solid #000;
                padding: 8px;
                text-align: left;
                word-wrap: break-word;
                margin: 0;
                vertical-align: top;
              }
              .contract-table th {
                background-color: #f0f0f0;
                font-weight: bold;
              }
              .contract-table thead {
                display: table-header-group;
              }
              .contract-table tbody {
                display: table-row-group;
              }
              .contract-table thead tr,
              .contract-table tbody tr {
                margin: 0;
                padding: 0;
              }
              .contract-table thead tr:last-child th {
                border-bottom-width: 1px;
              }
              .contract-table tbody tr:first-child td {
                border-top-width: 0;
              }
              p {
                margin-bottom: 10px;
              }
              ul, ol {
                margin-left: 20px;
                margin-bottom: 10px;
              }
              /* DocuSeal signature fields will be added via API */
              span[style*="color: white"] {
                color: white !important;
                background: white !important;
              }
            </style>
          </head>
          <body>
            ${contractHTML}
          </body>
          </html>
        `
      } else {
        contractHTML = generateContractHTML(contractData)
      }
    } catch (templateError) {
      console.error("Template generation error:", templateError)
      contractHTML = generateContractHTML(contractData)
    }

    // Convert HTML to PDF
    console.log("📝 Converting contract HTML to PDF...")
    const pdfBuffer = await convertHTMLToPDF(contractHTML)
    console.log(`✅ PDF generated (${pdfBuffer.length} bytes)`)

    // Initialize DocuSeal client and send contract
    const client = createDocuSealClient(apiKey, apiUrl)
    
    const signerName = [
      contract.songCollaborator.collaborator.firstName,
      contract.songCollaborator.collaborator.middleName,
      contract.songCollaborator.collaborator.lastName,
    ]
      .filter(Boolean)
      .join(" ")

    console.log(`🚀 Sending contract to DocuSeal...`)
    const result = await client.sendContract({
      pdfBuffer,
      signerEmail: contract.songCollaborator.collaborator.email,
      signerName,
      title: `Contract for ${contract.song.title}`,
      ceoEmail: contractConfig.publisher.managerEmail,
      ceoName: contractConfig.publisher.managerName,
    })

    console.log(`💾 Updating contract in database...`)
    // Update contract with signature request ID and status
    await db.contract.update({
      where: { id: validated.contractId },
      data: {
        esignatureDocId: result.signatureRequestId,
        esignatureStatus: "sent",
        signerEmail: contract.songCollaborator.collaborator.email,
        // Reset signedAt if re-sending
        signedAt: null,
      },
    })

    console.log(`✅ Contract sent and saved successfully!`)
    return NextResponse.json({ success: true, signatureRequestId: result.signatureRequestId })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error sending contract:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to send contract"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

