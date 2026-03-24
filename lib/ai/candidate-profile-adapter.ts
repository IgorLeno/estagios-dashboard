import type { CandidateProfile } from "@/lib/types"
import type { CandidateData } from "./candidate-data"
import type { Certification } from "./types"
import { getCandidateProfile } from "@/lib/supabase/candidate-profile"

/**
 * Convert DB shape (CandidateProfile) to pipeline shape (CandidateData).
 * Falls back to PT when EN is empty.
 */
export function toCandidateData(profile: CandidateProfile): CandidateData {
  return {
    identity: {
      name: profile.nome,
      email: profile.email,
      phone: profile.telefone,
      location_pt: profile.localizacao_pt,
      location_en: profile.localizacao_en || profile.localizacao_pt,
      links: [
        ...(profile.linkedin ? [{ label: "LinkedIn", url: profile.linkedin }] : []),
        ...(profile.github ? [{ label: "GitHub", url: profile.github }] : []),
      ],
    },

    education: profile.educacao.map((edu) => ({
      degree_pt: edu.degree_pt,
      degree_en: edu.degree_en || edu.degree_pt,
      institution_pt: edu.institution_pt,
      institution_en: edu.institution_en || edu.institution_pt,
      period_pt: edu.period_pt,
      period_en: edu.period_en || edu.period_pt,
      location: edu.location || "",
    })),

    skills: profile.habilidades.map((skill) => ({
      category_pt: skill.category_pt,
      category_en: skill.category_en || skill.category_pt,
      items_pt: skill.items_pt,
      items_en: skill.items_en?.length ? skill.items_en : skill.items_pt,
    })),

    projects: profile.projetos.map((proj) => ({
      title_pt: proj.title_pt,
      title_en: proj.title_en || proj.title_pt,
      description_pt: proj.description_pt,
      description_en: proj.description_en?.length ? proj.description_en : proj.description_pt,
    })),

    languages: profile.idiomas.map((lang) => ({
      language_pt: lang.language_pt,
      language_en: lang.language_en || lang.language_pt,
      proficiency_pt: lang.proficiency_pt,
      proficiency_en: lang.proficiency_en || lang.proficiency_pt,
    })),

    certifications_pt: profile.certificacoes.map(
      (c): Certification => ({
        title: c.title_pt,
        institution: c.institution_pt || undefined,
        year: c.year || undefined,
      })
    ),
    certifications_en: profile.certificacoes.map(
      (c): Certification => ({
        title: c.title_en || c.title_pt,
        institution: c.institution_en || c.institution_pt || undefined,
        year: c.year || undefined,
      })
    ),

    summary_pt: profile.objetivo_pt,
    summary_en: profile.objetivo_en || profile.objetivo_pt,
  }
}

/**
 * Load candidate data from DB, converted to pipeline shape.
 * Empty profile → empty CandidateData (NOT Igor's hardcoded data).
 */
export async function loadCandidateData(userId?: string): Promise<CandidateData> {
  const profile = await getCandidateProfile(userId)
  return toCandidateData(profile)
}
