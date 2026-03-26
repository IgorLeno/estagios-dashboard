import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateProfile } from "@/lib/ai/profile-generator"
import { validateAIConfig } from "@/lib/ai/config"
import { JobDetailsSchema } from "@/lib/ai/types"
import { z, ZodError } from "zod"

const RequestSchema = z.object({
  jobDescription: z.string().min(50).optional(),
  jobAnalysis: JobDetailsSchema.optional(),
  language: z.enum(["pt", "en"]),
  model: z.string().optional(),
}).refine(
  (data) => data.jobAnalysis || data.jobDescription,
  "Either jobAnalysis or jobDescription must be provided"
)

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    validateAIConfig()

    const body = await req.json()
    const { jobAnalysis, language, model } = RequestSchema.parse(body)

    if (!jobAnalysis) {
      return NextResponse.json(
        { success: false, error: "jobAnalysis is required for profile generation" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const result = await generateProfile(jobAnalysis, language, model, user?.id)

    return NextResponse.json({
      success: true,
      data: { profileText: result.profileText },
      metadata: { tokenUsage: result.tokenUsage },
    })
  } catch (error: unknown) {
    console.error("[Generate Profile API] Error:", error instanceof Error ? error.message : String(error))

    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request data", details: error.issues },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : String(error)

    if (
      message.includes("No content in Grok response") ||
      message.includes("LLM response missing profileText field")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "AI provider returned an empty profile response. Try again or switch model.",
        },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    message: "Profile Generator API is running",
  })
}
