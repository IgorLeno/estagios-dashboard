/**
 * POST /api/skills/extract-from-profile
 * Extract skills from profile text and populate user_skills_bank
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { seedSkillsBankFromProfile, mergeSkillsFromProfile } from "@/lib/ai/skills-bank-seeder"
import { validateGrokConfig } from "@/lib/ai/grok-client"
import { z } from "zod"

/**
 * Request body schema
 */
const ExtractSkillsRequestSchema = z.object({
  profileText: z.string().min(50, "Profile text too short (minimum 50 characters)").max(50000, "Profile text too long"),
  mode: z.enum(["replace", "merge"]).default("replace").optional(),
})

/**
 * POST handler: Extract skills from profile and populate skills bank
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    // Validate Grok configuration
    validateGrokConfig()

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    let body
    try {
      body = await req.json()
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
      }
      throw error
    }

    const validatedInput = ExtractSkillsRequestSchema.parse(body)
    const { profileText, mode = "replace" } = validatedInput

    console.log(`[Skills Extract API] Request from user ${user.id}, mode: ${mode}, text length: ${profileText.length}`)

    // Execute extraction and seeding
    let result

    if (mode === "replace") {
      result = await seedSkillsBankFromProfile(user.id, profileText)
    } else {
      // Merge mode
      const mergeResult = await mergeSkillsFromProfile(user.id, profileText)

      // Convert merge result to seed result format
      result = {
        success: mergeResult.errors ? false : true,
        skills_count: mergeResult.added,
        errors: mergeResult.errors,
        categories_summary: undefined, // Not available in merge mode
      }
    }

    // Check for errors
    if (!result.success) {
      console.error("[Skills Extract API] Extraction failed:", result.errors)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to extract skills from profile",
          details: result.errors,
        },
        { status: 500 }
      )
    }

    const duration = Date.now() - startTime

    console.log(`[Skills Extract API] ✅ Success: ${result.skills_count} skills extracted (${duration}ms)`)

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully extracted and saved ${result.skills_count} skills`,
      data: {
        skills_count: result.skills_count,
        mode,
        categories_summary: result.categories_summary,
      },
      metadata: {
        duration,
      },
    })
  } catch (error: unknown) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    console.error(`[Skills Extract API] ❌ Error (${duration}ms):`, errorMessage)

    // Handle validation errors
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

    // Generic error - don't leak internal details
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * GET handler: Health check
 */
export async function GET(): Promise<NextResponse> {
  try {
    validateGrokConfig()

    return NextResponse.json({
      status: "ok",
      message: "Skills Extraction API is running",
      endpoints: {
        extract: "POST /api/skills/extract-from-profile",
      },
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
