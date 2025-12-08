import { generateResumeHTML } from "./resume-html-template"
import type { CVTemplate } from "./types"

/**
 * Detecta se está rodando em ambiente serverless (Vercel)
 */
function isServerlessEnvironment(): boolean {
  return process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_VERSION !== undefined
}

/**
 * Generate PDF from CV template using Puppeteer
 * Automatically detects if running in serverless environment and uses appropriate Chromium
 */
export async function generateResumePDF(cv: CVTemplate): Promise<Buffer> {
  console.log("[PDF Generator] Launching Puppeteer...")

  const isServerless = isServerlessEnvironment()

  let browser

  if (isServerless) {
    console.log("[PDF Generator] Detected serverless environment, using @sparticuz/chromium")
    // Serverless environment (Vercel, AWS Lambda)
    // Dynamic import para evitar erros em desenvolvimento
    const puppeteerCore = await import("puppeteer-core")
    const chromium = await import("@sparticuz/chromium")

    browser = await puppeteerCore.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true, // Use boolean true em vez de chromium.headless (que não existe)
    })
  } else {
    console.log("[PDF Generator] Using local Puppeteer")
    // Local development environment
    const puppeteerLocal = await import("puppeteer")
    browser = await puppeteerLocal.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    })
  }

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
        top: "0",
        bottom: "0",
        left: "0",
        right: "0",
      },
    })

    console.log("[PDF Generator] ✅ PDF generated successfully")

    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

/**
 * Generate PDF from raw HTML string using Puppeteer
 * Used for preview functionality where user can edit HTML before generating PDF
 */
export async function generatePDFFromHTML(html: string): Promise<Buffer> {
  console.log("[PDF Generator] Launching Puppeteer for HTML conversion...")

  const isServerless = isServerlessEnvironment()

  let browser

  if (isServerless) {
    console.log("[PDF Generator] Detected serverless environment, using @sparticuz/chromium")
    const puppeteerCore = await import("puppeteer-core")
    const chromium = await import("@sparticuz/chromium")

    browser = await puppeteerCore.default.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    })
  } else {
    console.log("[PDF Generator] Using local Puppeteer")
    const puppeteerLocal = await import("puppeteer")
    browser = await puppeteerLocal.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    })
  }

  try {
    const page = await browser.newPage()

    // Set content and wait for rendering
    await page.setContent(html, {
      waitUntil: "networkidle0",
    })

    console.log("[PDF Generator] Rendering PDF from HTML...")

    // Generate PDF
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0",
        bottom: "0",
        left: "0",
        right: "0",
      },
    })

    console.log("[PDF Generator] ✅ PDF generated successfully from HTML")

    return Buffer.from(pdf)
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
