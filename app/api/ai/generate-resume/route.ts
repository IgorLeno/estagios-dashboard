import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateTailoredResume } from "@/lib/ai/resume-generator"
import { generateResumePDF, generateResumeFilename } from "@/lib/ai/pdf-generator"
import {
  GenerateResumeRequestSchema,
  GenerateResumeResponse,
  GenerateResumeErrorResponse,
  JobDetailsSchema,
  JobDetails,
} from "@/lib/ai/types"
import { parseJobWithGemini } from "@/lib/ai/job-parser"
import { validateAIConfig } from "@/lib/ai/config"
import { withTimeout, TimeoutError } from "@/lib/ai/utils"
import { ZodError } from "zod"

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
    let body
    try {
      body = await req.json()
    } catch (error) {
      if (error instanceof SyntaxError) {
        const errorResponse: GenerateResumeErrorResponse = {
          success: false,
          error: "Invalid JSON body",
        }
        return NextResponse.json(errorResponse, { status: 400 })
      }
      throw error
    }
    const validatedInput = GenerateResumeRequestSchema.parse(body)

    const { vagaId, jobDescription, language } = validatedInput

    console.log(`[Resume API] Request: ${vagaId ? `vaga ${vagaId}` : "job description"}, language: ${language}`)

    // Get user ID from session
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id

    // Get job details (outside timeout wrapper to handle 404 early)
    let jobDetails: JobDetails | undefined

    if (vagaId) {
      // Fetch from database
      const { data: vaga, error } = await supabase.from("vagas_estagio").select("*").eq("id", vagaId).single()

      if (error || !vaga) {
        const errorResponse: GenerateResumeErrorResponse = {
          success: false,
          error: "Vaga not found",
          details: { vagaId },
        }
        return NextResponse.json(errorResponse, { status: 404 })
      }

      // Map vaga to JobDetails (schema handles null/undefined with defaults)
      jobDetails = JobDetailsSchema.parse({
        empresa: vaga.empresa,
        cargo: vaga.cargo,
        local: vaga.local,
        modalidade: vaga.modalidade,
        tipo_vaga: vaga.tipo_vaga,
        requisitos_obrigatorios: vaga.requisitos_obrigatorios,
        requisitos_desejaveis: vaga.requisitos_desejaveis,
        responsabilidades: vaga.responsabilidades,
        beneficios: vaga.beneficios,
        salario: vaga.salario,
        idioma_vaga: vaga.idioma_vaga,
      })
    } else if (jobDescription) {
      // Parse from description - will be done inside timeout wrapper
      jobDetails = undefined
    } else {
      throw new Error("Either vagaId or jobDescription is required")
    }

    // Main processing pipeline with timeout protection (60s)
    // Wrap job parsing (if needed) + resume generation + PDF creation in timeout
    const result = await withTimeout(
      (async () => {
        // Parse job description if needed
        if (!jobDetails && jobDescription) {
          const parseResult = await parseJobWithGemini(jobDescription)
          jobDetails = parseResult.data
        }

        if (!jobDetails) {
          throw new Error("Job details not available")
        }

        // Generate tailored resume
        const resumeResult = await generateTailoredResume(jobDetails, language, userId)

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

        return successResponse
      })(),
      60000,
      "Resume generation exceeded 60s timeout"
    )

    return NextResponse.json(result)
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    console.error(`[Resume API] ❌ Error (${duration}ms):`, errorMessage)

    // Handle timeout errors
    if (error instanceof TimeoutError) {
      const timeoutError = error as TimeoutError
      console.error(`[Resume API] Timeout: ${timeoutError.message}`)
      const errorResponse: GenerateResumeErrorResponse = {
        success: false,
        error: "Resume generation timed out (>60s)",
      }
      return NextResponse.json(errorResponse, { status: 504 })
    }

    // Handle validation errors
    if (error instanceof ZodError) {
      const errorResponse: GenerateResumeErrorResponse = {
        success: false,
        error: "Invalid request data",
        details: error.errors,
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Generic error - don't leak internal error messages
    const errorResponse: GenerateResumeErrorResponse = {
      success: false,
      error: "Internal server error",
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
