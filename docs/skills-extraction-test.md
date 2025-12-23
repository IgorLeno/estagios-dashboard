# Skills Extraction System - Test Guide

## 📋 Overview

Sistema de extração automatizada de skills via LLM (Grok 4.1 Fast) a partir de dossiê/currículo profissional.

## 🏗️ Architecture

```
User Profile Text (Dossiê/CV)
    ↓
[Grok 4.1 Fast] → Extracts structured skills with categories
    ↓
[Zod Validation] → Validates schema and business rules
    ↓
[Bulk Insert] → Populates user_skills_bank in single operation
    ↓
✅ Skills Bank ready for resume generation
```

## 📂 Files Created

| File                                           | Purpose                                |
| ---------------------------------------------- | -------------------------------------- |
| `lib/ai/skills-extractor-prompt.ts`            | LLM system prompt for skill extraction |
| `lib/ai/skills-extractor.ts`                   | Core extraction logic + validation     |
| `lib/ai/skills-bank-seeder.ts`                 | Database seeding (replace/merge modes) |
| `app/api/skills/extract-from-profile/route.ts` | API endpoint (POST/GET)                |
| `components/skills-import-dialog.tsx`          | UI dialog component                    |

## 🧪 Manual Testing

### Test 1: API Health Check

```bash
curl http://localhost:3000/api/skills/extract-from-profile
```

**Expected Output:**

```json
{
  "status": "ok",
  "message": "Skills Extraction API is running",
  "endpoints": {
    "extract": "POST /api/skills/extract-from-profile"
  }
}
```

---

### Test 2: Extract Skills (Short Profile)

**Input Profile:**

```
Engenheiro Químico pela UNESP, desenvolvi o projeto Grimperium em Python com Pandas e CREST para automação de dados moleculares. Na iniciação científica, usei GAMESS para cálculos quânticos. Tenho certificação em Deep Learning e Power BI. Experiência em laboratório com preparação de soluções e titulações.
```

**API Request:**

```bash
curl -X POST http://localhost:3000/api/skills/extract-from-profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "profileText": "Engenheiro Químico pela UNESP, desenvolvi o projeto Grimperium em Python com Pandas e CREST para automação de dados moleculares. Na iniciação científica, usei GAMESS para cálculos quânticos. Tenho certificação em Deep Learning e Power BI. Experiência em laboratório com preparação de soluções e titulações.",
    "mode": "replace"
  }'
```

**Expected Skills Extracted:**

| Category               | Expected Skills                            |
| ---------------------- | ------------------------------------------ |
| **Programming & Data** | Python (Pandas), Deep Learning             |
| **Engineering Tools**  | CREST, GAMESS                              |
| **Visualization & BI** | Power BI                                   |
| **Soft Skills**        | Resolução de problemas, Gestão de projetos |

**Expected Response:**

```json
{
  "success": true,
  "message": "Successfully extracted and saved 6-10 skills",
  "data": {
    "skills_count": 6-10,
    "mode": "replace",
    "categories_summary": {
      "programming_and_data": 2-3,
      "engineering_tools": 2,
      "visualization_and_bi": 1,
      "soft_skills": 1-3
    }
  },
  "metadata": {
    "duration": 3000-8000
  }
}
```

---

### Test 3: Full Dossiê (Igor's Complete Profile)

**Input Profile:**

```
PERFIL PROFISSIONAL

Igor Leno de Souza Fernandes
Engenharia Química - UNESP Araraquara
Graduação prevista: Dezembro/2026

PROJETOS DE PESQUISA

1. Grimperium - Pipeline Automatizado de Dados Termodinâmicos para Machine Learning (2023-2025)
   - Desenvolvimento de pipeline end-to-end em Python
   - Integração com PubChemPy, CREST, MOPAC
   - Automação de workflows com Typer e Questionary
   - Controle de qualidade de dados termodinâmicos
   - Tecnologias: Python (Pandas, NumPy), CREST, MOPAC, OpenBabel, Git/GitHub

2. Iniciação Científica - Química Quântica Computacional para Equilíbrio Líquido-Vapor (2022-2023)
   - Cálculos ab initio com GAMESS
   - Modelagem UNIQUAC para sistemas binários
   - Análise estatística de desvios
   - Apresentação no Congresso de Iniciação Científica (CIC-UNESP)

CERTIFICAÇÕES

- Deep Learning Specialization (Coursera/DeepLearning.AI, 2024)
- Power BI Impressionador (Hashtag Treinamentos, 2023)
- SQL Impressionador (Hashtag Treinamentos, 2023)
- Google Data Analytics (Coursera, 2023)

EXPERIÊNCIA LABORATORIAL

Disciplinas experimentais na UNESP:
- Química Analítica Qualitativa e Quantitativa
- Físico-Química Experimental
- Química Orgânica e Inorgânica Experimental

Atividades:
- Preparação de soluções e reagentes
- Titulação e análises volumétricas
- Síntese química e caracterização
- Controle de pH, temperatura
- Organização e limpeza laboratorial
- Descarte de resíduos conforme normas

COMPETÊNCIAS TÉCNICAS

- Python (Pandas, NumPy, Scikit-learn, TensorFlow): Avançado, uso frequente
- SQL: Intermediário, uso ocasional
- R: Básico
- VBA: Intermediário
- Excel Avançado (Tabelas Dinâmicas, Macros, Power Query): Avançado
- Power BI: Intermediário
- GAMESS: Intermediário (cálculos quânticos)
- CREST: Intermediário (busca conformacional)
- MOPAC: Intermediário (cálculos semi-empíricos)
- Aspen Plus: Intermediário (simulação de processos)
- Git/GitHub: Intermediário

SOFT SKILLS

- Resolução de problemas
- Aprendizado autodidata
- Trabalho em equipe
- Atenção aos detalhes
- Gestão de projetos
- Comunicação técnica
```

**Expected Skills Count:** 25-35 skills

**Expected Categories Breakdown:**

- Programming & Data: 8-12 skills
- Engineering Tools: 6-8 skills
- Visualization & BI: 3-4 skills
- Soft Skills: 6-8 skills

---

## 🎯 Validation Criteria

### ✅ Success Criteria

1. **Minimum Skills:** At least 5 skills extracted
2. **Correct Categories:** Skills correctly mapped to 4 categories
3. **Proficiency Levels:** Realistic proficiency (Básico/Intermediário/Avançado)
4. **No Duplicates:** No duplicate skill names within same category
5. **Descriptions:** Each skill has meaningful description (10+ chars)
6. **API Response:** Returns success=true with skills_count

### ❌ Failure Scenarios

1. **LLM Hallucination:** Skills not mentioned in profile
2. **Wrong Categories:** SQL in "Soft Skills" instead of "Programming & Data"
3. **Invalid Proficiency:** "Expert" instead of "Avançado"
4. **Missing Descriptions:** Empty or too short descriptions
5. **Duplicate Skills:** Same skill appears twice in category

---

## 🔍 Database Verification

After running extraction, verify in Supabase:

```sql
-- Check inserted skills
SELECT skill_name, category, proficiency
FROM user_skills_bank
WHERE user_id = 'YOUR_USER_ID'
ORDER BY category, skill_name;

-- Count by category
SELECT category, COUNT(*) as count
FROM user_skills_bank
WHERE user_id = 'YOUR_USER_ID'
GROUP BY category;
```

**Expected Categories in DB:**

- Linguagens & Análise de Dados
- Ferramentas de Engenharia
- Visualização & BI
- Soft Skills

---

## 📊 Performance Benchmarks

| Profile Length            | Expected Duration | Token Usage  |
| ------------------------- | ----------------- | ------------ |
| 200-500 chars             | 3-5s              | ~800 tokens  |
| 500-1000 chars            | 5-8s              | ~1200 tokens |
| 1000-2000 chars           | 8-15s             | ~2000 tokens |
| Full dossiê (2000+ chars) | 10-20s            | ~2500 tokens |

---

## 🐛 Troubleshooting

### Error: "Profile text too short"

**Solution:** Provide at least 50 characters

### Error: "LLM response does not contain valid JSON"

**Solution:** Check Grok API key, verify API is accessible

### Error: "Extracted only X skills (minimum 5 expected)"

**Solution:** Provide more detailed profile text with explicit skills

### Error: "Duplicate skill names found in category"

**Solution:** LLM bug - regenerate extraction

### Error: "Unauthorized"

**Solution:** Ensure user is authenticated (valid session token)

---

## 🚀 Integration with Resume Generator

After skills are extracted, they're automatically available for resume generation:

```typescript
// In resume-generator.ts
const skillsBank = await loadUserSkillsBank(userId)
// → Returns all extracted skills from user_skills_bank

// LLM can now add skills from bank to CV if job-relevant
```

**Benefits:**

- No manual skill entry (1-click import)
- Skills categorized automatically
- Proficiency levels inferred from context
- Ready for ATS-optimized resume generation

---

## 📝 Next Steps

1. **Test in UI:**
   - Open Skills Import Dialog
   - Paste dossiê
   - Click "Extrair Skills"
   - Verify success toast shows correct count

2. **Verify in Database:**
   - Check `user_skills_bank` table
   - Verify categories, proficiency levels
   - Ensure no duplicates

3. **Test Resume Generation:**
   - Generate resume for a job
   - Verify skills from bank are used
   - Check ATS score improvement

---

**System Status:** ✅ Ready for Testing

**Created:** 2025-12-11
**Last Updated:** 2025-12-11
