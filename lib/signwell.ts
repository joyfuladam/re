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

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/4c8d8774-18d6-406e-b702-2dc324f31e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/signwell.ts:77',message:'PDF buffer converted to base64',data:{pdfSize:params.pdfBuffer.length,base64Length:pdfBase64.length,pdfPreview:params.pdfBuffer.toString('utf8',0,Math.min(500,params.pdfBuffer.length))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      // Check if PDF contains expected text tags
      const pdfText = params.pdfBuffer.toString('utf8')
      const hasRecipient1Tag = pdfText.includes('[sig|req|signer1]') || pdfText.includes('sig|req|signer1')
      const hasRecipient2Tag = pdfText.includes('[sig|req|signer2]') || pdfText.includes('sig|req|signer2')
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/4c8d8774-18d6-406e-b702-2dc324f31e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/signwell.ts:84',message:'Checking PDF for text tags',data:{hasRecipient1Tag,hasRecipient2Tag,pdfTextSample:pdfText.substring(0,1000)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      // Create document payload
      // SignWell API: fields should be nested inside recipients
      // Text tags in PDF (like [sig|req|signer1]) will be auto-detected
      // Create recipients (simple structure - no fields nested)
      const recipients = signers.map((signer, index) => {
        const recipientId = `signer${index + 1}`
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/4c8d8774-18d6-406e-b702-2dc324f31e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/signwell.ts:95',message:'Creating recipient',data:{recipientId,email:signer.email,name:signer.name,role:signer.role,index},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        return {
          id: recipientId,
          email: signer.email,
          name: signer.name,
          // Note: role is not in the API spec, removing it
        }
      })

      // When text_tags: true is enabled, SignWell will auto-detect fields from text tags in the PDF
      // According to SignWell docs: https://developers.signwell.com/reference/enabling-text-tags
      // We should NOT provide explicit coordinates - SignWell will use the text tag positions
      // Text tags in PDF should be in format: [sig|req|signer1] and [date|req|signer1]
      // Do NOT include 'fields' property - SignWell will auto-detect from text tags

      const documentPayload: any = {
        name: params.title,
        files: [
          {
            name: `${params.title}.pdf`,
            file_base64: pdfBase64,
          }
        ],
        recipients: recipients,
        text_tags: true, // Enable text tag detection from PDF - SignWell will auto-detect fields
        // Note: When text_tags is true, we don't provide explicit fields/coordinates
        // SignWell will detect fields from text tags like [sig|req|recipient_1] and [date|req|recipient_1]
        send: !params.draft,
      }

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/4c8d8774-18d6-406e-b702-2dc324f31e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/signwell.ts:115',message:'Document payload created with text_tags enabled',data:{recipientsCount:recipients.length,recipients:recipients.map((r:any)=>({id:r.id,email:r.email})),filesCount:documentPayload.files.length,textTagsEnabled:documentPayload.text_tags},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // Add test mode parameter per SignWell API documentation
      // Reference: https://developers.signwell.com/reference/getting-started-with-your-api-1#test-mode
      if (testMode) {
        documentPayload.test_mode = true
        console.log(`   ℹ️  Test mode enabled - document will be created in test environment`)
      }

      console.log("📤 Creating document in SignWell...")
      console.log("📋 Payload structure:", JSON.stringify({
        name: documentPayload.name,
        files_count: documentPayload.files.length,
        recipients_count: documentPayload.recipients.length,
        recipients: documentPayload.recipients.map((r: any) => ({
          id: r.id,
          email: r.email,
        })),
        text_tags_enabled: documentPayload.text_tags,
      }, null, 2))
      
      // #region agent log
      const payloadForLog = JSON.stringify(documentPayload)
      fetch('http://127.0.0.1:7243/ingest/4c8d8774-18d6-406e-b702-2dc324f31e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/signwell.ts:128',message:'Sending request to SignWell API',data:{url:`${this.apiUrl}/v1/documents`,payloadSize:payloadForLog.length,recipients:documentPayload.recipients,hasFieldsInRecipients:documentPayload.recipients.some((r:any)=>r.fields),fullPayload:documentPayload},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
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

      // Read response body once (can only be read once)
      const responseText = await documentResponse.text().catch(() => '')
      const responseStatus = documentResponse.status

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/4c8d8774-18d6-406e-b702-2dc324f31e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/signwell.ts:142',message:'SignWell API response received',data:{status:responseStatus,ok:documentResponse.ok,responseText,headers:Object.fromEntries(documentResponse.headers.entries())},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (!documentResponse.ok) {
        let parsedError = null
        try { parsedError = JSON.parse(responseText) } catch {}
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/4c8d8774-18d6-406e-b702-2dc324f31e07',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/signwell.ts:145',message:'SignWell API error response',data:{status:documentResponse.status,errorText:responseText,parsedError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        console.error("❌ SignWell document creation error:", responseText)
        throw new Error(`Failed to create document: ${documentResponse.status} ${responseText}`)
      }

      // Parse the already-read response text as JSON
      let documentData
      try {
        documentData = JSON.parse(responseText)
      } catch (parseError) {
        console.error("❌ Failed to parse SignWell response as JSON:", responseText)
        throw new Error(`Failed to parse response: ${responseText}`)
      }
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
