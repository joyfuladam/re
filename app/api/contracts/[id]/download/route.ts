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
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    // Generate contract HTML
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
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px; }
    h1 { text-align: center; margin-bottom: 30px; }
    h2 { margin-top: 30px; margin-bottom: 15px; }
    .contract-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .contract-table th, .contract-table td { border: 1px solid #000; padding: 8px; }
    .contract-table th { background-color: #f0f0f0; font-weight: bold; }
  </style>
</head>
<body>${contractHTML}</body>
</html>`
    } else {
      contractHTML = generateContractHTML(contractData)
    }

    // Convert to PDF
    const pdfBuffer = await convertHTMLToPDF(contractHTML)

    // Generate filename
    const collaboratorName = [
      contract.songCollaborator.collaborator.firstName,
      contract.songCollaborator.collaborator.middleName,
      contract.songCollaborator.collaborator.lastName,
    ]
      .filter(Boolean)
      .join("_")
      .replace(/\s+/g, "_")

    const filename = `${contract.templateType}_${contract.song.title}_${collaboratorName}.pdf`
      .replace(/[^a-zA-Z0-9_\-.]/g, "_")

    // Convert Buffer to Uint8Array for NextResponse
    const pdfArray = new Uint8Array(pdfBuffer)

    // Return PDF as download
    return new NextResponse(pdfArray, {
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
