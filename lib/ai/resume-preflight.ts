import type { CVTemplate } from "./types"

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

export function validateCVTemplate(cv: CVTemplate): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  const summaryWordCount = countWords(cv.summary)
  const skillCategoryCount = cv.skills.length
  const totalSkills = cv.skills.reduce((sum, group) => sum + group.items.length, 0)

  if (summaryWordCount < 40) {
    errors.push(`Resumo deve ter pelo menos 40 palavras (atual: ${summaryWordCount}).`)
  } else if (summaryWordCount < 60) {
    warnings.push(`Resumo abaixo do ideal de 60 palavras (atual: ${summaryWordCount}).`)
  }

  if (skillCategoryCount > 6) {
    errors.push(`Skills excedem o máximo de 6 categorias (atual: ${skillCategoryCount}).`)
  } else if (skillCategoryCount < 2) {
    warnings.push(`Skills com menos de 2 categorias (atual: ${skillCategoryCount}).`)
  }

  if (totalSkills > 24) {
    errors.push(`Skills excedem o limite duro de 24 itens (atual: ${totalSkills}).`)
  }

  if (cv.certifications.length > 5) {
    warnings.push(`Certificações acima do recomendado de 5 itens (atual: ${cv.certifications.length}).`)
  }

  if (cv.projects.length > 4) {
    warnings.push(`Projetos acima do recomendado de 4 itens (atual: ${cv.projects.length}).`)
  }

  cv.projects.forEach((project, index) => {
    const bulletCount = project.description.length
    const projectLabel = project.title || `Projeto ${index + 1}`

    if (bulletCount > 3) {
      errors.push(`Projeto "${projectLabel}" excede o máximo de 3 bullets (atual: ${bulletCount}).`)
    }

    if (cv.projects.length > 1 && bulletCount < 2) {
      errors.push(`Projeto "${projectLabel}" deve ter ao menos 2 bullets quando há múltiplos projetos.`)
    }

    project.description.forEach((bullet, bulletIndex) => {
      if (bullet.length > 130) {
        warnings.push(
          `Bullet ${bulletIndex + 1} do projeto "${projectLabel}" excede 130 caracteres (atual: ${bullet.length}).`
        )
      }
    })
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
