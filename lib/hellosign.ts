// HelloSign/Dropbox Sign API client
import hellosign from "hellosign-sdk"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

export interface HelloSignConfig {
  apiKey: string
}

export interface SendContractParams {
  pdfBuffer: Buffer
  signerEmail: string
  signerName: string
  title: string
  ceoEmail?: string // Optional CEO email - if provided, CEO signs first as signer1
  ceoName?: string
}

export class HelloSignClient {
  private apiKey: string
  private client: any

  constructor(config: HelloSignConfig) {
    this.apiKey = config.apiKey
    this.client = hellosign({ key: this.apiKey })
  }

  async sendContract(params: SendContractParams): Promise<{ signatureRequestId: string }> {
    // Create a temporary file for the PDF
    const tempFilePath = path.join(os.tmpdir(), `contract-${Date.now()}.pdf`)
    let tempFileCreated = false
    // Allow explicit control via environment variable
    // Default to test mode (required for free tier accounts)
    // Only disable if explicitly set to "false" AND user has paid plan
    const testMode = process.env.HELLOSIGN_TEST_MODE === "false" ? false : true

    try {
      console.log("📄 Creating PDF file...")
      // Write PDF buffer to temporary file
      fs.writeFileSync(tempFilePath, params.pdfBuffer)
      tempFileCreated = true
      console.log(`✅ PDF file created: ${tempFilePath} (${params.pdfBuffer.length} bytes)`)

      console.log("📤 Sending contract to HelloSign...")
      console.log(`   Test mode: ${testMode}`)
      console.log(`   Title: ${params.title}`)

      // HelloSign SDK expects file paths in the files array
      // Build request params - SDK expects test_mode as number 1, not boolean
      // If CEO email is provided, CEO signs first (signer1), then collaborator (signer2)
      const signers: any[] = []
      
      if (params.ceoEmail && params.ceoName) {
        // CEO signs first as signer1
        signers.push({
          email_address: params.ceoEmail,
          name: params.ceoName,
          order: 0, // Signs first
        })
        // Collaborator signs second as signer2
        signers.push({
          email_address: params.signerEmail,
          name: params.signerName,
          order: 1, // Signs second
        })
        console.log(`   CEO (signer1): ${params.ceoName} (${params.ceoEmail})`)
        console.log(`   Collaborator (signer2): ${params.signerName} (${params.signerEmail})`)
      } else {
        // Single signer (collaborator only)
        signers.push({
          email_address: params.signerEmail,
          name: params.signerName,
        })
        console.log(`   Signer: ${params.signerName} (${params.signerEmail})`)
      }

      const requestParams: any = {
        subject: params.title,
        message: "Please sign this contract",
        signers,
        files: [tempFilePath],
        use_text_tags: 1, // Enable text tag parsing in HelloSign (use 1 instead of true for form data)
      }

      // SDK expects test_mode as number 1 (not boolean true) per SDK documentation
      if (testMode) {
        requestParams.test_mode = 1
      }

      const result = await this.client.signatureRequest.send(requestParams)

      const signatureRequestId = result.signature_request.signature_request_id
      console.log(`✅ Contract sent successfully!`)
      console.log(`   Signature Request ID: ${signatureRequestId}`)
      console.log(`   Note: Check the "${testMode ? "Test" : "Live"}" tab in HelloSign dashboard`)

      return {
        signatureRequestId,
      }
    } catch (error) {
      console.error("❌ HelloSign API error:", error)
      if (error instanceof Error) {
        console.error("   Error message:", error.message)
        console.error("   Error stack:", error.stack)
      }
      throw new Error(
        `Failed to send contract via HelloSign: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    } finally {
      // Clean up temporary file
      if (tempFileCreated && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath)
          console.log("🧹 Temporary file cleaned up")
        } catch (cleanupError) {
          console.warn("⚠️ Failed to clean up temporary file:", cleanupError)
        }
      }
    }
  }

  async getSignatureStatus(signatureRequestId: string): Promise<{
    status: string
    signedAt: string | null
  }> {
    try {
      const result = await this.client.signatureRequest.get(signatureRequestId)
      const signatureRequest = result.signature_request

      return {
        status: signatureRequest.is_complete
          ? "signed"
          : signatureRequest.is_declined
          ? "declined"
          : "pending",
        signedAt: signatureRequest.signed_at
          ? new Date(signatureRequest.signed_at * 1000).toISOString()
          : null,
      }
    } catch (error) {
      console.error("HelloSign API error:", error)
      throw new Error(
        `Failed to get signature status: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }
}

export function createHelloSignClient(apiKey: string): HelloSignClient {
  return new HelloSignClient({ apiKey })
}

