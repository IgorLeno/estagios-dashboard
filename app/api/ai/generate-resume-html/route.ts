import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateTailoredResume, InsufficientProfileError } from "@/lib/ai/resume-generator"
import { generateResumeHTML } from "@/lib/ai/resume-html-template"
import { GenerateResumeRequestSchema, JobDetailsSchema, JobDetails } from "@/lib/ai/types"
import { parseJobWithGemini } from "@/lib/ai/job-parser"
import { validateAIConfig } from "@/lib/ai/config"
import { validateCVTemplate } from "@/lib/ai/resume-preflight"
import { ZodError } from "zod"

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    validateAIConfig()

    let body
    try {
      body = await req.json()
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
      }
      throw error
    }
    const validatedInput = GenerateResumeRequestSchema.parse(body)
    const {
      vagaId,
      jobDescription,
      language,
      profileText,
      approvedSkills,
      model,
      selectedProjectTitles,
      selectedCertifications,
      resumeTemplate,
    } = validatedInput

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Get job details (igual ao endpoint original)
    let jobDetails: JobDetails | undefined

    if (vagaId) {
      const { data: vaga, error } = await supabase.from("vagas_estagio").select("*").eq("id", vagaId).single()

      if (error || !vaga) {
        return NextResponse.json({ success: false, error: "Vaga not found" }, { status: 404 })
      }

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
      const parseResult = await parseJobWithGemini(jobDescription, model)
      jobDetails = parseResult.data
    } else {
      throw new Error("Either vagaId or jobDescription is required")
    }

    // Gerar currículo personalizado (só CV object, sem PDF)
    const effectiveProfileText = language === "pt" ? profileText : undefined

    const resumeResult = await generateTailoredResume(
      jobDetails,
      language,
      user?.id,
      approvedSkills,
      model,
      selectedProjectTitles,
      effectiveProfileText,
      selectedCertifications
    )

    const preflight = validateCVTemplate(resumeResult.cv)
    if (!preflight.valid) {
      return NextResponse.json(
        {
          success: false,
          error: `CV preflight failed:\n${preflight.errors.join("\n")}`,
          details: {
            errors: preflight.errors,
            warnings: preflight.warnings,
          },
        },
        { status: 422 }
      )
    }
    if (preflight.warnings.length > 0) {
      console.warn("[CV Preflight] Warnings:", preflight.warnings)
    }

    // Gerar HTML a partir do CV object
    const html = generateResumeHTML(resumeResult.cv, resumeTemplate ?? "modelo1")

    return NextResponse.json({
      success: true,
      data: {
        html,
      },
      metadata: {
        duration: resumeResult.duration,
        model: resumeResult.model,
        tokenUsage: resumeResult.tokenUsage,
        personalizedSections: resumeResult.personalizedSections,
      },
    })
  } catch (error: unknown) {
    console.error("[Resume HTML API] Error:", error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof InsufficientProfileError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    message: "Resume HTML Generator API is running",
  })
}
