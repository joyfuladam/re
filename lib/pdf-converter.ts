import puppeteer from "puppeteer"

/**
 * Convert HTML string to PDF buffer
 * Uses puppeteer to render HTML and generate PDF
 */
export async function convertHTMLToPDF(html: string): Promise<Buffer> {
  let browser

  try {
    // Launch browser in headless mode
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"], // Required for some environments
    })

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

