import { createClient } from "@/lib/supabase/client"
import { VagaEstagio } from "@/lib/types"

/**
 * Sample test data for seeding
 */
const SAMPLE_VAGAS: Partial<VagaEstagio>[] = [
  {
    empresa: "Google",
    cargo: "Software Engineer Intern",
    local: "São Paulo, SP",
    modalidade: "Híbrido",
    status: "Pendente",
    etapa: "Pendente",
    requisitos: 85,
    observacoes: "Vaga de teste E2E - Google",
    data_inscricao: new Date().toISOString().split("T")[0],
  },
  {
    empresa: "Meta",
    cargo: "Frontend Developer Intern",
    local: "Remote",
    modalidade: "Remoto",
    status: "Avançado",
    etapa: "Entrevista Técnica",
    requisitos: 75,
    observacoes: "Vaga de teste E2E - Meta",
    data_inscricao: new Date().toISOString().split("T")[0],
  },
  {
    empresa: "Amazon",
    cargo: "Backend Engineer Intern",
    local: "Belo Horizonte, MG",
    modalidade: "Presencial",
    status: "Contratado",
    etapa: "Oferta",
    requisitos: 90,
    observacoes: "Vaga de teste E2E - Amazon",
    data_inscricao: new Date().toISOString().split("T")[0],
  },
  {
    empresa: "Microsoft",
    cargo: "Data Science Intern",
    local: "Rio de Janeiro, RJ",
    modalidade: "Híbrido",
    status: "Melou",
    etapa: "Rejeitado",
    requisitos: 70,
    observacoes: "Vaga de teste E2E - Microsoft",
    data_inscricao: new Date().toISOString().split("T")[0],
  },
]

/**
 * Seed database with test data
 * Returns the number of records created
 */
export async function seedTestData(): Promise<number> {
  const supabase = createClient()

  // Insert sample vagas
  const { data, error } = await supabase.from("vagas_estagio").insert(SAMPLE_VAGAS).select()

  if (error) {
    console.error("Error seeding test data:", error)
    throw error
  }

  return data?.length || 0
}

/**
 * Clean up test data
 * Deletes all test vagas (identified by observacoes containing "Vaga de teste E2E")
 */
export async function cleanupTestData(): Promise<number> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("vagas_estagio")
    .delete()
    .like("observacoes", "%Vaga de teste E2E%")
    .select()

  if (error) {
    console.error("Error cleaning up test data:", error)
    throw error
  }

  return data?.length || 0
}

/**
 * Get count of existing test vagas
 */
export async function getTestDataCount(): Promise<number> {
  const supabase = createClient()

  const { count, error } = await supabase
    .from("vagas_estagio")
    .select("*", { count: "exact", head: true })
    .like("observacoes", "%Vaga de teste E2E%")

  if (error) {
    console.error("Error getting test data count:", error)
    return 0
  }

  return count || 0
}

/**
 * Ensure test data exists
 * If no test data exists, seed it
 * Returns the number of test records available
 */
export async function ensureTestData(): Promise<number> {
  const existingCount = await getTestDataCount()

  if (existingCount === 0) {
    console.log("No test data found, seeding...")
    await seedTestData()
    return SAMPLE_VAGAS.length
  }

  console.log(`Found ${existingCount} existing test records`)
  return existingCount
}
