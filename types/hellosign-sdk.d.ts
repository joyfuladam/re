declare module 'hellosign-sdk' {
  interface HelloSignConfig {
    key: string
  }

  interface HelloSignClient {
    signatureRequest: {
      send(params: any): Promise<any>
      get(signatureRequestId: string): Promise<any>
    }
  }

  function hellosign(config: HelloSignConfig): HelloSignClient
  export = hellosign
}

