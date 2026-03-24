import type { CandidateProfile } from "@/lib/types"

function formatCertification(
  certification: CandidateProfile["certificacoes"][number]
): string {
  const details = [certification.institution_pt, certification.year].filter(Boolean).join(" - ")
  return details ? `${certification.title_pt} (${details})` : certification.title_pt
}

/**
 * Build a structured dossie text from a CandidateProfile.
 * Used to replace the hardcoded dossie_prompt for job analysis.
 */
export function buildDossieFromProfile(profile: CandidateProfile): string {
  const isEmpty =
    !profile.nome &&
    profile.educacao.length === 0 &&
    profile.habilidades.length === 0 &&
    profile.projetos.length === 0

  if (isEmpty) {
    return "Perfil do candidato nao configurado. Configure seu perfil em Configuracoes > Perfil para obter analises personalizadas."
  }

  const sections: string[] = []

  // Identity
  sections.push("PERFIL DO CANDIDATO:")
  if (profile.nome) sections.push(`- Nome: ${profile.nome}`)
  if (profile.localizacao_pt) sections.push(`- Localizacao: ${profile.localizacao_pt}`)
  if (profile.disponibilidade) sections.push(`- Disponibilidade: ${profile.disponibilidade}`)

  // Education
  if (profile.educacao.length > 0) {
    sections.push(
      `- Formacao: ${profile.educacao.map((e) => `${e.degree_pt} (${e.institution_pt})${e.period_pt ? ` - ${e.period_pt}` : ""}`).join("; ")}`
    )
  }

  // Skills
  if (profile.habilidades.length > 0) {
    const skillsSummary = profile.habilidades
      .map((h) => `${h.category_pt}: ${h.items_pt.join(", ")}`)
      .join("; ")
    sections.push(`- Principais Habilidades: ${skillsSummary}`)
  }

  // Projects
  if (profile.projetos.length > 0) {
    sections.push(
      `- Projetos: ${profile.projetos.map((p) => p.title_pt).join("; ")}`
    )
  }

  // Certifications
  if (profile.certificacoes.length > 0) {
    sections.push(
      `- Certificacoes: ${profile.certificacoes.map(formatCertification).join(", ")}`
    )
  }

  // Languages
  if (profile.idiomas.length > 0) {
    sections.push(
      `- Idiomas: ${profile.idiomas.map((i) => `${i.language_pt} (${i.proficiency_pt})`).join(", ")}`
    )
  }

  // Objective
  if (profile.objetivo_pt) {
    sections.push("")
    sections.push("OBJETIVO:")
    sections.push(profile.objetivo_pt)
  }

  // Analysis criteria (always included)
  sections.push("")
  sections.push("CRITERIOS DE FIT:")
  sections.push("5.0 estrelas: Match perfeito (90%+ dos requisitos atendidos)")
  sections.push("4.0-4.5 estrelas: Muito bom (70-89% dos requisitos)")
  sections.push("3.0-3.5 estrelas: Bom (50-69% dos requisitos)")
  sections.push("2.0-2.5 estrelas: Razoavel (30-49% dos requisitos)")
  sections.push("0.5-1.5 estrelas: Baixo (0-29% dos requisitos)")

  return sections.join("\n")
}
