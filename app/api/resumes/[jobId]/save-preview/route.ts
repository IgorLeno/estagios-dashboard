import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: { jobId: string } }) {
  try {
    const { language, markdownContent, htmlContent } = await request.json()

    // Validate input
    if (!language || !["pt", "en"].includes(language)) {
      return NextResponse.json({ error: "Invalid language. Must be 'pt' or 'en'" }, { status: 400 })
    }

    if (!markdownContent && !htmlContent) {
      return NextResponse.json({ error: "markdownContent or htmlContent is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if preview already exists for this job+language
    const { data: existing, error: fetchError } = await supabase
      .from("resumes")
      .select("id")
      .eq("job_id", params.jobId)
      .eq("language", language)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 = no rows found (expected if no preview exists yet)
      console.error("[SavePreview] Error checking existing preview:", fetchError)
      throw fetchError
    }

    if (existing) {
      // Update existing preview
      const { error: updateError } = await supabase
        .from("resumes")
        .update({
          markdown_content: markdownContent || null,
          html_content: htmlContent || null,
          status: "preview_saved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)

      if (updateError) {
        console.error("[SavePreview] Error updating preview:", updateError)
        throw updateError
      }

      return NextResponse.json({
        success: true,
        data: { id: existing.id, updated: true },
        message: "Preview updated successfully",
      })
    } else {
      // Create new preview
      const { data: newResume, error: insertError } = await supabase
        .from("resumes")
        .insert({
          job_id: params.jobId,
          language,
          markdown_content: markdownContent || null,
          html_content: htmlContent || null,
          status: "preview_saved",
        })
        .select("id")
        .single()

      if (insertError) {
        console.error("[SavePreview] Error creating preview:", insertError)
        throw insertError
      }

      return NextResponse.json({
        success: true,
        data: { id: newResume.id, created: true },
        message: "Preview saved successfully",
      })
    }
  } catch (error) {
    console.error("[SavePreview] Unexpected error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, error: `Failed to save preview: ${errorMessage}` }, { status: 500 })
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Resume preview save endpoint is healthy",
    endpoints: {
      POST: "/api/resumes/[jobId]/save-preview - Save or update resume preview",
    },
  })
}
