# Tailored Resume Generator - Design Document

**Date:** 2025-01-21
**Status:** Approved
**Author:** Claude Code (with user validation)

## Overview

Generate personalized resumes tailored to specific job descriptions using LLM (Gemini 2.5 Flash). The system personalizes three sections—Professional Summary, Skills & Tools, and Research Projects—while maintaining exact formatting from CV templates. Output format is PDF for immediate download.

## Goals

- Generate ATS-optimized resumes from job descriptions
- Personalize content without fabrication (moderate smart enhancement)
- Maintain exact visual formatting from existing CV templates
- Support both Portuguese and English
- Integrate seamlessly with existing AI job parser
- Deploy on Vercel (no server dependencies)

## Non-Goals (Future Phases)

- Resume storage/versioning in database
- Side-by-side comparison UI
- Batch resume generation
- Custom template editor

## User Flow

```
User analyzes job via AI Parser (or views existing vaga)
  ↓
Clicks "Generate Tailored Resume"
  ↓
Selects language (PT/EN)
  ↓
System personalizes 3 sections using LLM
  ↓
PDF generated with exact CV formatting
  ↓
User downloads PDF
```

## Architecture

### High-Level Components

```
┌─────────────────────┐
│   Frontend UI       │
│  - Test AI page     │
│  - Vaga details     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  API Endpoint       │
│  /api/ai/           │
│  generate-resume    │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐  ┌──────────────┐
│   LLM   │  │ CV Templates │
│ Gemini  │  │   (PT/EN)    │
└─────────┘  └──────────────┘
     │           │
     └─────┬─────┘
           ▼
    ┌──────────────┐
    │ HTML Template│
    └──────┬───────┘
           ▼
    ┌──────────────┐
    │  Puppeteer   │
    │  PDF Export  │
    └──────────────┘
```

### Key Design Decisions

1. **DOCX Manipulation → HTML + Puppeteer**
   - Initial plan: Parse/modify existing DOCX files
   - **Final decision:** Recreate CV in HTML/CSS, render PDF with Puppeteer
   - **Rationale:** Vercel-friendly (no LibreOffice dependency), Playwright already installed, easier testing

2. **Structured CV Templates in Code**
   - Store full CV content as TypeScript objects (`lib/ai/cv-templates.ts`)
   - Separate files for PT and EN
   - **Benefits:** Type-safe, version-controlled, fast runtime, no DOCX parsing

3. **Moderate Smart Enhancement**
   - LLM adds skills only if user has demonstrated experience
   - Reorders existing content by relevance
   - Rewrites project descriptions to emphasize job-relevant aspects
   - **No fabrication:** All claims must be backed by existing CV content

4. **Multiple Entry Points**
   - Test AI page: Generate immediately after job parsing
   - Vaga details page: Generate for any existing vaga
   - **Flexibility:** Supports both new and historical job applications

## Data Model

### CV Template Structure

```typescript
interface CVTemplate {
  language: "pt" | "en"

  // Static sections (never modified)
  header: {
    name: string
    title: string
    email: string
    phone: string
    location: string
    links: { label: string; url: string }[]
  }

  experience: {
    title: string
    company: string
    period: string
    location: string
    description: string[]
  }[]

  education: {
    degree: string
    institution: string
    period: string
    location: string
  }[]

  languages: {
    language: string
    proficiency: string
  }[]

  certifications: string[]

  // Personalizable sections (LLM-modified)
  summary: string

  skills: {
    category: string  // e.g., "Programming Languages"
    items: string[]
  }[]

  projects: {
    title: string
    description: string[]  // 2-3 bullet points
  }[]
}
```

### API Request/Response

**Request:**
```typescript
POST /api/ai/generate-resume

{
  vagaId?: string           // Option 1: From existing vaga
  jobDescription?: string   // Option 2: From raw text
  language: "pt" | "en"     // Required
}
```

**Response (Success):**
```typescript
{
  success: true
  data: {
    pdfBase64: string       // Base64-encoded PDF
    filename: string        // e.g., "cv-igor-fernandes-tailored-saipem.pdf"
    atsScore?: number       // Optional: keyword match %
  }
  metadata: {
    duration: number        // milliseconds
    model: string           // "gemini-2.5-flash"
    tokenUsage: {
      inputTokens: number
      outputTokens: number
      totalTokens: number
    }
    personalizedSections: string[]  // ["summary", "skills", "projects"]
  }
}
```

**Response (Error):**
```typescript
{
  success: false
  error: string
  details?: any
}
```

## LLM Prompt Design

### Strategy: Moderate Smart Enhancement

Each section gets a dedicated prompt with specific constraints:

#### 1. Professional Summary

**Input:**
- Job requirements (from parsed JobDetails)
- Original summary from CV template
- User's skills and experience

**Output:** 3-4 sentences, 80-120 words

**Instructions:**
- Include top 5-7 keywords from job posting
- Emphasize experience matching job requirements
- Maintain professional tone
- Quantify achievements where possible
- Keep truthful (no fabrication)

**Example Prompt:**
```
You are a resume writing expert. Rewrite the professional summary to target this job:

JOB REQUIREMENTS:
{job_requirements}

ORIGINAL SUMMARY:
{original_summary}

USER SKILLS:
{user_skills}

Instructions:
- Include these keywords naturally: {top_keywords}
- Emphasize relevant experience
- 3-4 sentences, 80-120 words
- Professional tone
- No fabrication

Return JSON: { "summary": "..." }
```

#### 2. Skills & Tools

**Input:**
- Job required skills
- User's full skill list (from CV template)
- User's project history (evidence)

**Output:** Reordered + augmented skill list

**Instructions:**
- Reorder existing skills by relevance to job
- Add job-specific skills ONLY if user has demonstrated experience in projects
- Use project history as evidence for skill claims
- Keep all original skills (don't remove)
- Format: categorized (Languages, Frameworks, Tools, etc.)

**Example Prompt:**
```
Reorder and enhance the skills list for this job:

JOB REQUIRED SKILLS:
{job_skills}

USER'S CURRENT SKILLS:
{current_skills}

USER'S PROJECTS (as evidence):
{projects}

Instructions:
- Reorder by relevance to job
- Add job skills ONLY if projects demonstrate them
- Keep all original skills
- Return categorized list

Return JSON: { "skills": [{ "category": "...", "items": [...] }] }
```

#### 3. Research Projects

**Input:**
- Job responsibilities
- User's projects (from CV template)

**Output:** Rewritten project descriptions

**Instructions:**
- Keep all projects (don't remove any)
- Rewrite descriptions to highlight job-relevant aspects
- Use job keywords naturally
- Emphasize technologies/methodologies matching job
- Format: 2-3 bullet points per project

**Example Prompt:**
```
Rewrite project descriptions to emphasize relevance to this job:

JOB RESPONSIBILITIES:
{job_responsibilities}

CURRENT PROJECTS:
{current_projects}

Instructions:
- Keep all projects
- Rewrite descriptions to highlight job-relevant work
- Use these keywords naturally: {job_keywords}
- 2-3 bullet points per project
- Emphasize matching technologies

Return JSON: { "projects": [{ "title": "...", "description": [...] }] }
```

### LLM Configuration

- **Model:** `gemini-2.5-flash` (same as job parser)
- **Temperature:** `0.3` (slightly higher than parsing for creativity)
- **Max Output Tokens:** `4096` per section
- **Fallback Chain:** Same as existing job parser
- **System Instruction:** "You are a professional resume writer specializing in ATS optimization and honest skill representation."

### Execution Strategy

**Parallel Execution:**
- Call all 3 prompts in parallel for speed
- Use `Promise.all()` to wait for all sections
- Total LLM time: ~3-5 seconds (vs. 9-15 if sequential)

**Error Handling:**
- If any section fails → use original content as fallback
- Log which sections were personalized in metadata
- Continue generation with partial personalization

## HTML/CSS Template Design

### Visual Design Requirements

Recreate exact styling from `saipem-cv-igor_fernandes.pdf`:

**Layout:**
- Single column, A4 proportions (210mm × 297mm)
- Margins: 20mm top/bottom, 20mm left/right

**Typography:**
- Font: Arial/Helvetica (sans-serif)
- Header name: 24pt, bold
- Section headings: 14pt, bold, uppercase
- Body text: 11pt, regular
- Line height: 1.4

**Spacing:**
- Section gap: 16px
- Subsection gap: 12px
- List item gap: 6px

**Sections:**
- Header: Name, title, contact info, links
- Professional Summary: Paragraph format
- Experience: Company, title, period, bullets
- Education: Degree, institution, period
- Skills & Tools: Categorized lists
- Research Projects: Title + bullets
- Languages: Name + proficiency
- Certifications: List

**Styling Approach:**
- Inline CSS for Puppeteer compatibility
- Print optimization with `@media print`
- Page break control (`page-break-inside: avoid`)

### HTML Structure

```html
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <style>
    /* Inline styles for Puppeteer */
    @page { size: A4; margin: 20mm; }
    body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; }
    .header { text-align: center; margin-bottom: 20px; }
    .section { margin-bottom: 16px; page-break-inside: avoid; }
    /* ... more styles */
  </style>
</head>
<body>
  <div class="header">
    <h1>{name}</h1>
    <p>{title}</p>
    <p>{contact info}</p>
  </div>

  <div class="section">
    <h2>Professional Summary</h2>
    <p>{personalized_summary}</p>
  </div>

  <!-- More sections -->
</body>
</html>
```

### PDF Generation (Puppeteer)

```typescript
import puppeteer from 'puppeteer'

async function generatePDF(htmlContent: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Vercel compatibility
  })

  const page = await browser.newPage()
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' })

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' }
  })

  await browser.close()
  return pdf
}
```

## File Structure

```
lib/ai/
├── cv-templates.ts           # CV content (PT/EN)
├── resume-generator.ts       # Main generation logic
├── resume-prompts.ts         # LLM prompt templates
├── resume-html-template.ts   # HTML/CSS generation
└── types.ts                  # Add resume types

app/api/ai/
└── generate-resume/
    └── route.ts              # API endpoint

components/
├── resume-generator-button.tsx   # Reusable trigger
└── resume-generator-dialog.tsx   # Modal UI

__tests__/
├── lib/ai/
│   ├── resume-generator.test.ts
│   └── resume-html-template.test.ts
└── app/api/ai/
    └── generate-resume.test.ts
```

## API Implementation

### Endpoint: POST /api/ai/generate-resume

**Data Flow:**

1. **Input Validation** (Zod schema)
   - Validate vagaId OR jobDescription
   - Validate language (pt/en)

2. **Fetch Job Data**
   - If vagaId: Query Supabase for vaga details
   - If jobDescription: Use directly

3. **Load CV Template**
   - Select PT or EN template based on language param
   - Clone template for modification

4. **Personalize Sections (Parallel)**
   ```typescript
   const [summary, skills, projects] = await Promise.all([
     personalizeSummary(jobData, template),
     personalizeSkills(jobData, template),
     personalizeProjects(jobData, template)
   ])
   ```

5. **Merge Personalized Content**
   - Replace template sections with personalized versions
   - Keep all static sections unchanged

6. **Generate HTML**
   - Populate HTML template with merged CV data
   - Apply styling

7. **Render PDF**
   - Launch Puppeteer
   - Convert HTML → PDF buffer

8. **Return Response**
   - Base64-encode PDF
   - Include metadata (duration, model, tokens)
   - Generate filename: `cv-igor-fernandes-tailored-{empresa}.pdf`

### Error Handling

**Input Errors (400):**
- Missing vagaId AND jobDescription
- Invalid language
- Vaga not found

**Timeout (408):**
- LLM takes >60 seconds
- Suggest retry

**Quota Exceeded (429):**
- Same handling as job parser
- Fallback to alternative models
- Return retry-after header

**Server Errors (500):**
- LLM failure
- Puppeteer crash
- JSON parsing error
- Return details for debugging

### Performance

**Expected Duration:**
- LLM calls (parallel): 3-5 seconds
- HTML generation: <100ms
- PDF rendering: 2-3 seconds
- **Total:** 5-8 seconds

**Timeout:** 60 seconds (configurable)

**Optimization:**
- Reuse Puppeteer browser instance (if possible)
- Cache CV templates in memory
- Stream PDF response (don't load full buffer)

## Frontend Integration

### Component: ResumeGeneratorButton

**Props:**
```typescript
interface ResumeGeneratorButtonProps {
  vagaId?: string
  jobDescription?: string
  variant?: "default" | "outline"
  className?: string
}
```

**Behavior:**
- Renders button: "Generate Tailored Resume"
- Opens ResumeGeneratorDialog on click
- Disabled if neither vagaId nor jobDescription provided

### Component: ResumeGeneratorDialog

**States:**
1. **Idle:** Language selection (PT/EN radio buttons)
2. **Loading:** Progress indicator, estimated time (5-8s)
3. **Success:** Download button, optional preview
4. **Error:** Error message, retry button

**UI Elements:**
- Language toggle (PT/EN)
- Generate button (primary action)
- Loading spinner + progress text
- Download PDF button (on success)
- ATS score badge (if calculated)

**Download Logic:**
```typescript
function downloadPDF(base64: string, filename: string) {
  const blob = base64ToBlob(base64, 'application/pdf')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

### Integration Points

**A) Test AI Page (`app/test-ai/page.tsx`)**

After successful job parsing:
```tsx
{parseResult && (
  <ResumeGeneratorButton
    jobDescription={jobDescription}
    className="mt-4"
  />
)}
```

**B) Vaga Details Page (`app/vaga/[id]/page.tsx`)**

In page header or actions section:
```tsx
<div className="flex gap-2">
  <Button variant="outline">Edit</Button>
  <ResumeGeneratorButton vagaId={params.id} />
</div>
```

## Testing Strategy

### Unit Tests

**lib/ai/resume-generator.test.ts** (12-15 test cases)
- Personalize summary with keywords
- Reorder skills by relevance
- Add skills only with evidence
- Rewrite project descriptions
- Handle missing job data
- Fallback on LLM error
- Validate JSON output

**lib/ai/resume-html-template.test.ts** (8-10 test cases)
- Generate valid HTML
- Apply correct styling
- Handle special characters
- Support PT and EN
- Responsive layout

**app/api/ai/generate-resume.test.ts** (10-12 test cases)
- Validate request schema
- Fetch vaga by ID
- Return PDF buffer
- Handle quota errors
- Return proper error codes
- Include metadata

### Integration Tests

- Full flow: job description → PDF
- Test with real CV templates
- Verify PDF format (A4, margins)
- Check filename generation

### Manual Testing

- Test with real job postings (LinkedIn, Indeed)
- Verify visual match to original CV
- Check ATS optimization (jobscan.co)
- Validate PT and EN versions

## Dependencies

**New:**
```json
{
  "dependencies": {
    "puppeteer": "^21.0.0"
  },
  "devDependencies": {
    "@types/puppeteer": "^7.0.4"
  }
}
```

**Existing (reused):**
- `@google/generative-ai` - LLM calls
- `zod` - Validation
- `@playwright/test` - Already installed (Puppeteer alternative)

**Note:** Playwright can also generate PDFs via `page.pdf()`. Consider using existing Playwright instead of adding Puppeteer.

## Deployment Considerations

**Vercel Compatibility:**
- Puppeteer works on Vercel with `chromium` binary
- No LibreOffice dependency needed
- Serverless function timeout: 60 seconds (Pro plan)

**Environment Variables:**
- `GOOGLE_API_KEY` - Already configured
- `AI_PARSING_TIMEOUT_MS` - Reuse existing config

**Edge Cases:**
- Large CVs (>2 pages): Ensure page breaks work
- Special characters: Test UTF-8 encoding
- Rate limits: Same handling as job parser

## Future Enhancements

**Phase 2: Resume Storage**
- Save generated PDFs to Supabase Storage
- Link to vaga_estagio table
- Resume version history

**Phase 3: ATS Scoring**
- Calculate keyword match percentage
- Suggest improvements
- Highlight missing keywords

**Phase 4: Custom Templates**
- Allow users to upload custom CV templates
- Template editor UI
- Multi-template support

**Phase 5: Batch Generation**
- Generate resumes for multiple vagas at once
- Queue system for background processing
- Email delivery

## Success Metrics

- ✅ PDF matches original CV formatting (visual inspection)
- ✅ All 3 sections personalized (metadata confirmation)
- ✅ Keywords from job posting included (ATS score >70%)
- ✅ No fabricated skills (manual verification)
- ✅ Generation time <10 seconds (95th percentile)
- ✅ Error rate <5% (excluding quota errors)
- ✅ Works for both PT and EN
- ✅ All tests passing (40+ test cases)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM hallucinates skills | High | Explicit prompt constraints, validation against project history |
| PDF formatting breaks | Medium | Extensive testing, fallback to DOCX if needed |
| Puppeteer timeout on Vercel | Medium | Optimize HTML rendering, increase timeout to 60s |
| Quota exhaustion | Low | Reuse existing fallback chain, clear error messages |
| HTML doesn't match CV styling | High | Extract exact styles from PDF, side-by-side comparison |

## Conclusion

This design provides a complete AI-powered resume generator that:
- Integrates seamlessly with existing AI job parser
- Maintains visual consistency with original CV templates
- Optimizes for ATS without fabrication
- Deploys on Vercel without server dependencies
- Supports both Portuguese and English
- Delivers professional PDF output in 5-8 seconds

The moderate smart enhancement strategy ensures resumes remain truthful while maximizing keyword optimization. HTML + Puppeteer approach avoids deployment complexity while maintaining formatting precision.

---

**Next Steps:**
1. Create git worktree for isolated development
2. Write detailed implementation plan
3. Execute in batches with review checkpoints
