import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" })

/**
 * Migration script to mark existing test vagas
 * Identifies vagas created by E2E tests and marks them with is_test_data = true
 *
 * Usage:
 *   pnpm tsx scripts/mark-existing-test-data.ts
 */

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

async function markExistingTestData() {
  console.log("🔍 Identifying and marking existing test data...")
  console.log("")

  try {
    // Step 1: Find vagas with test patterns
    const { data: testVagas, error: fetchError } = await supabase
      .from("vagas_estagio")
      .select("id, empresa, cargo, observacoes, is_test_data")
      .or(
        [
          "empresa.ilike.%[E2E-TEST]%",
          "empresa.ilike.%E2E-TEST%",
          "cargo.ilike.%[E2E-TEST]%",
          "observacoes.ilike.%E2E%",
          "observacoes.ilike.%[TEST]%",
        ].join(",")
      )

    if (fetchError) {
      throw new Error(`Failed to fetch test records: ${fetchError.message}`)
    }

    console.log(`📊 Found ${testVagas?.length || 0} vagas with test patterns`)

    if (!testVagas || testVagas.length === 0) {
      console.log("✅ No test data to mark")
      return
    }

    // Step 2: Show what will be marked
    console.log("\n📋 Vagas to be marked as test data:")
    testVagas.forEach((vaga) => {
      const alreadyMarked = vaga.is_test_data ? " (already marked)" : ""
      console.log(`   - ${vaga.empresa} - ${vaga.cargo}${alreadyMarked}`)
    })

    // Step 3: Filter only vagas not already marked
    const vagasToUpdate = testVagas.filter((v) => !v.is_test_data)

    if (vagasToUpdate.length === 0) {
      console.log("\n✅ All test vagas already marked correctly")
      return
    }

    console.log(`\n🔄 Marking ${vagasToUpdate.length} vagas as test data...`)

    // Step 4: Update in batches of 100
    const batchSize = 100
    let updated = 0

    for (let i = 0; i < vagasToUpdate.length; i += batchSize) {
      const batch = vagasToUpdate.slice(i, i + batchSize)
      const ids = batch.map((v) => v.id)

      const { error: updateError } = await supabase
        .from("vagas_estagio")
        .update({ is_test_data: true })
        .in("id", ids)

      if (updateError) {
        throw new Error(`Failed to update batch: ${updateError.message}`)
      }

      updated += batch.length
      console.log(`   ✓ Updated ${updated}/${vagasToUpdate.length}`)
    }

    console.log("")
    console.log(`✅ Successfully marked ${updated} vagas as test data`)
    console.log("")
    console.log("✨ Migration complete!")
  } catch (error) {
    console.error("")
    console.error("❌ Migration failed:")
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// Run migration
markExistingTestData()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Unexpected error:", error)
    process.exit(1)
  })
