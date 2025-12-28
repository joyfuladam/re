import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateContractHTML, ContractData } from "@/lib/pdf-generator"
import { getContractType } from "@/lib/roles"
import { canAccessSong, isAdmin } from "@/lib/permissions"
import { z } from "zod"
import { hasTemplate, renderContractTemplate } from "@/lib/contract-templates"
import { buildContractData } from "@/lib/contract-data-builder"
import { contractConfig } from "@/lib/config"

const generateContractSchema = z.object({
  songId: z.string(),
  collaboratorId: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validated = generateContractSchema.parse(body)

    // Check if user can access this song
    const canAccess = await canAccessSong(session, validated.songId)
    if (!canAccess) {
      return NextResponse.json(
        { error: "Forbidden: You don't have access to this song" },
        { status: 403 }
      )
    }

    // Get song and collaborator data
    const song = await db.song.findUnique({
      where: { id: validated.songId },
      include: {
        songCollaborators: {
          include: {
            collaborator: true,
          },
        },
      },
    })

    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 })
    }

    const songCollaborator = song.songCollaborators.find(
      (sc) => sc.collaboratorId === validated.collaboratorId
    )

    if (!songCollaborator) {
      return NextResponse.json(
        { error: "Collaborator not found on this song" },
        { status: 404 }
      )
    }

    // Check if splits are locked
    if (!song.masterLocked) {
      return NextResponse.json(
        { error: "Master splits must be locked before generating contracts" },
        { status: 400 }
      )
    }

    // Use roleInSong (role for this specific song), not the collaborator's base role
    const roleInSong = songCollaborator.roleInSong
    const contractType = getContractType(roleInSong) // Use the role for THIS song

    // Build contract data using the builder
    const contractData = await buildContractData(
      song,
      songCollaborator,
      song.songCollaborators,
      contractConfig
    )

    // Try template-based generation first, fall back to legacy HTML generation
    let contractHTML: string
    try {
      if (hasTemplate(contractType)) {
        // Use template-based generation
        contractHTML = renderContractTemplate(contractType, contractData as any)
        
        // Wrap in HTML document structure
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
                margin: 20px 0;
                table-layout: fixed;
              }
              .contract-table th,
              .contract-table td {
                border: 1px solid #000;
                padding: 8px;
                text-align: left;
                word-wrap: break-word;
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
              p {
                margin-bottom: 10px;
              }
              ul, ol {
                margin-left: 20px;
                margin-bottom: 10px;
              }
            </style>
          </head>
          <body>
            ${contractHTML}
          </body>
          </html>
        `
      } else {
        // Fall back to legacy HTML generation
        contractHTML = generateContractHTML(contractData)
      }
    } catch (templateError) {
      console.error("Template generation error, falling back to legacy:", templateError)
      // Fall back to legacy HTML generation on error
      contractHTML = generateContractHTML(contractData)
    }

    // Create contract record
    const contract = await db.contract.create({
      data: {
        songId: validated.songId,
        collaboratorId: validated.collaboratorId,
        songCollaboratorId: songCollaborator.id,
        templateType: contractType,
        esignatureStatus: "pending",
      },
    })

    return NextResponse.json({
      contractId: contract.id,
      html: contractHTML,
      contractType,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error generating contract:", error)
    return NextResponse.json(
      { error: "Failed to generate contract" },
      { status: 500 }
    )
  }
}

