// DocuSeal API client

export interface DocuSealConfig {
  apiKey: string
  apiUrl: string
}

export interface SendContractParams {
  pdfBuffer: Buffer
  signerEmail: string
  signerName: string
  title: string
  ceoEmail?: string // Optional CEO email - if provided, CEO signs in parallel with collaborator
  ceoName?: string
}

export interface DocuSealSubmitter {
  email: string
  name: string
  role?: string
}

export interface DocuSealSubmissionResponse {
  id: string
  status: string
}

export class DocuSealClient {
  private apiKey: string
  private apiUrl: string

  constructor(config: DocuSealConfig) {
    this.apiKey = config.apiKey
    this.apiUrl = config.apiUrl.replace(/\/$/, "") // Remove trailing slash
  }

  async sendContract(params: SendContractParams): Promise<{ signatureRequestId: string }> {
    try {
      console.log("📄 Preparing contract for DocuSeal...")
      console.log(`   Title: ${params.title}`)

      // Build submitters array (parallel signing - no order required)
      const submitters: DocuSealSubmitter[] = []
      
      if (params.ceoEmail && params.ceoName) {
        // CEO and collaborator sign in parallel
        submitters.push({
          email: params.ceoEmail,
          name: params.ceoName,
          role: "signer",
        })
        submitters.push({
          email: params.signerEmail,
          name: params.signerName,
          role: "signer",
        })
        console.log(`   CEO: ${params.ceoName} (${params.ceoEmail})`)
        console.log(`   Collaborator: ${params.signerName} (${params.signerEmail})`)
      } else {
        // Single signer (collaborator only)
        submitters.push({
          email: params.signerEmail,
          name: params.signerName,
          role: "signer",
        })
        console.log(`   Signer: ${params.signerName} (${params.signerEmail})`)
      }

      // Create form data for multipart upload
      // Using native FormData (available in Node.js 18+)
      const formData = new FormData()
      
      // Add PDF file as Buffer converted to Blob
      // Convert Buffer to Uint8Array first for proper type compatibility
      const pdfUint8Array = new Uint8Array(params.pdfBuffer)
      const pdfBlob = new Blob([pdfUint8Array], { type: "application/pdf" })
      formData.append("template[source]", pdfBlob, `contract-${Date.now()}.pdf`)

      // Add template name
      formData.append("template[name]", params.title)

      // Create submission with submitters
      // First, we need to create a template, then create a submission
      // DocuSeal API typically requires: create template -> create submission
      
      console.log("📤 Creating template in DocuSeal...")
      
      // Create template first
      const templateResponse = await fetch(`${this.apiUrl}/api/v1/templates`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          // Don't set Content-Type header - let fetch set it with boundary for FormData
        },
        body: formData,
      })

      if (!templateResponse.ok) {
        const errorText = await templateResponse.text()
        console.error("❌ DocuSeal template creation error:", errorText)
        throw new Error(`Failed to create template: ${templateResponse.status} ${errorText}`)
      }

      const templateData = await templateResponse.json()
      const templateId = templateData.id || templateData.template?.id

      if (!templateId) {
        throw new Error("Template ID not found in response")
      }

      console.log(`✅ Template created: ${templateId}`)

      // Now create submission with submitters
      console.log("📤 Creating submission in DocuSeal...")
      
      const submissionPayload = {
        template_id: templateId,
        submitters: submitters.map((submitter) => ({
          email: submitter.email,
          name: submitter.name,
          role: submitter.role || "signer",
        })),
      }

      const submissionResponse = await fetch(`${this.apiUrl}/api/v1/submissions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionPayload),
      })

      if (!submissionResponse.ok) {
        const errorText = await submissionResponse.text()
        console.error("❌ DocuSeal submission creation error:", errorText)
        throw new Error(`Failed to create submission: ${submissionResponse.status} ${errorText}`)
      }

      const submissionData = await submissionResponse.json()
      const submissionId = submissionData.id || submissionData.submission?.id

      if (!submissionId) {
        throw new Error("Submission ID not found in response")
      }

      console.log(`✅ Contract sent successfully!`)
      console.log(`   Submission ID: ${submissionId}`)

      return {
        signatureRequestId: submissionId,
      }
    } catch (error) {
      console.error("❌ DocuSeal API error:", error)
      if (error instanceof Error) {
        console.error("   Error message:", error.message)
        console.error("   Error stack:", error.stack)
      }
      throw new Error(
        `Failed to send contract via DocuSeal: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }

  async getSignatureStatus(submissionId: string): Promise<{
    status: string
    signedAt: string | null
    signers?: Array<{ email: string; name: string; status: string; signedAt?: string | null }>
  }> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/submissions/${submissionId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to get submission status: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      const submission = data.submission || data

      // Map DocuSeal status to our status format
      let status = "pending"
      if (submission.status === "completed" || submission.status === "finished") {
        status = "signed"
      } else if (submission.status === "declined" || submission.status === "rejected") {
        status = "declined"
      } else if (submission.status === "canceled" || submission.status === "cancelled") {
        status = "canceled"
      } else if (submission.status === "sent" || submission.status === "pending") {
        status = "sent"
      }

      // Get signed date (use completed_at or finished_at)
      const signedAt = submission.completed_at || submission.finished_at || submission.signed_at

      // Get individual signer statuses if available
      const signers = submission.submitters?.map((submitter: any) => ({
        email: submitter.email,
        name: submitter.name,
        status: submitter.status || "pending",
        signedAt: submitter.signed_at || null,
      }))

      return {
        status,
        signedAt: signedAt ? new Date(signedAt).toISOString() : null,
        signers,
      }
    } catch (error) {
      console.error("DocuSeal API error:", error)
      throw new Error(
        `Failed to get signature status: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }
}

export function createDocuSealClient(apiKey: string, apiUrl: string): DocuSealClient {
  return new DocuSealClient({ apiKey, apiUrl })
}
