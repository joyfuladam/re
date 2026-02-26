import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { canAccessSong } from "@/lib/permissions"
import { convertHTMLToPDF } from "@/lib/pdf-converter"
import { buildContractData } from "@/lib/contract-data-builder"
import { contractConfig } from "@/lib/config"
import { hasTemplate, renderContractTemplate } from "@/lib/contract-templates"
import { generateContractHTML } from "@/lib/pdf-generator"
import { createSignWellClient } from "@/lib/signwell"

function buildFilename(contract: any): string {
  const collaboratorName = [
    contract.songCollaborator.collaborator.firstName,
    contract.songCollaborator.collaborator.middleName,
    contract.songCollaborator.collaborator.lastName,
  ]
    .filter(Boolean)
    .join("_")
    .replace(/\s+/g, "_")

  return `${contract.templateType}_${contract.song.title}_${collaboratorName}.pdf`
    .replace(/[^a-zA-Z0-9_\-.]/g, "_")
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const contract = await db.contract.findUnique({
      where: { id: params.id },
      include: {
        song: {
          include: {
            songCollaborators: {
              include: { collaborator: true },
            },
          },
        },
        songCollaborator: {
          include: { collaborator: true },
        },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 })
    }

    const canAccess = await canAccessSong(session, contract.songId)
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const filename = buildFilename(contract)

    // If we already have the signed PDF stored, return it directly
    if (contract.signedPdfData) {
      return new NextResponse(new Uint8Array(contract.signedPdfData), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="signed_${filename}"`,
        },
      })
    }

    // On-demand fetch: contract is signed but PDF wasn't stored (signed before this feature)
    if (contract.esignatureStatus === "signed" && contract.esignatureDocId) {
      const apiKey = process.env.SIGNWELL_API_KEY
      if (apiKey) {
        try {
          const client = createSignWellClient(apiKey)
          const pdfBuffer = await client.downloadSignedPdf(contract.esignatureDocId)

          await db.contract.update({
            where: { id: contract.id },
            data: { signedPdfData: pdfBuffer },
          })

          return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="signed_${filename}"`,
            },
          })
        } catch (fetchError) {
          console.warn(`Could not fetch signed PDF from SignWell for contract ${contract.id}:`, fetchError)
        }
      }
    }

    // Fallback: generate unsigned PDF from template
    const contractData = await buildContractData(
      contract.song,
      contract.songCollaborator,
      contract.song.songCollaborators,
      contractConfig,
      contract.templateType
    )

    let contractHTML: string
    if (hasTemplate(contract.templateType)) {
      contractHTML = renderContractTemplate(contract.templateType, contractData as any)
      contractHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
        body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.5; max-width: 800px; margin: 0 auto; padding: 40px; }
    h1 { text-align: center; margin-bottom: 30px; font-size: 14pt; }
    h2 { margin-top: 30px; margin-bottom: 15px; font-size: 11pt; }
    h3 { margin-top: 20px; margin-bottom: 10px; font-size: 10pt; }
    .contract-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 9pt; }
    .contract-table th, .contract-table td { border: 1px solid #000; padding: 6px 8px; }
    .contract-table th { background-color: #f0f0f0; font-weight: bold; }
    p { margin-bottom: 10px; text-align: justify; }
    .indent { margin-left: 0.5in; text-align: justify; }
    ul, ol { margin-left: 20px; }
  </style>
</head>
<body>${contractHTML}</body>
</html>`
    } else {
      contractHTML = generateContractHTML(contractData)
    }

    const pdfBuffer = await convertHTMLToPDF(contractHTML)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Error downloading contract:", error)
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    )
  }
}
