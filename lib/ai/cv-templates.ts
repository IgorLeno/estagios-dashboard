import type { CVTemplate } from "./types"
import type { CandidateData } from "./candidate-data"
import { CANDIDATE } from "./candidate-data"
import { loadCandidateData } from "./candidate-profile-adapter"

/**
 * CV Templates — Maps bilingual CandidateData to language-specific CVTemplate
 *
 * Sections marked FIXED are never modified by LLM personalization.
 * Sections marked PERSONALIZABLE are rewritten/reordered by the resume pipeline.
 */

function buildTemplate(language: "pt" | "en", candidateData: CandidateData): CVTemplate {
  const c = candidateData
  const isPt = language === "pt"

  return {
    language,

    // FIXED: Never modify header
    header: {
      name: c.identity.name,
      title: "",
      tagline: isPt ? c.tagline_pt : c.tagline_en,
      email: c.identity.email,
      phone: c.identity.phone,
      location: isPt ? c.identity.location_pt : c.identity.location_en,
      links: c.identity.links,
    },

    // PERSONALIZABLE: LLM can rewrite this section (80-120 words)
    summary: isPt ? c.summary_pt : c.summary_en,

    // FIXED: Never modify experience section
    experience: [],

    // FIXED: Never modify education
    education: c.education.map((edu) => ({
      degree: isPt ? edu.degree_pt : edu.degree_en,
      institution: isPt ? edu.institution_pt : edu.institution_en,
      period: isPt ? edu.period_pt : edu.period_en,
      location: edu.location,
    })),

    // PERSONALIZABLE: LLM can reorder items within categories (NEVER add new skills)
    skills: c.skills.map((skill) => ({
      category: isPt ? skill.category_pt : skill.category_en,
      items: isPt ? [...skill.items_pt] : [...skill.items_en],
    })),

    // PERSONALIZABLE: LLM can rewrite descriptions (NEVER change titles or dates)
    projects: c.projects.map((proj) => ({
      title: isPt ? proj.title_pt : proj.title_en,
      description: isPt ? [...proj.description_pt] : [...proj.description_en],
    })),

    // FIXED: Never modify languages
    languages: c.languages.map((lang) => ({
      language: isPt ? lang.language_pt : lang.language_en,
      proficiency: isPt ? lang.proficiency_pt : lang.proficiency_en,
    })),

    // FIXED: Never modify certifications
    certifications: isPt ? [...c.certifications_pt] : [...c.certifications_en],
  }
}

/** @deprecated Use getCVTemplateForUser() instead — loads from DB */
export const CV_TEMPLATE_PT: CVTemplate = buildTemplate("pt", CANDIDATE)

/** @deprecated Use getCVTemplateForUser() instead — loads from DB */
export const CV_TEMPLATE_EN: CVTemplate = buildTemplate("en", CANDIDATE)

/**
 * @deprecated Use getCVTemplateForUser() instead — loads from DB
 */
export function getCVTemplate(language: "pt" | "en"): CVTemplate {
  return language === "pt" ? CV_TEMPLATE_PT : CV_TEMPLATE_EN
}

/**
 * Get CV template for a specific user, loading their profile from DB.
 * New users get empty templates (not hardcoded data).
 */
export async function getCVTemplateForUser(language: "pt" | "en", userId?: string): Promise<CVTemplate> {
  const candidateData = await loadCandidateData(userId)
  return buildTemplate(language, candidateData)
}
