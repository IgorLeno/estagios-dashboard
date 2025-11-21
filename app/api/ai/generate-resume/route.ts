import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateTailoredResume } from "@/lib/ai/resume-generator"
import { generateResumePDF, generateResumeFilename } from "@/lib/ai/pdf-generator"
import {
  GenerateResumeRequestSchema,
  GenerateResumeResponse,
  GenerateResumeErrorResponse,
  JobDetailsSchema,
} from "@/lib/ai/types"
import { parseJobWithGemini } from "@/lib/ai/job-parser"
import { validateAIConfig } from "@/lib/ai/config"

/**
 * POST /api/ai/generate-resume
 * Generate tailored resume from vaga or job description
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    // Validate AI config
    validateAIConfig()

    // Parse request body
    const body = await req.json()
    const validatedInput = GenerateResumeRequestSchema.parse(body)

    const { vagaId, jobDescription, language } = validatedInput

    console.log(`[Resume API] Request: ${vagaId ? `vaga ${vagaId}` : "job description"}, language: ${language}`)

    // Get job details
    let jobDetails

    if (vagaId) {
      // Fetch from database
      const supabase = await createClient()
      const { data: vaga, error } = await supabase.from("vagas_estagio").select("*").eq("id", vagaId).single()

      if (error || !vaga) {
        const errorResponse: GenerateResumeErrorResponse = {
          success: false,
          error: "Vaga not found",
          details: { vagaId },
        }
        return NextResponse.json(errorResponse, { status: 404 })
      }

      // Map vaga to JobDetails
      jobDetails = JobDetailsSchema.parse({
        empresa: vaga.empresa || "",
        cargo: vaga.cargo || "",
        local: vaga.local || "",
        modalidade: vaga.modalidade || "Presencial",
        tipo_vaga: vaga.tipo_vaga || "Estágio",
        requisitos_obrigatorios: vaga.requisitos_obrigatorios || [],
        requisitos_desejaveis: vaga.requisitos_desejaveis || [],
        responsabilidades: vaga.responsabilidades || [],
        beneficios: vaga.beneficios || [],
        salario: vaga.salario,
        idioma_vaga: vaga.idioma_vaga || "pt",
      })
    } else if (jobDescription) {
      // Parse from description
      const parseResult = await parseJobWithGemini(jobDescription)
      jobDetails = parseResult.data
    } else {
      throw new Error("Either vagaId or jobDescription is required")
    }

    // Generate tailored resume
    const resumeResult = await generateTailoredResume(jobDetails, language)

    // Generate PDF
    const pdfBuffer = await generateResumePDF(resumeResult.cv)

    // Convert to base64
    const pdfBase64 = pdfBuffer.toString("base64")

    // Generate filename
    const filename = generateResumeFilename(jobDetails.empresa, language)

    const totalDuration = Date.now() - startTime

    // Return success response
    const successResponse: GenerateResumeResponse = {
      success: true,
      data: {
        pdfBase64,
        filename,
      },
      metadata: {
        duration: totalDuration,
        model: resumeResult.model,
        tokenUsage: resumeResult.tokenUsage,
        personalizedSections: resumeResult.personalizedSections,
      },
    }

    console.log(`[Resume API] ✅ Success (${totalDuration}ms)`)

    return NextResponse.json(successResponse)
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    console.error(`[Resume API] ❌ Error (${duration}ms):`, errorMessage)

    // Handle validation errors
    if (error instanceof Error && error.name === "ZodError") {
      const errorResponse: GenerateResumeErrorResponse = {
        success: false,
        error: "Invalid request data",
        details: error,
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Handle timeout
    if (duration > 60000) {
      const errorResponse: GenerateResumeErrorResponse = {
        success: false,
        error: "Resume generation timed out (>60s)",
      }
      return NextResponse.json(errorResponse, { status: 504 })
    }

    // Generic error
    const errorResponse: GenerateResumeErrorResponse = {
      success: false,
      error: errorMessage,
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

/**
 * GET /api/ai/generate-resume
 * Health check
 */
export async function GET(): Promise<NextResponse> {
  try {
    validateAIConfig()

    return NextResponse.json({
      status: "ok",
      message: "Resume Generator API is running",
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    return NextResponse.json(
      {
        status: "error",
        message: errorMessage,
      },
      { status: 500 }
    )
  }
}
