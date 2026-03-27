import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { validateUserSuppliedOpenRouterApiKey } from "@/lib/ai/grok-client"
import { deleteUserOpenRouterApiKey, getOpenRouterKeyStatus, saveUserOpenRouterApiKey } from "@/lib/supabase/openrouter-keys"
import { createClient } from "@/lib/supabase/server"

const SaveOpenRouterKeyRequestSchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(20, "OpenRouter API key is too short")
    .max(512, "OpenRouter API key is too long")
    .refine((value) => value.startsWith("sk-or-"), "OpenRouter API keys must start with sk-or-"),
})

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const status = await getOpenRouterKeyStatus(user?.id)

    return NextResponse.json({
      success: true,
      data: status,
      isReadOnly: !user,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    )
  }
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

    const body = await request.json()
    const { apiKey } = SaveOpenRouterKeyRequestSchema.parse(body)

    await validateUserSuppliedOpenRouterApiKey(apiKey)
    const status = await saveUserOpenRouterApiKey(user.id, apiKey)

    return NextResponse.json({
      success: true,
      data: status,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: error.issues[0]?.message ?? "Invalid request data",
        },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : "Internal server error"
    const statusCode =
      message.includes("rejected this API key") || message.includes("Unable to validate OpenRouter API key") ? 400 : 500

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: statusCode }
    )
  }
}

export async function DELETE(): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    await deleteUserOpenRouterApiKey(user.id)

    return NextResponse.json({
      success: true,
      data: await getOpenRouterKeyStatus(user.id),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    )
  }
}
