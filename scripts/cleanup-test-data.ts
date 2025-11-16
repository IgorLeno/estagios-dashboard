import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" })

/**
 * Cleanup script for test data
 * Deletes test vagas older than specified days
 *
 * Usage:
 *   pnpm cleanup:test-data           # Delete test data older than 7 days (default)
 *   pnpm cleanup:test-data -- --all  # Delete ALL test data
 *   pnpm cleanup:test-data -- --days=14  # Delete test data older than 14 days
 */

// Parse command line arguments
const args = process.argv.slice(2)
const deleteAll = args.includes("--all")
const daysArg = args.find((arg) => arg.startsWith("--days="))
const daysOld = daysArg ? parseInt(daysArg.split("=")[1], 10) : 7

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL is not set")
  process.exit(1)
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is not set")
  console.error("   Get it from Supabase Dashboard → Settings → API → service_role key")
  process.exit(1)
}

// Create Supabase client with SERVICE ROLE KEY (admin access)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function cleanupTestData() {
  console.log("🧹 Starting test data cleanup...")
  console.log("")

  try {
    // Step 1: Count total test records
    const { count: totalTests, error: countError } = await supabase
      .from("vagas_estagio")
      .select("id", { count: "exact", head: true })
      .eq("is_test_data", true)

    if (countError) {
      throw new Error(`Failed to count test records: ${countError.message}`)
    }

    console.log(`📊 Found ${totalTests || 0} test records in database`)

    if (!totalTests || totalTests === 0) {
      console.log("✅ No test data to clean up")
      return
    }

    // Step 2: Delete based on mode
    let deleteQuery = supabase.from("vagas_estagio").delete().eq("is_test_data", true)

    if (deleteAll) {
      console.log("🗑️  Mode: DELETE ALL test data")
    } else {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)
      const cutoffDateStr = cutoffDate.toISOString()

      console.log(`🗑️  Mode: DELETE test data older than ${daysOld} days`)
      console.log(`📅 Cutoff date: ${cutoffDate.toISOString().split("T")[0]}`)

      deleteQuery = deleteQuery.lt("created_at", cutoffDateStr)
    }

    const { data: deletedRecords, error: deleteError } = await deleteQuery.select()

    if (deleteError) {
      throw new Error(`Failed to delete test records: ${deleteError.message}`)
    }

    const deletedCount = deletedRecords?.length || 0

    console.log("")
    console.log(`✅ Deleted ${deletedCount} test records`)
    console.log(`📊 Remaining test records: ${(totalTests || 0) - deletedCount}`)
    console.log("")
    console.log("✨ Cleanup complete!")
  } catch (error) {
    console.error("")
    console.error("❌ Cleanup failed:")
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// Run cleanup
cleanupTestData()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Unexpected error:", error)
    process.exit(1)
  })
