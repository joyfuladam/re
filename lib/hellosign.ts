// HelloSign/Dropbox Sign API client
// Note: This is a placeholder implementation
// You'll need to install the HelloSign SDK: npm install hellosign-sdk

export interface HelloSignConfig {
  apiKey: string
}

export interface SendContractParams {
  contractHTML: string
  signerEmail: string
  signerName: string
  title: string
}

export class HelloSignClient {
  private apiKey: string

  constructor(config: HelloSignConfig) {
    this.apiKey = config.apiKey
  }

  async sendContract(params: SendContractParams): Promise<{ signatureRequestId: string }> {
    // Placeholder implementation
    // In production, you would use the HelloSign SDK:
    // const hellosign = require('hellosign-sdk')({ key: this.apiKey });
    // const result = await hellosign.signatureRequest.createEmbedded({
    //   test_mode: process.env.NODE_ENV !== 'production',
    //   client_id: process.env.HELLOSIGN_CLIENT_ID,
    //   subject: params.title,
    //   message: 'Please sign this contract',
    //   signers: [{
    //     email_address: params.signerEmail,
    //     name: params.signerName,
    //   }],
    //   files: [params.contractHTML], // Convert HTML to PDF first
    // });

    // For now, return a mock response
    return {
      signatureRequestId: `mock_${Date.now()}`,
    }
  }

  async getSignatureStatus(signatureRequestId: string): Promise<{
    status: string
    signedAt: string | null
  }> {
    // Placeholder implementation
    // In production:
    // const result = await hellosign.signatureRequest.get(signatureRequestId);
    // return {
    //   status: result.signature_request.status,
    //   signedAt: result.signature_request.signed_at,
    // };

    return {
      status: "pending",
      signedAt: null,
    }
  }
}

export function createHelloSignClient(apiKey: string): HelloSignClient {
  return new HelloSignClient({ apiKey })
}

