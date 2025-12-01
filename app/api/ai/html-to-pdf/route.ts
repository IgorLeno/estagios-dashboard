import { NextRequest, NextResponse } from "next/server"
import { generatePDFFromHTML } from "@/lib/ai/pdf-generator"

/**
 * POST /api/ai/html-to-pdf
 *
 * Convert HTML to PDF using Puppeteer.
 *
 * Request body:
 * {
 *   html: string,
 *   filename?: string
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     pdfBase64: string,
 *     filename: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { html, filename = "resume.pdf" } = body

    if (!html || typeof html !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "HTML content is required",
        },
        { status: 400 }
      )
    }

    console.log("[html-to-pdf] Converting HTML to PDF...")
    console.log("[html-to-pdf] HTML length:", html.length)
    console.log("[html-to-pdf] Filename:", filename)

    // Generate PDF from HTML
    const pdfBuffer = await generatePDFFromHTML(html)
    const pdfBase64 = pdfBuffer.toString("base64")

    const duration = Date.now() - startTime
    console.log(`[html-to-pdf] ✅ PDF generated in ${duration}ms`)

    return NextResponse.json({
      success: true,
      data: {
        pdfBase64,
        filename,
      },
      metadata: {
        duration,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[html-to-pdf] Error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate PDF",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/html-to-pdf
 *
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "HTML to PDF converter is ready",
  })
}
