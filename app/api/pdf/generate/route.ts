import { NextRequest, NextResponse } from "next/server"
import { generatePDFFromHTML } from "@/lib/ai/pdf-generator"

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { html, filename } = await req.json()

    if (!html || typeof html !== "string") {
      return NextResponse.json(
        { success: false, error: "HTML content is required" },
        { status: 400 }
      )
    }

    // Gerar PDF usando Puppeteer (já existe em lib/ai/pdf-generator.ts)
    const pdfBuffer = await generatePDFFromHTML(html)

    // Converter para base64
    const pdfBase64 = pdfBuffer.toString("base64")

    return NextResponse.json({
      success: true,
      data: {
        pdfBase64,
        filename: filename || "curriculum.pdf",
      },
    })
  } catch (error) {
    console.error("[PDF Generator] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to generate PDF" },
      { status: 500 }
    )
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    message: "PDF Generator API is running",
  })
}
