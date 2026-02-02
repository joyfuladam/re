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
  draft?: boolean // If true, creates a draft without sending emails
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

      // If draft mode, create a template instead of a submission
      // This works on free edition since send_email: false requires Pro
      if (params.draft) {
        return await this.createDraftTemplate(params)
      }

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

      // Create submission directly with PDF (DocuSeal doesn't require templates)
      // Using FormData to send PDF and submission data together
      const formData = new FormData()
      
      // Add PDF file as Buffer converted to Blob
      // Convert Buffer to Uint8Array first for proper type compatibility
      const pdfUint8Array = new Uint8Array(params.pdfBuffer)
      const pdfBlob = new Blob([pdfUint8Array], { type: "application/pdf" })
      formData.append("submission[source]", pdfBlob, `contract-${Date.now()}.pdf`)

      // Add submission name/title
      formData.append("submission[name]", params.title)

      // Add submitters as array fields per DocuSeal API format
      submitters.forEach((submitter, index) => {
        formData.append(`submission[submitters_attributes][${index}][email]`, submitter.email)
        formData.append(`submission[submitters_attributes][${index}][name]`, submitter.name)
        if (submitter.role) {
          formData.append(`submission[submitters_attributes][${index}][role]`, submitter.role)
        }
      })

      console.log("📤 Creating submission directly in DocuSeal...")
      
      // Create submission directly with PDF
      // Use X-Auth-Token header per DocuSeal API documentation
      const submissionResponse = await fetch(`${this.apiUrl}/api/submissions/pdf`, {
        method: "POST",
        headers: {
          "X-Auth-Token": this.apiKey,
          // Don't set Content-Type header - let fetch set it with boundary for FormData
        },
        body: formData,
      })

      if (!submissionResponse.ok) {
        const errorText = await submissionResponse.text()
        console.error("❌ DocuSeal submission creation error:", errorText)
        throw new Error(`Failed to create submission: ${submissionResponse.status} ${errorText}`)
      }

      const submissionData = await submissionResponse.json()
      const submissionId = submissionData.id || submissionData.submission?.id || submissionData.data?.id

      if (!submissionId) {
        console.error("Response data:", JSON.stringify(submissionData, null, 2))
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

  /**
   * Create a template from PDF for draft mode
   * This works on free edition since send_email: false requires Pro
   * User can then manually create submission from template in DocuSeal UI
   */
  private async createDraftTemplate(params: SendContractParams): Promise<{ signatureRequestId: string }> {
    try {
      console.log("📝 Creating template for draft mode...")
      console.log("   Note: Draft mode creates a template instead of submission")
      console.log("   You can create a submission from this template in DocuSeal UI")

      // Create template from PDF
      const formData = new FormData()
      
      // Add PDF file as Buffer converted to Blob
      const pdfUint8Array = new Uint8Array(params.pdfBuffer)
      const pdfBlob = new Blob([pdfUint8Array], { type: "application/pdf" })
      formData.append("template[source]", pdfBlob, `contract-${Date.now()}.pdf`)

      // Add template name/title
      formData.append("template[name]", params.title)

      console.log("📤 Uploading PDF as template to DocuSeal...")
      
      // Create template from PDF
      // Use X-Auth-Token header per DocuSeal API documentation
      const templateResponse = await fetch(`${this.apiUrl}/api/templates`, {
        method: "POST",
        headers: {
          "X-Auth-Token": this.apiKey,
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
      const templateId = templateData.id || templateData.template?.id || templateData.data?.id

      if (!templateId) {
        console.error("Response data:", JSON.stringify(templateData, null, 2))
        throw new Error("Template ID not found in response")
      }

      console.log(`✅ Draft template created successfully!`)
      console.log(`   Template ID: ${templateId}`)
      console.log(`   📝 Log into DocuSeal to create submission from this template`)

      // Return template ID as signatureRequestId for tracking
      // Note: This is actually a template ID, not a submission ID
      return {
        signatureRequestId: `template_${templateId}`,
      }
    } catch (error) {
      console.error("❌ DocuSeal template creation error:", error)
      if (error instanceof Error) {
        console.error("   Error message:", error.message)
        console.error("   Error stack:", error.stack)
      }
      throw new Error(
        `Failed to create draft template: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }

  async getSignatureStatus(submissionId: string): Promise<{
    status: string
    signedAt: string | null
    signers?: Array<{ email: string; name: string; status: string; signedAt?: string | null }>
  }> {
    try {
      const response = await fetch(`${this.apiUrl}/api/submissions/${submissionId}`, {
        method: "GET",
        headers: {
          "X-Auth-Token": this.apiKey,
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
