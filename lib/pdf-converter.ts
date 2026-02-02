import puppeteer from "puppeteer"

/**
 * Convert HTML string to PDF buffer
 * Uses puppeteer to render HTML and generate PDF
 * Configured for both local and serverless environments (Vercel)
 */
export async function convertHTMLToPDF(html: string): Promise<Buffer> {
  let browser

  try {
    // Launch browser in headless mode
    // Configure for serverless environments (Vercel, Railway, etc.)
    const launchOptions: any = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process", // Required for serverless environments
        "--disable-gpu",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
        "--disable-breakpad",
        "--disable-component-extensions-with-background-pages",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
        "--disable-sync",
        "--metrics-recording-only",
        "--mute-audio",
        "--no-default-browser-check",
        "--no-pings",
        "--use-mock-keychain",
      ],
    }

    // For Vercel/serverless environments
    // Note: Vercel requires Chrome to be bundled or available in the environment
    // If Chrome is not found, you may need to use an external PDF service
    if (process.env.VERCEL) {
      console.log("Running on Vercel - attempting to use bundled Chrome")
      // Vercel should have Chrome available via Puppeteer
      // If this fails, consider using an external PDF generation service
    }

    // If PUPPETEER_EXECUTABLE_PATH is explicitly set, use it
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
      console.log("Using explicit Chrome path:", launchOptions.executablePath)
    }

    browser = await puppeteer.launch(launchOptions)

    const page = await browser.newPage()

    // Set content with the HTML string
    await page.setContent(html, {
      waitUntil: "networkidle0", // Wait until network is idle
    })

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "Letter",
      margin: {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.5in",
        left: "0.5in",
      },
      printBackground: true, // Include background colors/images
    })

    return Buffer.from(pdfBuffer)
  } catch (error) {
    console.error("Error converting HTML to PDF:", error)
    throw new Error(`Failed to convert HTML to PDF: ${error instanceof Error ? error.message : "Unknown error"}`)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}




