import { NextRequest, NextResponse } from "next/server"
import { PDFParse } from "pdf-parse"
import { callGrok, validateGrokConfig, type GrokMessage } from "@/lib/ai/grok-client"
import { loadUserAIConfig } from "@/lib/ai/config"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 120

const MAX_PDF_BYTES = 10 * 1024 * 1024
const MAX_EXTRACTED_TEXT_CHARS = 40000

function stripMarkdownFence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()
}

function buildPdfToMarkdownMessages(extractedText: string): GrokMessage[] {
  return [
    {
      role: "system",
      content: [
        "You convert raw PDF resume text into clean, structured markdown.",
        "Keep the candidate's facts exactly as provided. Do not invent skills, dates, certifications, links, companies, metrics, or education.",
        "Use the same concise resume structure used by this system: candidate name as the main heading, contact line, professional summary, education, skills, projects, languages, and certifications when present.",
        "If a section is missing from the extracted text, omit it instead of creating placeholders.",
        "Return only markdown. Do not wrap the answer in code fences and do not add commentary.",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "Convert this extracted resume text into structured markdown:",
        "",
        extractedText,
      ].join("\n"),
    },
  ]
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    await validateGrokConfig(user.id)

    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "Missing PDF file" }, { status: 400 })
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ success: false, error: "Only PDF files are supported" }, { status: 400 })
    }

    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json({ success: false, error: "PDF file is too large" }, { status: 413 })
    }

    const data = new Uint8Array(await file.arrayBuffer())
    const parser = new PDFParse({ data })

    let extractedText = ""
    try {
      const result = await parser.getText()
      extractedText = result.text.trim()
    } finally {
      await parser.destroy()
    }

    if (extractedText.length < 100) {
      return NextResponse.json(
        { success: false, error: "Could not extract enough text from this PDF" },
        { status: 422 }
      )
    }

    const config = await loadUserAIConfig(user.id)
    const response = await callGrok(
      buildPdfToMarkdownMessages(extractedText.slice(0, MAX_EXTRACTED_TEXT_CHARS)),
      {
        model: config.modelo_gemini,
        temperature: 0.2,
        max_tokens: 8192,
        top_p: config.top_p ?? 0.9,
      },
      { userId: user.id }
    )

    const markdown = stripMarkdownFence(response.content)

    if (markdown.length < 100) {
      return NextResponse.json(
        { success: false, error: "The markdown conversion returned unexpectedly little content" },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { markdown },
      metadata: {
        extractedTextLength: extractedText.length,
        model: config.modelo_gemini,
        tokenUsage: response.usage,
      },
    })
  } catch (error) {
    console.error("[pdf-to-markdown] Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to convert PDF" },
      { status: 500 }
    )
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ status: "ok", message: "PDF to markdown converter is ready" })
}
