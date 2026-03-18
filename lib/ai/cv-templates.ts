import type { CVTemplate } from "./types"
import { CANDIDATE } from "./candidate-data"

/**
 * CV Templates — Maps bilingual CandidateData to language-specific CVTemplate
 *
 * All candidate content is sourced from candidate-data.ts (single source of truth).
 * This file only handles the PT/EN mapping.
 *
 * Sections marked FIXED are never modified by LLM personalization.
 * Sections marked PERSONALIZABLE are rewritten/reordered by the resume pipeline.
 */

function buildTemplate(language: "pt" | "en"): CVTemplate {
  const c = CANDIDATE
  const isPt = language === "pt"

  return {
    language,

    // FIXED: Never modify header
    header: {
      name: c.identity.name,
      title: "",
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

/** Portuguese CV Template — derived from CANDIDATE data */
export const CV_TEMPLATE_PT: CVTemplate = buildTemplate("pt")

/** English CV Template — derived from CANDIDATE data */
export const CV_TEMPLATE_EN: CVTemplate = buildTemplate("en")

/**
 * Get CV template by language
 * @param language - Target language (pt or en)
 * @returns CV template for the specified language
 */
export function getCVTemplate(language: "pt" | "en"): CVTemplate {
  return language === "pt" ? CV_TEMPLATE_PT : CV_TEMPLATE_EN
}
