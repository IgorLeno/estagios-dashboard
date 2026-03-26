import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { selectComplements } from "@/lib/ai/complement-selector"
import { validateAIConfig } from "@/lib/ai/config"
import { JobDetailsSchema } from "@/lib/ai/types"
import { z, ZodError } from "zod"

const RequestSchema = z.object({
  profileText: z.string().min(20),
  jobAnalysis: JobDetailsSchema,
  language: z.enum(["pt", "en"]),
  model: z.string().optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    validateAIConfig()

    const body = await req.json()
    const { profileText, jobAnalysis, language, model } = RequestSchema.parse(body)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const result = await selectComplements(
      profileText,
      jobAnalysis,
      language,
      model,
      user?.id
    )

    return NextResponse.json({
      success: true,
      data: result.selection,
      metadata: { tokenUsage: result.tokenUsage },
    })
  } catch (error: unknown) {
    console.error("[Select Complements API] Error:", error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    message: "Complement Selector API is running",
  })
}
