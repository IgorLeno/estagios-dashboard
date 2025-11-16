import { createClient } from "@/lib/supabase/client"
import type { VagaEstagio } from "@/lib/types"

/**
 * Determines if test data should be included based on environment
 * In production, NEVER include test data
 * In development, can be controlled via environment variable
 */
export function shouldIncludeTestData(): boolean {
  // In production, NEVER include test data
  if (process.env.NODE_ENV === "production") {
    return false
  }

  // In development, can be controlled via env var (default: false)
  return process.env.NEXT_PUBLIC_SHOW_TEST_DATA === "true"
}

/**
 * Fetch all vagas with optional test data filtering
 * @param options - Query options
 * @param options.includeTestData - Override default test data filtering
 * @returns Vagas data or error
 */
export async function getVagas(options?: { includeTestData?: boolean }) {
  const supabase = createClient()

  const includeTests = options?.includeTestData ?? shouldIncludeTestData()

  let query = supabase.from("vagas_estagio").select("*").order("created_at", { ascending: false })

  // Filter test data if necessary
  if (!includeTests) {
    query = query.eq("is_test_data", false)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching vagas:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Fetch a single vaga by ID
 * @param id - Vaga ID
 * @param options - Query options
 * @param options.includeTestData - Override default test data filtering
 * @returns Vaga data or error
 */
export async function getVagaById(id: string, options?: { includeTestData?: boolean }) {
  const supabase = createClient()

  const includeTests = options?.includeTestData ?? shouldIncludeTestData()

  let query = supabase.from("vagas_estagio").select("*").eq("id", id)

  if (!includeTests) {
    query = query.eq("is_test_data", false)
  }

  const { data, error } = await query.single()

  return { data, error }
}

/**
 * Count total vagas
 * @param options - Query options
 * @param options.includeTestData - Override default test data filtering
 * @returns Count and error
 */
export async function countVagas(options?: { includeTestData?: boolean }) {
  const supabase = createClient()

  const includeTests = options?.includeTestData ?? shouldIncludeTestData()

  let query = supabase.from("vagas_estagio").select("id", { count: "exact", head: true })

  if (!includeTests) {
    query = query.eq("is_test_data", false)
  }

  const { count, error } = await query

  return { count, error }
}

/**
 * Fetch vagas within a date range
 * Used for charts and historical data
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @param options - Query options
 * @returns Vagas data or error
 */
export async function getVagasByDateRange(
  startDate: string,
  endDate: string,
  options?: { includeTestData?: boolean }
) {
  const supabase = createClient()

  const includeTests = options?.includeTestData ?? shouldIncludeTestData()

  let query = supabase
    .from("vagas_estagio")
    .select("*")
    .gte("data_inscricao", startDate)
    .lte("data_inscricao", endDate)
    .order("data_inscricao", { ascending: true })

  if (!includeTests) {
    query = query.eq("is_test_data", false)
  }

  const { data, error } = await query

  return { data, error }
}

/**
 * Fetch vagas by status
 * @param status - Status to filter by
 * @param options - Query options
 * @returns Vagas data or error
 */
export async function getVagasByStatus(
  status: VagaEstagio["status"],
  options?: { includeTestData?: boolean }
) {
  const supabase = createClient()

  const includeTests = options?.includeTestData ?? shouldIncludeTestData()

  let query = supabase.from("vagas_estagio").select("*").eq("status", status).order("created_at", { ascending: false })

  if (!includeTests) {
    query = query.eq("is_test_data", false)
  }

  const { data, error } = await query

  return { data, error }
}

/**
 * Fetch vagas by modalidade
 * @param modalidade - Modalidade to filter by
 * @param options - Query options
 * @returns Vagas data or error
 */
export async function getVagasByModalidade(
  modalidade: VagaEstagio["modalidade"],
  options?: { includeTestData?: boolean }
) {
  const supabase = createClient()

  const includeTests = options?.includeTestData ?? shouldIncludeTestData()

  let query = supabase
    .from("vagas_estagio")
    .select("*")
    .eq("modalidade", modalidade)
    .order("created_at", { ascending: false })

  if (!includeTests) {
    query = query.eq("is_test_data", false)
  }

  const { data, error } = await query

  return { data, error }
}
