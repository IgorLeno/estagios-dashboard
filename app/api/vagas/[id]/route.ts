import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * PATCH /api/vagas/[id]
 *
 * Update a vaga (job application) by ID.
 *
 * Request body: Partial VagaEstagio object
 * Response: { success: boolean, error?: string }
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 })
    }

    console.log(`[PATCH /api/vagas/${id}] Updating vaga with:`, Object.keys(body))

    // Update vaga in database
    const { data, error } = await supabase
      .from("vagas_estagio")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()

    if (error) {
      console.error(`[PATCH /api/vagas/${id}] Supabase error:`, error)
      throw error
    }

    if (!data || data.length === 0) {
      console.error(`[PATCH /api/vagas/${id}] No data returned - vaga not found or no changes`)
      return NextResponse.json({ success: false, error: "Vaga not found or no changes made" }, { status: 404 })
    }

    console.log(`[PATCH /api/vagas/${id}] ✅ Vaga updated successfully`)

    return NextResponse.json({
      success: true,
      data: data[0],
    })
  } catch (error) {
    console.error(`[PATCH /api/vagas] Error:`, error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update vaga",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/vagas/[id]
 *
 * Get a vaga (job application) by ID.
 *
 * Response: { success: boolean, data?: VagaEstagio, error?: string }
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 })
    }

    console.log(`[GET /api/vagas/${id}] Fetching vaga`)

    const { data, error } = await supabase.from("vagas_estagio").select("*").eq("id", id).single()

    if (error) {
      console.error(`[GET /api/vagas/${id}] Supabase error:`, error)
      throw error
    }

    if (!data) {
      return NextResponse.json({ success: false, error: "Vaga not found" }, { status: 404 })
    }

    console.log(`[GET /api/vagas/${id}] ✅ Vaga fetched successfully`)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error(`[GET /api/vagas] Error:`, error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch vaga",
      },
      { status: 500 }
    )
  }
}
