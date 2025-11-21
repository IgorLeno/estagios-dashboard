import puppeteer from "puppeteer"
import { generateResumeHTML } from "./resume-html-template"
import type { CVTemplate } from "./types"

/**
 * Generate PDF from CV template using Puppeteer
 */
export async function generateResumePDF(cv: CVTemplate): Promise<Buffer> {
  console.log("[PDF Generator] Launching Puppeteer...")

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage", // Vercel compatibility
    ],
  })

  try {
    const page = await browser.newPage()

    // Generate HTML content
    const htmlContent = generateResumeHTML(cv)

    // Set content and wait for rendering
    await page.setContent(htmlContent, {
      waitUntil: "networkidle0",
    })

    console.log("[PDF Generator] Rendering PDF...")

    // Generate PDF
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "20mm",
        right: "20mm",
      },
    })

    console.log("[PDF Generator] ✅ PDF generated successfully")

    return pdf
  } finally {
    await browser.close()
  }
}

/**
 * Generate filename for resume PDF
 */
export function generateResumeFilename(empresa: string, language: "pt" | "en"): string {
  // Sanitize empresa name (remove special chars, spaces)
  const sanitized = empresa
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  const langSuffix = language === "pt" ? "pt" : "en"

  return `cv-igor-fernandes-${sanitized}-${langSuffix}.pdf`
}
