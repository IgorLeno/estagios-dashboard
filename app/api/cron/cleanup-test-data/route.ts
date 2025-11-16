import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

/**
 * Cron job API route for automatic test data cleanup
 *
 * This route is called by Vercel Cron (configured in vercel.json)
 * Runs daily at 2 AM to clean up test data older than 7 days
 *
 * Security: Protected by CRON_SECRET environment variable
 *
 * Manual testing:
 *   curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/cleanup-test-data
 */
export async function GET(request: Request) {
  // Verify authorization header (Vercel Cron Secret)
  const authHeader = request.headers.get("authorization")
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

  if (!process.env.CRON_SECRET) {
    console.error("[Cron] CRON_SECRET not configured")
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 })
  }

  if (authHeader !== expectedAuth) {
    console.error("[Cron] Unauthorized access attempt")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Validate required environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[Cron] Missing Supabase credentials")
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
  }

  try {
    console.log("[Cron] Starting test data cleanup...")

    // Create Supabase client with SERVICE ROLE KEY (admin access)
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Delete test data older than 7 days
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 7)
    const cutoffDateStr = cutoffDate.toISOString()

    const { data: deletedRecords, error } = await supabase
      .from("vagas_estagio")
      .delete()
      .eq("is_test_data", true)
      .lt("created_at", cutoffDateStr)
      .select()

    if (error) {
      console.error("[Cron] Cleanup failed:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const deletedCount = deletedRecords?.length || 0

    console.log(`[Cron] Cleanup successful: deleted ${deletedCount} records`)

    return NextResponse.json({
      success: true,
      deletedCount,
      cutoffDate: cutoffDate.toISOString().split("T")[0],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Cron] Unexpected error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
