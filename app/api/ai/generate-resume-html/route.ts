import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateTailoredResume } from "@/lib/ai/resume-generator"
import { generateResumeHTML } from "@/lib/ai/resume-html-template"
import { JobDetailsSchema, JobDetails } from "@/lib/ai/types"
import { parseJobWithGemini } from "@/lib/ai/job-parser"
import { validateAIConfig } from "@/lib/ai/config"
import { ZodError } from "zod"

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    validateAIConfig()

    const body = await req.json()
    const { vagaId, jobDescription, language } = body

    if (!language || !["pt", "en"].includes(language)) {
      return NextResponse.json({ success: false, error: "Invalid language" }, { status: 400 })
    }

    // Get job details (igual ao endpoint original)
    let jobDetails: JobDetails | undefined

    if (vagaId) {
      const supabase = await createClient()
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
      const parseResult = await parseJobWithGemini(jobDescription)
      jobDetails = parseResult.data
    } else {
      throw new Error("Either vagaId or jobDescription is required")
    }

    // Gerar currículo personalizado (só CV object, sem PDF)
    const resumeResult = await generateTailoredResume(jobDetails, language)

    // Gerar HTML a partir do CV object
    const html = generateResumeHTML(resumeResult.cv)

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
