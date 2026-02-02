/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure for Puppeteer in serverless environments
  experimental: {
    serverComponentsExternalPackages: ['puppeteer-core'],
  },
  // Increase function timeout for PDF generation
  serverRuntimeConfig: {
    maxDuration: 30, // 30 seconds for Vercel Pro, adjust as needed
  },
}

module.exports = nextConfig

