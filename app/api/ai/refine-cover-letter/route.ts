import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { callGrok, validateGrokConfig, type GrokMessage } from "@/lib/ai/grok-client"
import { loadUserAIConfig } from "@/lib/ai/config"
import { createClient } from "@/lib/supabase/server"
import { normalizeCoverLetterText } from "@/lib/ai/cover-letter"

const RefineCoverLetterRequestSchema = z.object({
  language: z.enum(["pt", "en"]),
  instructions: z.string().min(10),
  currentLetter: z.string().min(50),
  model: z.string().optional(),
  candidateName: z.string().min(1),
  companyName: z.string().min(1),
  jobTitle: z.string().min(1),
})

function buildRefinementMessages(
  currentLetter: string,
  instructions: string,
  language: "pt" | "en",
  context: {
    candidateName: string
    companyName: string
    jobTitle: string
  }
): GrokMessage[] {
  const languageLabel = language === "pt" ? "Português" : "English"
  const greeting = language === "pt" ? "Prezados Recrutadores" : "Dear Hiring Manager"
  const closing = language === "pt" ? "Atenciosamente" : "Sincerely"

  return [
    {
      role: "system",
      content: [
        "You are an expert cover letter editor.",
        "Refine the user's existing cover letter according to the instructions, without changing the candidate's factual background.",
        "",
        "CORE DIRECTIVES:",
        "- The user's instructions are the highest priority. Apply them precisely.",
        "- Preserve the same target company and target job title.",
        "- Do not fabricate experience, education, achievements, metrics, dates, tools, certifications, or language proficiency that are not already implied by the current letter/context.",
        "- Keep the letter polished, specific, and concise enough to fit comfortably on a single A4 page.",
        "- Maintain a professional tone and natural flow across 3-4 paragraphs.",
        "",
        "OUTPUT RULES:",
        `- The letter must remain in ${languageLabel}.`,
        `- Keep a professional greeting (${greeting}) and closing (${closing}).`,
        `- The candidate full name (${context.candidateName}) should appear only in the signature, not in the body.`,
        "- Return only the complete refined letter text.",
        "- Do not use markdown, bullets, code fences, notes, or commentary.",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `Target company: ${context.companyName}`,
        `Target role: ${context.jobTitle}`,
        `Candidate signature name: ${context.candidateName}`,
        "",
        `Current cover letter (${languageLabel}):`,
        currentLetter,
        "",
        "Refinement instructions (apply these exactly):",
        instructions,
      ].join("\n"),
    },
  ]
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    validateGrokConfig()

    const body = await req.json()
    const validatedInput = RefineCoverLetterRequestSchema.parse(body)

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 }
      )
    }

    const config = await loadUserAIConfig(user.id)
    const response = await callGrok(
      buildRefinementMessages(
        validatedInput.currentLetter,
        validatedInput.instructions,
        validatedInput.language,
        {
          candidateName: validatedInput.candidateName,
          companyName: validatedInput.companyName,
          jobTitle: validatedInput.jobTitle,
        }
      ),
      {
        model: validatedInput.model ?? config.modelo_gemini,
        temperature: config.temperatura,
        max_tokens: 2200,
        top_p: config.top_p ?? 0.9,
      }
    )

    const refinedLetter = normalizeCoverLetterText(response.content)

    if (!refinedLetter) {
      throw new Error("Empty response from refinement model")
    }

    if (refinedLetter.length < Math.ceil(validatedInput.currentLetter.length * 0.3)) {
      return NextResponse.json(
        {
          success: false,
          error: "Refined cover letter response was unexpectedly short and was rejected",
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        letter: refinedLetter,
      },
      metadata: {
        duration: Date.now() - startTime,
        model: validatedInput.model ?? config.modelo_gemini,
        tokenUsage: {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        },
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    console.error(`[Refine Cover Letter API] Error (${duration}ms):`, errorMessage)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    )
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    validateGrokConfig()

    return NextResponse.json({
      status: "ok",
      message: "Cover Letter Refiner API is running",
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
