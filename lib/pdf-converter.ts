import puppeteer from "puppeteer"

/**
 * Convert HTML string to PDF buffer
 * Uses puppeteer to render HTML and generate PDF
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
        "--single-process", // Required for some serverless environments
        "--disable-gpu",
      ],
    }

    // For serverless environments (Vercel, etc.), try to use the bundled Chrome
    // If PUPPETEER_EXECUTABLE_PATH is set, use it
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
    } else if (process.env.VERCEL) {
      // For Vercel, we need to use the bundled Chrome
      // Vercel automatically bundles Chrome with Puppeteer
      // The executable should be available in the default location
      console.log("Running on Vercel - using bundled Chrome")
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




