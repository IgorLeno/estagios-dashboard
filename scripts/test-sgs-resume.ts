/**
 * Test script: Generate resume for SGS laboratory job
 * Tests the new context detection and reframing system
 *
 * Run: npx tsx scripts/test-sgs-resume.ts
 *
 * NOTE: This is a dry-run test that validates context detection logic
 * without actually calling the LLM (requires Next.js request context)
 */

import { detectJobContext, getContextDescription } from "../lib/ai/job-context-detector"
import { getCVTemplate } from "../lib/ai/cv-templates"
import type { JobDetails } from "../lib/ai/types"

// SGS job details (laboratory context)
const sgsJobDetails: JobDetails = {
  empresa: "SGS",
  cargo: "Estagiário de Laboratório QHSE",
  local: "Guarujá, SP",
  modalidade: "Presencial",
  tipo_vaga: "Estágio",
  requisitos_obrigatorios: [
    "Cursando Engenharia Química, Química ou áreas afins",
    "Preparação de soluções",
    "Pesagem de reagentes",
    "Conhecimento em ISO 17025",
    "Pacote Office Básico",
    "Higiene Ocupacional e meio ambiente",
  ],
  requisitos_desejaveis: [
    "AIHA (American Industrial Hygiene Association)",
    "Experiência em controle de amostras",
    "Organização de laboratório",
  ],
  responsabilidades: [
    "Auxiliar nas atividades laboratoriais",
    "Preparar soluções e reagentes",
    "Realizar controle de amostras",
    "Organizar vidrarias e equipamentos",
    "Apoiar em análises químicas",
    "Manter organização do laboratório",
    "Seguir normas de higiene e segurança (ISO 17025)",
  ],
  beneficios: [],
  salario: null,
  idioma_vaga: "pt",
}

async function main() {
  console.log("=".repeat(80))
  console.log("🧪 TESTING SGS LABORATORY JOB - CONTEXT DETECTION & TEMPLATE")
  console.log("=".repeat(80))
  console.log("\n📋 Job Details:")
  console.log(`  Company: ${sgsJobDetails.empresa}`)
  console.log(`  Position: ${sgsJobDetails.cargo}`)
  console.log(`  Location: ${sgsJobDetails.local}`)
  console.log(`  Required Skills: ${sgsJobDetails.requisitos_obrigatorios.slice(0, 3).join(", ")}...`)
  console.log("\n🎯 Testing context detection...\n")

  try {
    // Step 1: Detect context
    const jobContext = detectJobContext(sgsJobDetails)
    const contextDesc = getContextDescription(jobContext)

    console.log("=".repeat(80))
    console.log("✅ CONTEXT DETECTION SUCCESSFUL")
    console.log("=".repeat(80))
    console.log(`\n🎯 Detected Context: ${jobContext}`)
    console.log(`📝 Description: ${contextDesc}`)

    // Step 2: Get base template (shows what skills are now available)
    const baseTemplate = getCVTemplate("pt")

    console.log("\n" + "=".repeat(80))
    console.log("📋 BASE CV TEMPLATE - Skills Available")
    console.log("=".repeat(80))
    baseTemplate.skills.forEach((category, index) => {
      console.log(`\n${index + 1}. ${category.category}`)
      category.items.forEach((item) => {
        console.log(`   - ${item}`)
      })
    })

    console.log("\n" + "=".repeat(80))
    console.log("✅ VALIDATION CHECKLIST - Base Configuration")
    console.log("=".repeat(80))

    // Run validation checks on base template and context detection
    const checks = {
      context_is_laboratory: jobContext === "laboratory",
      template_has_lab_category: baseTemplate.skills.some(
        (cat) => cat.category.toLowerCase().includes("laboratório") || cat.category.toLowerCase().includes("química")
      ),
      lab_category_is_first:
        baseTemplate.skills[0].category.toLowerCase().includes("laboratório") ||
        baseTemplate.skills[0].category.toLowerCase().includes("química"),
      lab_skills_include_preparacao: baseTemplate.skills[0].items.some((item) =>
        item.toLowerCase().includes("preparação")
      ),
      lab_skills_include_titulacao: baseTemplate.skills[0].items.some((item) => item.toLowerCase().includes("titula")),
      python_not_in_first_category: !baseTemplate.skills[0].items.some((item) => item.toLowerCase().includes("python")),
    }

    console.log(`  ✅ Context detected as LABORATORY: ${checks.context_is_laboratory ? "✅ SIM" : "❌ NÃO"}`)
    console.log(`  ✅ Template has Lab category: ${checks.template_has_lab_category ? "✅ SIM" : "❌ NÃO"}`)
    console.log(`  ✅ Lab category appears FIRST: ${checks.lab_category_is_first ? "✅ SIM" : "❌ NÃO"}`)
    console.log(`  ✅ Lab skills include "Preparação": ${checks.lab_skills_include_preparacao ? "✅ SIM" : "❌ NÃO"}`)
    console.log(`  ✅ Lab skills include "Titulação": ${checks.lab_skills_include_titulacao ? "✅ SIM" : "❌ NÃO"}`)
    console.log(`  ✅ Python NOT in 1st category: ${checks.python_not_in_first_category ? "✅ SIM" : "❌ NÃO"}`)

    const passedChecks = Object.values(checks).filter((v) => v).length
    const totalChecks = Object.keys(checks).length

    console.log(
      `\n📊 VALIDATION SCORE: ${passedChecks}/${totalChecks} checks passed (${Math.round((passedChecks / totalChecks) * 100)}%)`
    )

    if (passedChecks === totalChecks) {
      console.log("\n🎉 ALL BASE CHECKS PASSED! System infrastructure is correct! 🎉")
      console.log("\n📝 NOTE: Full LLM-based personalization requires running in Next.js context.")
      console.log("   Test via UI at: http://localhost:3000/test-ai or vaga detail page")
    } else {
      console.log("\n⚠️  Some checks failed. Review the output above.")
    }

    console.log("\n" + "=".repeat(80))
    console.log("📋 SUMMARY OF CHANGES")
    console.log("=".repeat(80))
    console.log(`
✅ NEW FILES CREATED:
   - lib/ai/job-context-detector.ts (Context detection logic)
   - lib/ai/context-specific-instructions.ts (Domain-specific prompts)
   - migrations/003_seed_laboratory_skills.sql (Lab skills migration)

✅ MODIFIED FILES:
   - lib/ai/resume-prompts.ts (Removed keyword stuffing, added context injection)
   - lib/ai/resume-generator.ts (Added context detection step)
   - lib/ai/cv-templates.ts (Added laboratory skills category)

✅ EXPECTED BEHAVIOR FOR SGS JOB:
   When generating resume via UI:
   1. System detects "laboratory" context
   2. Injects laboratory-specific instructions to LLM
   3. LLM prioritizes lab skills (preparação, titulações)
   4. LLM uses ISO 17025 naturally (1-2x max, not 3+x)
   5. LLM reframes Grimperium as "controle de qualidade", not "Python pipeline"
   6. Skills appear in order: Lab → Data → Engineering → BI → Soft Skills
    `)
    console.log("\n" + "=".repeat(80))
  } catch (error) {
    console.error("\n❌ ERROR:", error)
    if (error instanceof Error) {
      console.error("Message:", error.message)
      console.error("Stack:", error.stack)
    }
    process.exit(1)
  }
}

main()
