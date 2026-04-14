import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateTailoredResume, InsufficientProfileError } from "@/lib/ai/resume-generator"
import { generateResumePDF, generateResumeFilename } from "@/lib/ai/pdf-generator"
import {
  GenerateResumeRequestSchema,
  GenerateResumeResponse,
  GenerateResumeErrorResponse,
  JobDetailsSchema,
  JobDetails,
} from "@/lib/ai/types"
import { parseJobWithGemini } from "@/lib/ai/job-parser"
import { validateCVTemplate } from "@/lib/ai/resume-preflight"
import { validateAIConfig, AI_TIMEOUT_CONFIG } from "@/lib/ai/config"
import { withTimeout, TimeoutError } from "@/lib/ai/utils"
import { parseResumeUseTaglinePreference, RESUME_USE_TAGLINE_COOKIE_KEY } from "@/lib/resume-tagline-preference"
import { ZodError } from "zod"
import { generateResumeHTML } from "@/lib/ai/resume-html-template"
import { htmlToMarkdown } from "@/lib/ai/markdown-converter"

/**
 * POST /api/ai/generate-resume
 * Generate tailored resume from vaga or job description
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  const parsingTimeoutSeconds = Math.floor(AI_TIMEOUT_CONFIG.parsingTimeoutMs / 1000)
  const resumeGenerationTimeoutSeconds = Math.floor(AI_TIMEOUT_CONFIG.resumeGenerationTimeoutMs / 1000)

  try {
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

    const {
      vagaId,
      jobDescription,
      language,
      profileText,
      tagline,
      useTagline,
      approvedSkills,
      model,
      selectedProjectTitles,
      selectedCertifications,
      resumeTemplate,
      ignoreWarnings,
    } =
      validatedInput

    console.log(`[Resume API] Request: ${vagaId ? `vaga ${vagaId}` : "job description"}, language: ${language}`)

    // Get user ID from session
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id

    await validateAIConfig(userId)

    // Get job details (outside timeout wrapper to handle 404 early)
    let jobDetails: JobDetails | undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let vagaRecord: Record<string, any> | null = null

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

      vagaRecord = vaga

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

    if (!jobDetails && jobDescription) {
      const parseResult = await withTimeout(
        parseJobWithGemini(jobDescription, model, userId),
        AI_TIMEOUT_CONFIG.parsingTimeoutMs,
        `Job parsing exceeded ${parsingTimeoutSeconds}s timeout`
      )
      jobDetails = parseResult.data
    }

    if (!jobDetails) {
      throw new Error("Job details not available")
    }

    const effectiveLanguage = jobDetails.idioma_vaga || language
    if (effectiveLanguage !== language) {
      console.log(
        `[Resume API] Using job language ${effectiveLanguage.toUpperCase()} instead of requested ${language.toUpperCase()}`
      )
    }

    // Fall back to vaga-stored profile text / tagline when not provided in request body
    const vagaProfileField = effectiveLanguage === "pt" ? "profile_text_pt" : "profile_text_en"
    const vagaTaglineField = effectiveLanguage === "pt" ? "tagline_pt" : "tagline_en"
    const resolvedUseTagline =
      typeof useTagline === "boolean"
        ? useTagline
        : parseResumeUseTaglinePreference(req.cookies.get(RESUME_USE_TAGLINE_COOKIE_KEY)?.value)
    const hasExplicitFitInputs =
      Object.prototype.hasOwnProperty.call(body, "profileText") || Object.prototype.hasOwnProperty.call(body, "tagline")
    const effectiveProfileText = profileText?.trim() || vagaRecord?.[vagaProfileField]?.trim() || undefined
    const effectiveTagline =
      resolvedUseTagline
        ? tagline?.trim() || (!hasExplicitFitInputs ? vagaRecord?.[vagaTaglineField]?.trim() || undefined : undefined)
        : undefined

    const resumeResult = await withTimeout(
      generateTailoredResume({
        jobDetails,
        language: effectiveLanguage,
        userId,
        approvedSkills,
        model,
        selectedProjectTitles,
        profileText: effectiveProfileText,
        tagline: effectiveTagline,
        selectedCertifications,
      }),
      AI_TIMEOUT_CONFIG.resumeGenerationTimeoutMs,
      `Resume generation exceeded ${resumeGenerationTimeoutSeconds}s timeout`
    )

    // Preflight: validate CV structure before PDF generation.
    // If errors are found and the caller didn't explicitly ignore them,
    // return a confirmation prompt instead of generating the PDF.
    const preflight = validateCVTemplate(resumeResult.cv)
    if (preflight.warnings.length > 0) {
      console.warn("[Resume API] Preflight warnings:", preflight.warnings)
    }
    if (!preflight.valid && !ignoreWarnings) {
      return NextResponse.json({
        success: false,
        requiresConfirmation: true,
        warnings: preflight.errors,
        message: "O currículo possui características fora do padrão recomendado.",
      })
    }

    // Generate PDF without an application-level timeout.
    // If Chromium hangs, the route-level maxDuration is the final safeguard.
    const pdfBuffer = await generateResumePDF(resumeResult.cv, resumeTemplate ?? "modelo1")

    const pdfBase64 = pdfBuffer.toString("base64")
    const filename = generateResumeFilename(jobDetails.empresa, effectiveLanguage)

    if (vagaId) {
      const markdownField = effectiveLanguage === "pt" ? "curriculo_text_pt" : "curriculo_text_en"
      const pdfField = effectiveLanguage === "pt" ? "arquivo_cv_url_pt" : "arquivo_cv_url_en"
      const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`

      const html = generateResumeHTML(resumeResult.cv, resumeTemplate ?? "modelo1")
      const markdown = htmlToMarkdown(html)

      const updateData = {
        [markdownField]: markdown,
        [pdfField]: pdfDataUrl,
      }

      const { data: updateResult, error: updateError } = await supabase
        .from("vagas_estagio")
        .update(updateData)
        .eq("id", vagaId)
        .select()

      if (updateError) {
        console.error(`[Resume API] Failed to save resume to database:`, updateError)
        throw new Error(`Failed to save resume: ${updateError.message}`)
      }

      if (!updateResult || updateResult.length === 0) {
        throw new Error("Failed to save resume: vaga not found")
      }

      console.log(`[Resume API] ✅ Resume saved to database (${effectiveLanguage.toUpperCase()})`)
    }

    const totalDuration = Date.now() - startTime

    const result: GenerateResumeResponse = {
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
        error: timeoutError.message,
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

    // Handle insufficient profile (user-fixable)
    if (error instanceof InsufficientProfileError) {
      const errorResponse: GenerateResumeErrorResponse = {
        success: false,
        error: error.message,
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
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    await validateAIConfig(user?.id ?? null)

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
