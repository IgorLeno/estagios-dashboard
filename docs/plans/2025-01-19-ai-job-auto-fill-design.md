# AI Job Description Auto-Fill Feature

**Date:** 2025-01-19
**Status:** Design Complete
**Author:** Claude Code + User Collaboration
**Related:** Phase 1 AI Job Parser (2025-01-17)

## Objective

Enable users to paste raw job descriptions into the "Add Job" form, analyze them with AI, and auto-populate all form fields with extracted data.

## Current State

- API endpoint `/api/ai/parse-job` exists and works
- Returns structured job details (empresa, cargo, requisitos, etc.)
- Form uses manual entry or markdown file upload
- No textarea for pasting raw job descriptions
- Frontend doesn't consume AI response to auto-fill fields

## Desired State

Users paste job descriptions into a textarea, click "Analyze with AI," and the system auto-fills all form fields. Users review the data and save.

## Architecture

### Component Hierarchy

```
AddVagaDialog (State Container)
├── Tabs (Radix UI)
│   ├── TabsList
│   │   ├── "AI Parser" (default)
│   │   ├── "Manual Entry"
│   │   └── "Upload .md"
│   ├── TabsContent["ai-parser"]
│   │   └── AiParserTab
│   ├── TabsContent["manual"]
│   │   └── ManualEntryTab
│   └── TabsContent["upload"]
│       └── MarkdownUploadTab
└── Dialog Footer (Cancel/Submit)
```

### State Management

**AddVagaDialog** maintains centralized state:

- `formData` - Shared across all tabs (empresa, cargo, local, etc.)
- `activeTab` - Controlled tab state ("ai-parser" | "manual" | "upload")
- `loading` - Submit loading state
- `config` - User configuration for date logic

### Data Flow (One-Way)

1. **AI Parser Tab** → Parse API → Update `formData` → Switch to "manual" tab
2. **Upload .md Tab** → Parse markdown → Update `formData` → Switch to "manual" tab
3. **Manual Entry Tab** → User review/edit → Submit to Supabase

Only Manual Entry Tab has a Submit button. AI Parser and Upload tabs are preprocessing steps that feed the Manual tab.

## Component Implementations

### AiParserTab (`components/tabs/ai-parser-tab.tsx`)

**Responsibilities:**

- Display textarea for job description input
- Trigger AI parsing via `/api/ai/parse-job`
- Show loading states during analysis
- Handle errors with graceful degradation
- Call `onComplete()` to switch to manual tab on success

**State:**

```typescript
const [jobDescription, setJobDescription] = useState("")
const [analyzing, setAnalyzing] = useState(false)
const [error, setError] = useState<string | null>(null)
```

**Key Functions:**

```typescript
async function handleAnalyze() {
  setAnalyzing(true)
  setError(null)

  try {
    const response = await fetch("/api/ai/parse-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobDescription }),
    })

    const result = await response.json()

    if (result.success) {
      const mapped = mapJobDetailsToFormData(result.data)
      setFormData((prev) => ({ ...prev, ...mapped }))
      toast.success("Analysis complete! Review the data.")
      onComplete() // Auto-switch to manual tab
    } else {
      handleError(response.status, result.error)
    }
  } catch (err) {
    setError("Network error. Check connection and try again.")
    toast.error("Connection failed")
  } finally {
    setAnalyzing(false)
  }
}
```

**Error Handling:**

- **429 (Rate Limit):** "Rate limit reached. Try again in a moment or enter manually."
- **504 (Timeout):** "Analysis timed out. Try shorter description or enter manually."
- **400 (Validation):** "Could not parse format. Check description or enter manually."
- **Network:** "Network error. Check connection and try again."

**UI Elements:**

- Textarea with character counter (50-50,000 chars)
- "Analyze with AI" button (disabled if < 50 chars or analyzing)
- Loading state: "Analyzing with AI..." + spinner
- Error alert with "Try Again" and "Switch to Manual" buttons
- Success feedback before auto-switching

### ManualEntryTab (`components/tabs/manual-entry-tab.tsx`)

**Responsibilities:**

- Display all form fields for review/editing
- Receive pre-filled data from AI Parser or Upload tabs
- Validate input before submission
- Submit to Supabase via parent's `onSubmit` callback

**Props:**

```typescript
interface ManualEntryTabProps {
  formData: FormData
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void
  onSubmit: (e: React.FormEvent) => Promise<void>
  loading: boolean
}
```

**Structure:**

Extracts existing form JSX from `add-vaga-dialog.tsx` (lines 134-293):

- Empresa, cargo, local, modalidade fields
- Fit fields: requisitos, fit (0-5 star rating)
- Status/etapa fields
- Observacoes textarea
- Submit button

**Key Points:**

- Stateless - all state comes from props
- Reusable - can be used in EditVagaDialog later
- HTML5 validation (required attributes, number constraints)

### MarkdownUploadTab (`components/tabs/markdown-upload-tab.tsx`)

**Responsibilities:**

- Wrap existing `MarkdownUpload` component
- Handle upload completion callback
- Auto-switch to manual tab after successful parse
- Maintain consistent behavior with AI Parser tab

**Props:**

```typescript
interface MarkdownUploadTabProps {
  formData: FormData
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void
  onComplete: () => void
}
```

**Implementation:**

```typescript
export function MarkdownUploadTab({ formData, setFormData, onComplete }: MarkdownUploadTabProps) {
  function handleParsedData(parsed: ParsedVagaData) {
    setFormData((prev) => ({
      ...prev,
      ...(parsed.empresa && { empresa: parsed.empresa }),
      ...(parsed.cargo && { cargo: parsed.cargo }),
      ...(parsed.local && { local: parsed.local }),
      ...(parsed.modalidade && { modalidade: parsed.modalidade }),
      ...(parsed.requisitos !== undefined && { requisitos: parsed.requisitos.toString() }),
      ...(parsed.fit !== undefined && { fit: parsed.fit.toString() }),
      ...(parsed.etapa && { etapa: parsed.etapa }),
      ...(parsed.status && { status: parsed.status }),
      ...(parsed.observacoes && { observacoes: parsed.observacoes }),
    }))

    toast.success("Fields auto-filled from markdown!")
    setTimeout(() => onComplete(), 1500) // Short delay to show success
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload a markdown analysis file (.md) to automatically extract job details.
      </p>

      <MarkdownUpload
        onUploadComplete={(url, parsedData) => {
          setFormData(prev => ({ ...prev, arquivo_analise_url: url }))
          if (parsedData) handleParsedData(parsedData)
        }}
        onParseComplete={handleParsedData}
        currentFile={formData.arquivo_analise_url}
        label="Job Analysis (.md)"
        autoFillFields={true}
      />

      <FileUpload
        onUploadComplete={(url) => setFormData(prev => ({ ...prev, arquivo_cv_url: url }))}
        currentFile={formData.arquivo_cv_url}
        label="Resume (PDF/DOCX)"
      />
    </div>
  )
}
```

### AddVagaDialog Orchestrator (`components/add-vaga-dialog.tsx`)

**Responsibilities:**

- Manage centralized state
- Orchestrate tab switching
- Handle Supabase submission
- Provide callbacks to child tabs

**State:**

```typescript
const [formData, setFormData] = useState<FormData>({
  empresa: "",
  cargo: "",
  local: "",
  modalidade: "Presencial",
  requisitos: "",
  fit: "",
  etapa: "",
  status: "Pendente",
  observacoes: "",
  arquivo_analise_url: "",
  arquivo_cv_url: "",
})
const [activeTab, setActiveTab] = useState("ai-parser") // Default to AI Parser
const [loading, setLoading] = useState(false)
const [config, setConfig] = useState<Configuracao | null>(null)
```

**Key Functions:**

```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  setLoading(true)

  try {
    const dataInscricao = getDataInscricao(new Date(), config || undefined)

    const { error } = await supabase.from("vagas_estagio").insert({
      empresa: formData.empresa,
      cargo: formData.cargo,
      local: formData.local,
      modalidade: formData.modalidade,
      requisitos: normalizeRatingForSave(formData.requisitos),
      fit: normalizeRatingForSave(formData.fit),
      etapa: formData.etapa || null,
      status: formData.status,
      observacoes: formData.observacoes || null,
      arquivo_analise_url: formData.arquivo_analise_url || null,
      arquivo_cv_url: formData.arquivo_cv_url || null,
      data_inscricao: dataInscricao,
    })

    if (error) throw error

    toast.success("Job added successfully!")
    resetForm()
    onOpenChange(false)
    onSuccess()
  } catch (error) {
    console.error("Error adding job:", error)
    toast.error("Failed to add job. Try again.")
  } finally {
    setLoading(false)
  }
}

function resetForm() {
  setFormData({
    empresa: "",
    cargo: "",
    local: "",
    modalidade: "Presencial",
    requisitos: "",
    fit: "",
    etapa: "",
    status: "Pendente",
    observacoes: "",
    arquivo_analise_url: "",
    arquivo_cv_url: "",
  })
  setActiveTab("ai-parser")
}

function handleTabComplete() {
  setActiveTab("manual")
}
```

**JSX Structure:**

```typescript
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Add New Job</DialogTitle>
      <DialogDescription>
        Use AI parsing, manual entry, or upload markdown file
      </DialogDescription>
    </DialogHeader>

    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="ai-parser">AI Parser</TabsTrigger>
        <TabsTrigger value="manual">Manual Entry</TabsTrigger>
        <TabsTrigger value="upload">Upload .md</TabsTrigger>
      </TabsList>

      <TabsContent value="ai-parser">
        <AiParserTab
          formData={formData}
          setFormData={setFormData}
          onComplete={handleTabComplete}
        />
      </TabsContent>

      <TabsContent value="manual">
        <ManualEntryTab
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          loading={loading}
        />
      </TabsContent>

      <TabsContent value="upload">
        <MarkdownUploadTab
          formData={formData}
          setFormData={setFormData}
          onComplete={handleTabComplete}
        />
      </TabsContent>
    </Tabs>

    <div className="flex justify-end gap-2 pt-4 border-t">
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={loading}
      >
        Cancel
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

## Data Mapping Helper

**File:** `lib/utils/ai-mapper.ts`

Maps API response (`JobDetails`) to form data structure:

```typescript
export function mapJobDetailsToFormData(apiData: JobDetails): Partial<FormData> {
  return {
    empresa: apiData.empresa,
    cargo: apiData.cargo,
    local: apiData.local,
    modalidade: apiData.modalidade,
    requisitos: apiData.requisitos_score?.toString() || "",
    fit: apiData.fit?.toString() || "",
    etapa: apiData.etapa || "",
    status: apiData.status || "Pendente",
    observacoes: buildObservacoes(apiData),
  }
}

function buildObservacoes(data: JobDetails): string {
  const sections = []

  if (data.requisitos_obrigatorios.length > 0) {
    sections.push("**Requisitos Obrigatórios:**\n" + data.requisitos_obrigatorios.map((r) => `- ${r}`).join("\n"))
  }

  if (data.requisitos_desejaveis.length > 0) {
    sections.push("**Requisitos Desejáveis:**\n" + data.requisitos_desejaveis.map((r) => `- ${r}`).join("\n"))
  }

  if (data.responsabilidades.length > 0) {
    sections.push("**Responsabilidades:**\n" + data.responsabilidades.map((r) => `- ${r}`).join("\n"))
  }

  if (data.beneficios.length > 0) {
    sections.push("**Benefícios:**\n" + data.beneficios.map((r) => `- ${r}`).join("\n"))
  }

  return sections.join("\n\n")
}
```

## User Flows

### Flow 1: AI Parser (Primary Path)

1. User opens "Add Job" dialog
2. Sees "AI Parser" tab (default)
3. Pastes job description into textarea
4. Clicks "Analyze with AI"
5. [Loading state: "Analyzing with AI..."]
6. System calls `/api/ai/parse-job`
7. API extracts structured data
8. Form auto-fills with extracted data
9. Dialog auto-switches to "Manual Entry" tab
10. User reviews and adjusts data if needed
11. User clicks "Salvar Vaga"
12. System saves to Supabase
13. Success toast appears
14. Dialog closes

### Flow 2: AI Parser with Error

1. User opens dialog, pastes description
2. Clicks "Analyze with AI"
3. API returns 429 (rate limit)
4. Error shows: "Rate limit reached. Try again in a moment or enter manually."
5. User has two options:
   - Click "Try Again" (retry after delay)
   - Click "Switch to Manual" (proceed with manual entry)
6. If manual chosen: switches to "Manual Entry" tab with partial data (if any)
7. User completes form manually
8. Saves successfully

### Flow 3: Manual Entry (Direct Path)

1. User opens dialog
2. Clicks "Manual Entry" tab
3. Fills all fields manually
4. Clicks "Salvar Vaga"
5. System saves to Supabase
6. Success toast appears
7. Dialog closes

### Flow 4: Upload .md File

1. User opens dialog
2. Clicks "Upload .md" tab
3. Drags markdown file or clicks to upload
4. System uploads to Supabase Storage
5. System parses markdown content
6. Form auto-fills with parsed data
7. Dialog auto-switches to "Manual Entry" tab
8. User reviews data
9. Saves successfully

## Error Handling Strategy

### Graceful Degradation

The system never blocks users completely. All errors provide fallback options.

**Error Types:**

| Error Code | Message                                                          | Actions                     |
| ---------- | ---------------------------------------------------------------- | --------------------------- |
| 429        | "Rate limit reached. Try again or enter manually."               | Try Again, Switch to Manual |
| 504        | "Analysis timed out. Try shorter description or enter manually." | Try Again, Switch to Manual |
| 400        | "Could not parse format. Check description or enter manually."   | Back, Switch to Manual      |
| Network    | "Network error. Check connection and try again."                 | Try Again, Switch to Manual |

**Partial Success:**

If API parses some fields but not all:

1. Pre-fill extracted fields
2. Auto-switch to Manual tab
3. Show toast: "Partial extraction: empresa, cargo. Complete remaining fields."
4. User completes missing fields
5. Saves successfully

## Testing Strategy

### Unit Tests

**AiParserTab** (`__tests__/components/tabs/ai-parser-tab.test.tsx`):

- Renders textarea and analyze button
- Disables button when input < 50 chars
- Calls API on analyze
- Handles 429 rate limit error
- Handles 504 timeout error
- Handles network errors
- Calls onComplete after successful parse
- Updates formData via setFormData prop

**ManualEntryTab** (`__tests__/components/tabs/manual-entry-tab.test.tsx`):

- Renders all form fields
- Displays pre-filled data from props
- Calls onSubmit when form submitted
- Validates required fields
- Shows loading state on submit button

**MarkdownUploadTab** (`__tests__/components/tabs/markdown-upload-tab.test.tsx`):

- Renders MarkdownUpload component
- Calls onComplete after successful parse
- Updates formData with parsed data
- Handles file upload errors

### Integration Tests

**AddVagaDialog** (`__tests__/components/add-vaga-dialog.test.tsx`):

- Defaults to AI Parser tab
- Switches to manual tab after AI parse
- Allows manual tab switch without parsing
- Shares formData across all tabs
- Resets form on dialog close
- Calls onSuccess after save

### E2E Tests (Optional - Playwright)

**Complete AI Parsing Flow:**

```typescript
test("complete AI parsing flow", async ({ page }) => {
  await page.goto("/")
  await page.click('text="Add Job"')

  // Should default to AI Parser tab
  await expect(page.locator("textarea")).toBeVisible()

  // Paste job description
  await page.fill("textarea", JOB_DESCRIPTION)
  await page.click('text="Analyze with AI"')

  // Wait for analysis and auto-switch
  await expect(page.locator('text="Manual Entry"')).toHaveClass(/active/)

  // Verify pre-filled fields
  await expect(page.locator('input[name="empresa"]')).toHaveValue("Google")

  // Submit
  await page.click('text="Salvar Vaga"')
  await expect(page.locator('text="Job added successfully!"')).toBeVisible()
})
```

## File Structure

```
components/
├── add-vaga-dialog.tsx              (Refactored orchestrator)
└── tabs/
    ├── ai-parser-tab.tsx            (NEW - AI parsing logic)
    ├── manual-entry-tab.tsx         (NEW - extracted form)
    └── markdown-upload-tab.tsx      (NEW - upload wrapper)

lib/utils/
└── ai-mapper.ts                     (NEW - API response mapper)

__tests__/components/
├── add-vaga-dialog.test.tsx         (Updated)
└── tabs/
    ├── ai-parser-tab.test.tsx       (NEW)
    ├── manual-entry-tab.test.tsx    (NEW)
    └── markdown-upload-tab.test.tsx (NEW)
```

## Success Criteria

**Functional:**

- ✅ Textarea accepts job descriptions (50-50,000 chars)
- ✅ "Analyze with AI" button calls `/api/ai/parse-job`
- ✅ All form fields auto-populate with extracted data
- ✅ Users can review and adjust before saving
- ✅ Error handling shows clear messages with fallback options
- ✅ Toast notifications for success/error states
- ✅ Auto-switch to manual tab after preprocessing

**Non-Functional:**

- ✅ Build succeeds with no errors
- ✅ All tests pass (unit + integration)
- ✅ No TypeScript errors
- ✅ No lint warnings
- ✅ Existing functionality unchanged (backward compatible)

**UX:**

- ✅ AI Parser is default first tab (promotes AI usage)
- ✅ Loading states clearly communicate progress
- ✅ Error messages are actionable
- ✅ Smooth transitions between tabs
- ✅ No data loss when switching tabs
- ✅ Consistent behavior across all three input methods

## Deployment Checklist

**Pre-Deploy:**

1. Create feature branch: `feature/ai-job-auto-fill`
2. Implement all components
3. Write unit tests
4. Run local tests: `pnpm test`
5. Run linting: `pnpm lint`
6. Run type checking: `pnpm tsc --noEmit`
7. Run build: `pnpm build`
8. Test manually with real API calls

**Staging:**

1. Deploy to Vercel preview
2. Test with production-like data
3. Verify Gemini API integration
4. Test all three input paths
5. Test error scenarios (rate limits, timeouts)

**Production:**

1. Merge to main
2. Monitor API usage and rate limits
3. Track user adoption (which tabs are used most)
4. Gather feedback for iterations
5. Watch for errors in logs

## Monitoring Metrics

**API Metrics:**

- Success rate of `/api/ai/parse-job` calls
- Error rate by type (429, 504, 400, network)
- Average response time
- Token usage per request

**User Behavior:**

- Tab usage distribution (AI vs Manual vs Upload)
- Completion rate per input method
- Time saved vs manual entry
- Fields most commonly auto-filled
- Fields most commonly manually adjusted

**Quality Metrics:**

- Accuracy of auto-filled fields
- Percentage of partial successes
- User corrections after AI parsing
- Save success rate per input method

## Future Enhancements

1. **Visual indicators** for AI-filled fields (subtle background color)
2. **Confidence scores** for extracted data
3. **Inline editing** within AI Parser tab (skip manual tab for high confidence)
4. **History** of parsed descriptions
5. **Batch parsing** for multiple job descriptions
6. **Export** parsed data as markdown template
7. **Analytics dashboard** showing AI usage and accuracy

## Dependencies

**Existing (No New Dependencies):**

- Radix UI Tabs (already installed)
- Sonner (toast notifications, already installed)
- Zod (validation, already installed)
- `/api/ai/parse-job` endpoint (already implemented)

## Related Documentation

- AI Job Parser Phase 1: `docs/plans/2025-01-17-ai-job-parser-design.md`
- Markdown Parser: `lib/markdown-parser.ts`
- Form Components: `components/CLAUDE.md`
- API Integration: `CLAUDE.md` (AI Job Parser section)

---

**Design Status:** ✅ Complete and ready for implementation planning
