// SignWell API client
// Documentation: https://developers.signwell.com/reference/getting-started-with-your-api-1

export interface SignWellConfig {
  apiKey: string
  apiUrl?: string // Optional, defaults to https://api.signwell.com
}

export interface SendContractParams {
  pdfBuffer: Buffer
  signerEmail: string
  signerName: string
  title: string
  ceoEmail?: string // Optional CEO email - if provided, CEO signs in parallel with collaborator
  ceoName?: string
  draft?: boolean // If true, creates a draft without sending emails
}

export interface SignWellSigner {
  email: string
  name: string
  role?: string
}

export class SignWellClient {
  private apiKey: string
  private apiUrl: string

  constructor(config: SignWellConfig) {
    this.apiKey = config.apiKey
    // Default to SignWell API base URL if not provided
    // Based on documentation: https://www.signwell.com/api/v1/hooks/
    this.apiUrl = (config.apiUrl || "https://www.signwell.com/api").replace(/\/$/, "") // Remove trailing slash
  }

  async sendContract(params: SendContractParams): Promise<{ signatureRequestId: string }> {
    try {
      // Check for test mode - SignWell may use separate test API keys or account settings
      // Default to test mode if not explicitly disabled (safer for development)
      const testMode = process.env.SIGNWELL_TEST_MODE === "false" ? false : true
      
      console.log("📄 Preparing contract for SignWell...")
      console.log(`   Title: ${params.title}`)
      if (testMode) {
        console.log(`   ⚠️  Test mode: ENABLED (set SIGNWELL_TEST_MODE=false to disable)`)
        console.log(`   Note: SignWell test mode depends on your account settings`)
      }

      // Build signers array (parallel signing - no order required)
      const signers: SignWellSigner[] = []
      
      if (params.ceoEmail && params.ceoName) {
        // CEO and collaborator sign in parallel
        signers.push({
          email: params.ceoEmail,
          name: params.ceoName,
          role: "signer",
        })
        signers.push({
          email: params.signerEmail,
          name: params.signerName,
          role: "signer",
        })
        console.log(`   CEO: ${params.ceoName} (${params.ceoEmail})`)
        console.log(`   Collaborator: ${params.signerName} (${params.signerEmail})`)
      } else {
        // Single signer (collaborator only)
        signers.push({
          email: params.signerEmail,
          name: params.signerName,
          role: "signer",
        })
        console.log(`   Signer: ${params.signerName} (${params.signerEmail})`)
      }

      // Convert PDF buffer to base64 for SignWell API
      const pdfBase64 = params.pdfBuffer.toString('base64')

      // Create document payload
      // SignWell API expects files array with file_base64 and recipients with fields
      const documentPayload: any = {
        name: params.title,
        // SignWell expects files as an array with file_base64 (not file)
        // Files need id field for field references
        files: [
          {
            id: "file_1", // File ID for field references
            name: `${params.title}.pdf`,
            file_base64: pdfBase64, // Use file_base64 instead of file
          }
        ],
        // Recipients need id field and fields associated
        // SignWell requires fields array with proper structure
        // Fields should reference the file and include type and position
        recipients: signers.map((signer, index) => {
          const signerTag = `signer${index + 1}` // Matches [sig|req|signer1], [sig|req|signer2], etc.
          return {
            id: `recipient_${index + 1}`, // SignWell requires id field
            email: signer.email,
            name: signer.name,
            role: signer.role || "signer",
            // Fields array - each field must have type, file reference, and position
            fields: [
              {
                type: "signature",
                file_id: "file_1", // Reference to file in files array
                page: 1, // Page number (1-indexed)
                x: 100, // X coordinate
                y: 700, // Y coordinate (from bottom of page)
                width: 200,
                height: 50,
                // Optional: text tag if PDF contains SignWell text tags
                // text_tag: `sig|req|${signerTag}`,
              }
            ],
          }
        }),
        // If draft mode, don't send immediately
        send: !params.draft,
      }

      // Add test mode parameter per SignWell API documentation
      // Reference: https://developers.signwell.com/reference/getting-started-with-your-api-1#test-mode
      if (testMode) {
        documentPayload.test_mode = true
        console.log(`   ℹ️  Test mode enabled - document will be created in test environment`)
      }

      console.log("📤 Creating document in SignWell...")
      
      // Create document via SignWell API
      // POST /v1/documents
      const documentResponse = await fetch(`${this.apiUrl}/v1/documents`, {
        method: "POST",
        headers: {
          "X-Api-Key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(documentPayload),
      })

      if (!documentResponse.ok) {
        const errorText = await documentResponse.text()
        console.error("❌ SignWell document creation error:", errorText)
        throw new Error(`Failed to create document: ${documentResponse.status} ${errorText}`)
      }

      const documentData = await documentResponse.json()
      const documentId = documentData.id || documentData.document?.id || documentData.data?.id

      if (!documentId) {
        console.error("Response data:", JSON.stringify(documentData, null, 2))
        throw new Error("Document ID not found in response")
      }

      if (params.draft) {
        console.log(`✅ Draft document created successfully!`)
        console.log(`   Document ID: ${documentId}`)
        console.log(`   📝 Log into SignWell to review and send manually`)
      } else {
        console.log(`✅ Contract sent successfully!`)
        console.log(`   Document ID: ${documentId}`)
      }

      return {
        signatureRequestId: documentId.toString(),
      }
    } catch (error) {
      console.error("❌ SignWell API error:", error)
      if (error instanceof Error) {
        console.error("   Error message:", error.message)
        console.error("   Error stack:", error.stack)
      }
      throw new Error(
        `Failed to send contract via SignWell: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }

  async getSignatureStatus(documentId: string): Promise<{
    status: string
    signedAt: string | null
    signers?: Array<{ email: string; name: string; status: string; signedAt?: string | null }>
  }> {
    try {
      // Get document status from SignWell API
      // GET /v1/documents/{id}
      const response = await fetch(`${this.apiUrl}/v1/documents/${documentId}`, {
        method: "GET",
        headers: {
          "X-Api-Key": this.apiKey,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to get document status: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      const document = data.document || data.data || data

      // Map SignWell status to our status format
      let status = "pending"
      if (document.status === "completed" || document.status === "signed") {
        status = "signed"
      } else if (document.status === "declined" || document.status === "rejected") {
        status = "declined"
      } else if (document.status === "canceled" || document.status === "cancelled") {
        status = "canceled"
      } else if (document.status === "sent" || document.status === "pending") {
        status = "sent"
      }

      const signedAt = document.completed_at || document.signed_at || document.finished_at

      // Get individual signer statuses if available
      const signers = document.recipients?.map((recipient: any) => ({
        email: recipient.email,
        name: recipient.name,
        status: recipient.status || "pending",
        signedAt: recipient.signed_at || null,
      }))

      return {
        status,
        signedAt: signedAt ? new Date(signedAt).toISOString() : null,
        signers,
      }
    } catch (error) {
      console.error("SignWell API error:", error)
      throw new Error(
        `Failed to get signature status: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }
}

export function createSignWellClient(apiKey: string, apiUrl?: string): SignWellClient {
  return new SignWellClient({ apiKey, apiUrl })
}
