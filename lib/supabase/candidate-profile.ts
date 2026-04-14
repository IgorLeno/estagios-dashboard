import { createClient } from "./server"
import type { CandidateProfile } from "@/lib/types"
import { EMPTY_CANDIDATE_PROFILE } from "@/lib/types"

/**
 * Get candidate profile for user
 * Returns EMPTY_CANDIDATE_PROFILE if none exists (new accounts get blank fields)
 */
export async function getCandidateProfile(userId?: string): Promise<CandidateProfile> {
  const supabase = await createClient()

  if (userId) {
    const { data, error } = await supabase
      .from("candidate_profile")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      console.error("[CandidateProfile] Error fetching profile:", error)
    } else if (data) {
      return data as CandidateProfile
    }
  }

  // Return empty profile (NOT Igor's data)
  return {
    id: "empty",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...EMPTY_CANDIDATE_PROFILE,
  }
}

/**
 * Save or update candidate profile (upsert pattern)
 */
export async function saveCandidateProfile(
  profile: Omit<CandidateProfile, "id" | "created_at" | "updated_at">,
  userId: string
): Promise<CandidateProfile> {
  const supabase = await createClient()
  // NOTE: requires DB migration: ALTER TABLE candidate_profile ADD COLUMN tagline_pt TEXT DEFAULT '', tagline_en TEXT DEFAULT '';

  console.log(`[CandidateProfile] Saving profile for user: ${userId}`)

  const { data: existing } = await supabase
    .from("candidate_profile")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle()

  if (existing) {
    console.log(`[CandidateProfile] Profile exists (id: ${existing.id}), updating...`)
    const { data, error } = await supabase
      .from("candidate_profile")
      .update({
        nome: profile.nome,
        email: profile.email,
        telefone: profile.telefone,
        linkedin: profile.linkedin,
        github: profile.github,
        localizacao_pt: profile.localizacao_pt,
        localizacao_en: profile.localizacao_en,
        disponibilidade: profile.disponibilidade,
        educacao: profile.educacao,
        idiomas: profile.idiomas,
        objetivo_pt: profile.objetivo_pt,
        objetivo_en: profile.objetivo_en,
        tagline_pt: profile.tagline_pt,
        tagline_en: profile.tagline_en,
        curriculo_geral_md: profile.curriculo_geral_md,
        habilidades: profile.habilidades,
        projetos: profile.projetos,
        certificacoes: profile.certificacoes,
      })
      .eq("id", existing.id)
      .select()
      .single()

    if (error) {
      console.error("[CandidateProfile] Error updating:", error)
      throw new Error(`Failed to update candidate profile: ${error.message}`)
    }

    console.log("[CandidateProfile] Profile updated successfully")
    return data as CandidateProfile
  } else {
    console.log("[CandidateProfile] No profile exists, inserting...")
    const { data, error } = await supabase
      .from("candidate_profile")
      .insert({
        user_id: userId,
        nome: profile.nome,
        email: profile.email,
        telefone: profile.telefone,
        linkedin: profile.linkedin,
        github: profile.github,
        localizacao_pt: profile.localizacao_pt,
        localizacao_en: profile.localizacao_en,
        disponibilidade: profile.disponibilidade,
        educacao: profile.educacao,
        idiomas: profile.idiomas,
        objetivo_pt: profile.objetivo_pt,
        objetivo_en: profile.objetivo_en,
        tagline_pt: profile.tagline_pt,
        tagline_en: profile.tagline_en,
        curriculo_geral_md: profile.curriculo_geral_md,
        habilidades: profile.habilidades,
        projetos: profile.projetos,
        certificacoes: profile.certificacoes,
      })
      .select()
      .single()

    if (error) {
      console.error("[CandidateProfile] Error inserting:", error)
      throw new Error(`Failed to save candidate profile: ${error.message}`)
    }

    console.log(`[CandidateProfile] Profile inserted (id: ${data.id})`)
    return data as CandidateProfile
  }
}

/**
 * Reset candidate profile — deletes the row, next load returns empty
 */
export async function resetCandidateProfile(userId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from("candidate_profile").delete().eq("user_id", userId)

  if (error) {
    console.error("[CandidateProfile] Error resetting:", error)
    throw new Error(`Failed to reset candidate profile: ${error.message}`)
  }

  console.log(`[CandidateProfile] Profile reset for user ${userId}`)
}
