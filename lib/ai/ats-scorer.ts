import type { CVTemplate, JobDetails } from "./types"

/**
 * ATS Keywords Interface
 * Represents extracted keywords from job description for ATS optimization
 */
export interface ATSKeywords {
  technical_terms: string[] // Repeated technical terms (2+ occurrences)
  required_skills: string[] // From requisitos_obrigatorios
  action_verbs: string[] // Job duty verbs (desenvolver, implementar, etc.)
  certifications: string[] // Standards (ISO 17025, OSHA, etc.)
  exact_phrases: string[] // Multi-word critical terms
  acronyms: string[] // 2-5 letter acronyms (QHSE, KPI, SQL)
}

/**
 * Extract ATS keywords from job description
 * This will be implemented in resume-prompts.ts
 * This is a forward declaration for the scorer
 */
export function extractATSKeywords(jobDetails: JobDetails): ATSKeywords {
  // This function will be properly implemented in resume-prompts.ts
  // This is just a stub for type checking
  throw new Error("extractATSKeywords must be imported from resume-prompts.ts")
}

/**
 * Calculate ATS compatibility score (0-100)
 * Analyzes keyword matching between CV and job requirements
 *
 * Scoring algorithm:
 * - Required Skills Match: 40 points max (8 points per match, up to 5 matches)
 * - Technical Terms Match: 25 points max (3 points per match, up to 8 matches)
 * - Action Verbs Match: 15 points max (3 points per match, up to 5 matches)
 * - Exact Phrases Match: 10 points max (5 points per match, up to 2 matches)
 * - Acronyms Match: 10 points max (2 points per match, up to 5 matches)
 *
 * @param cv - Personalized CV template
 * @param jobDetails - Job description details
 * @param atsKeywords - Pre-extracted ATS keywords (optional, will extract if not provided)
 * @returns ATS score from 0 to 100
 */
export function calculateATSScore(
  cv: CVTemplate,
  jobDetails: JobDetails,
  atsKeywords?: ATSKeywords
): number {
  // Extract keywords if not provided
  let keywords = atsKeywords
  if (!keywords) {
    // Import dynamically to avoid circular dependency
    // In production, keywords should be passed from resume generator
    const { extractATSKeywords: extractFn } = require("./resume-prompts")
    keywords = extractFn(jobDetails)
  }

  // Convert entire CV to lowercase for case-insensitive matching
  const cvText = JSON.stringify(cv).toLowerCase()
  const cvTextOriginal = JSON.stringify(cv) // For case-sensitive acronyms

  let totalPoints = 0
  const maxPoints = 100

  // 1. Required Skills Match (40 points max)
  const requiredSkillsMatched = keywords.required_skills.filter((skill) =>
    cvText.includes(skill.toLowerCase())
  ).length

  const requiredSkillsScore = Math.min(requiredSkillsMatched * 8, 40)
  totalPoints += requiredSkillsScore

  // 2. Technical Terms Match (25 points max)
  const technicalMatched = keywords.technical_terms.filter((term) =>
    cvText.includes(term.toLowerCase())
  ).length

  const technicalScore = Math.min(technicalMatched * 3, 25)
  totalPoints += technicalScore

  // 3. Action Verbs Match (15 points max)
  const verbsMatched = keywords.action_verbs.filter((verb) =>
    cvText.includes(verb.toLowerCase())
  ).length

  const verbsScore = Math.min(verbsMatched * 3, 15)
  totalPoints += verbsScore

  // 4. Exact Phrases Match (10 points max)
  const phrasesMatched = keywords.exact_phrases.filter((phrase) =>
    cvText.includes(phrase.toLowerCase())
  ).length

  const phrasesScore = Math.min(phrasesMatched * 5, 10)
  totalPoints += phrasesScore

  // 5. Acronyms Match (10 points max)
  // Case-sensitive matching for acronyms
  const acronymsMatched = keywords.acronyms.filter((acronym) =>
    cvTextOriginal.includes(acronym)
  ).length

  const acronymsScore = Math.min(acronymsMatched * 2, 10)
  totalPoints += acronymsScore

  // Calculate final score as percentage
  const score = Math.round((totalPoints / maxPoints) * 100)

  // Log detailed breakdown for debugging
  console.log(`[ATS Scorer] Score: ${score}% (${totalPoints}/${maxPoints} points)`)
  console.log(
    `  - Required skills: ${requiredSkillsMatched}/${keywords.required_skills.length} (${requiredSkillsScore} pts)`
  )
  console.log(
    `  - Technical terms: ${technicalMatched}/${keywords.technical_terms.length} (${technicalScore} pts)`
  )
  console.log(`  - Action verbs: ${verbsMatched}/${keywords.action_verbs.length} (${verbsScore} pts)`)
  console.log(
    `  - Exact phrases: ${phrasesMatched}/${keywords.exact_phrases.length} (${phrasesScore} pts)`
  )
  console.log(`  - Acronyms: ${acronymsMatched}/${keywords.acronyms.length} (${acronymsScore} pts)`)

  return score
}

/**
 * Get ATS score interpretation message
 *
 * @param score - ATS score (0-100)
 * @returns Human-readable interpretation
 */
export function getATSScoreInterpretation(score: number): {
  level: "excellent" | "good" | "fair" | "poor"
  message: string
  color: string
} {
  if (score >= 80) {
    return {
      level: "excellent",
      message: "Excelente! CV altamente otimizado para ATS.",
      color: "text-green-600",
    }
  } else if (score >= 70) {
    return {
      level: "good",
      message: "Bom! CV bem otimizado para ATS.",
      color: "text-blue-600",
    }
  } else if (score >= 50) {
    return {
      level: "fair",
      message: "Razoável. CV pode ser melhorado para ATS.",
      color: "text-yellow-600",
    }
  } else {
    return {
      level: "poor",
      message: "Baixo. CV precisa de otimização significativa.",
      color: "text-red-600",
    }
  }
}

/**
 * Get detailed ATS score breakdown
 *
 * @param cv - Personalized CV template
 * @param jobDetails - Job description details
 * @param atsKeywords - Pre-extracted ATS keywords
 * @returns Detailed breakdown of score components
 */
export function getATSScoreBreakdown(
  cv: CVTemplate,
  jobDetails: JobDetails,
  atsKeywords?: ATSKeywords
): {
  score: number
  breakdown: {
    requiredSkills: { matched: number; total: number; score: number }
    technicalTerms: { matched: number; total: number; score: number }
    actionVerbs: { matched: number; total: number; score: number }
    exactPhrases: { matched: number; total: number; score: number }
    acronyms: { matched: number; total: number; score: number }
  }
  interpretation: ReturnType<typeof getATSScoreInterpretation>
} {
  // Extract keywords if not provided
  let keywords = atsKeywords
  if (!keywords) {
    const { extractATSKeywords: extractFn } = require("./resume-prompts")
    keywords = extractFn(jobDetails)
  }

  const cvText = JSON.stringify(cv).toLowerCase()
  const cvTextOriginal = JSON.stringify(cv)

  const requiredSkillsMatched = keywords.required_skills.filter((skill) =>
    cvText.includes(skill.toLowerCase())
  ).length
  const technicalMatched = keywords.technical_terms.filter((term) =>
    cvText.includes(term.toLowerCase())
  ).length
  const verbsMatched = keywords.action_verbs.filter((verb) =>
    cvText.includes(verb.toLowerCase())
  ).length
  const phrasesMatched = keywords.exact_phrases.filter((phrase) =>
    cvText.includes(phrase.toLowerCase())
  ).length
  const acronymsMatched = keywords.acronyms.filter((acronym) =>
    cvTextOriginal.includes(acronym)
  ).length

  const score = calculateATSScore(cv, jobDetails, keywords)
  const interpretation = getATSScoreInterpretation(score)

  return {
    score,
    breakdown: {
      requiredSkills: {
        matched: requiredSkillsMatched,
        total: keywords.required_skills.length,
        score: Math.min(requiredSkillsMatched * 8, 40),
      },
      technicalTerms: {
        matched: technicalMatched,
        total: keywords.technical_terms.length,
        score: Math.min(technicalMatched * 3, 25),
      },
      actionVerbs: {
        matched: verbsMatched,
        total: keywords.action_verbs.length,
        score: Math.min(verbsMatched * 3, 15),
      },
      exactPhrases: {
        matched: phrasesMatched,
        total: keywords.exact_phrases.length,
        score: Math.min(phrasesMatched * 5, 10),
      },
      acronyms: {
        matched: acronymsMatched,
        total: keywords.acronyms.length,
        score: Math.min(acronymsMatched * 2, 10),
      },
    },
    interpretation,
  }
}
