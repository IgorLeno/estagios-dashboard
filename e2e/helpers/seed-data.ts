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
 * Seed database with test data (idempotent and race-safe)
 * Verifies existing records before inserting to prevent duplicates
 * Returns the actual number of test records in the database after seeding
 */
export async function seedTestData(): Promise<number> {
  const supabase = createClient()

  // Buscar todas as vagas de teste existentes em uma única query
  const { data: existingVagas, error: fetchError } = await supabase
    .from("vagas_estagio")
    .select("empresa, observacoes")
    .like("observacoes", "%Vaga de teste E2E%")

  if (fetchError) {
    console.error("Error fetching existing test data:", fetchError)
    throw fetchError
  }

  // Criar um Set com chaves únicas (empresa + observacoes) para busca rápida
  const existingKeys = new Set(
    (existingVagas || []).map((v) => `${v.empresa}|${v.observacoes}`)
  )

  // Filtrar vagas que ainda não existem
  const vagasToInsert = SAMPLE_VAGAS.filter(
    (vaga) => !existingKeys.has(`${vaga.empresa}|${vaga.observacoes}`)
  )

  // Inserir apenas as vagas que não existem
  if (vagasToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("vagas_estagio")
      .insert(vagasToInsert)

    if (insertError) {
      // Se erro for de duplicata (race condition com processo concorrente), ignorar
      // Erro 23505 = unique constraint violation
      // Outros erros devem ser lançados
      if (insertError.code !== "23505") {
        console.error("Error inserting test data:", insertError)
        throw insertError
      }
      // Em caso de race condition, não fazer nada - os dados já existem
    }
  }

  // Re-query para obter o count real do banco (após possíveis inserções concorrentes)
  // Isso garante que retornamos o count correto mesmo se outros processos inseriram dados
  const { count, error: countError } = await supabase
    .from("vagas_estagio")
    .select("*", { count: "exact", head: true })
    .like("observacoes", "%Vaga de teste E2E%")

  if (countError) {
    console.error("Error getting final test data count:", countError)
    // Best-effort estimate: if insert failed due to 23505, records exist but count is unknown
    return existingVagas?.length || 0
  }

  return count || 0
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
 * Ensure test data exists (race-safe and idempotent)
 * Seeds test data if needed, handling concurrent processes safely
 * Returns the actual number of test records in the database
 */
export async function ensureTestData(): Promise<number> {
  // seedTestData é idempotente, então podemos chamar diretamente
  // Ele verifica duplicatas internamente e retorna o count real
  console.log("Ensuring test data exists...")
  const finalCount = await seedTestData()

  if (finalCount === 0) {
    // Se após seeding ainda não há dados, pode ser que outras vagas de teste
    // com diferentes padrões existam, ou houve erro
    const existingCount = await getTestDataCount()
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing test records (different pattern)`)
      return existingCount
    }
    console.log("Warning: No test data found after seeding attempt")
    return 0
  }

  console.log(`Ensured ${finalCount} test records exist`)
  return finalCount
}
