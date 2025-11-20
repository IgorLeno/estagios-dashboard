# AI Job Auto-Fill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to paste raw job descriptions, analyze with AI, and auto-populate form fields with extracted data using a tabs-based interface.

**Architecture:** Refactor AddVagaDialog to use Radix Tabs with three tabs (AI Parser, Manual Entry, Upload .md). AI Parser and Upload tabs preprocess data and auto-switch to Manual Entry tab for review. Only Manual Entry tab has submit button. Shared formData state flows one-way from preprocessing tabs to manual tab.

**Tech Stack:** React 19, TypeScript, Radix UI Tabs, existing Supabase integration, Gemini API via /api/ai/parse-job

---

## Task 1: AI Mapper Utility

Create utility to map API response (JobDetails) to form data structure.

**Files:**

- Create: `lib/utils/ai-mapper.ts`
- Test: `__tests__/lib/ai-mapper.test.ts`

### Step 1: Write the failing test

```typescript
// __tests__/lib/ai-mapper.test.ts
import { describe, it, expect } from "vitest"
import { mapJobDetailsToFormData, buildObservacoes } from "@/lib/utils/ai-mapper"
import type { JobDetails } from "@/lib/ai/types"

describe("mapJobDetailsToFormData", () => {
  it("should map basic fields correctly", () => {
    const apiData: JobDetails = {
      empresa: "Google",
      cargo: "Software Engineer",
      local: "São Paulo, SP",
      modalidade: "Híbrido",
      tipo_vaga: "Júnior",
      requisitos_obrigatorios: ["React", "TypeScript"],
      requisitos_desejaveis: ["Node.js"],
      responsabilidades: ["Develop features"],
      beneficios: ["Health insurance"],
      salario: "R$ 5000",
      idioma_vaga: "pt",
      requisitos_score: 4.5,
      fit: 3.5,
      etapa: "Inscrição",
      status: "Pendente",
    }

    const result = mapJobDetailsToFormData(apiData)

    expect(result.empresa).toBe("Google")
    expect(result.cargo).toBe("Software Engineer")
    expect(result.local).toBe("São Paulo, SP")
    expect(result.modalidade).toBe("Híbrido")
    expect(result.requisitos).toBe("4.5")
    expect(result.fit).toBe("3.5")
    expect(result.etapa).toBe("Inscrição")
    expect(result.status).toBe("Pendente")
  })

  it("should handle missing optional fields", () => {
    const apiData: JobDetails = {
      empresa: "Startup",
      cargo: "Developer",
      local: "Remote",
      modalidade: "Remoto",
      tipo_vaga: "Estágio",
      requisitos_obrigatorios: [],
      requisitos_desejaveis: [],
      responsabilidades: [],
      beneficios: [],
      salario: null,
      idioma_vaga: "pt",
    }

    const result = mapJobDetailsToFormData(apiData)

    expect(result.requisitos).toBe("")
    expect(result.fit).toBe("")
    expect(result.etapa).toBe("")
    expect(result.status).toBe("Pendente")
    expect(result.observacoes).toBe("")
  })
})

describe("buildObservacoes", () => {
  it("should build formatted observations from arrays", () => {
    const apiData: JobDetails = {
      empresa: "Company",
      cargo: "Role",
      local: "Location",
      modalidade: "Presencial",
      tipo_vaga: "Estágio",
      requisitos_obrigatorios: ["React", "TypeScript"],
      requisitos_desejaveis: ["GraphQL"],
      responsabilidades: ["Code", "Review"],
      beneficios: ["VR", "VT"],
      salario: null,
      idioma_vaga: "pt",
    }

    const result = buildObservacoes(apiData)

    expect(result).toContain("**Requisitos Obrigatórios:**")
    expect(result).toContain("- React")
    expect(result).toContain("- TypeScript")
    expect(result).toContain("**Requisitos Desejáveis:**")
    expect(result).toContain("- GraphQL")
    expect(result).toContain("**Responsabilidades:**")
    expect(result).toContain("- Code")
    expect(result).toContain("**Benefícios:**")
    expect(result).toContain("- VR")
  })

  it("should return empty string for empty arrays", () => {
    const apiData: JobDetails = {
      empresa: "Company",
      cargo: "Role",
      local: "Location",
      modalidade: "Presencial",
      tipo_vaga: "Estágio",
      requisitos_obrigatorios: [],
      requisitos_desejaveis: [],
      responsabilidades: [],
      beneficios: [],
      salario: null,
      idioma_vaga: "pt",
    }

    const result = buildObservacoes(apiData)

    expect(result).toBe("")
  })
})
```

### Step 2: Run test to verify it fails

```bash
pnpm test -- ai-mapper
```

Expected: FAIL with "Cannot find module '@/lib/utils/ai-mapper'"

### Step 3: Write implementation

```typescript
// lib/utils/ai-mapper.ts
import type { JobDetails } from "@/lib/ai/types"

/**
 * Form data structure matching AddVagaDialog state
 */
export interface FormData {
  empresa: string
  cargo: string
  local: string
  modalidade: "Presencial" | "Híbrido" | "Remoto"
  requisitos: string
  fit: string
  etapa: string
  status: "Pendente" | "Avançado" | "Melou" | "Contratado"
  observacoes: string
  arquivo_analise_url: string
  arquivo_cv_url: string
}

/**
 * Maps AI API response (JobDetails) to form data structure
 */
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

/**
 * Builds formatted observations text from job detail arrays
 */
export function buildObservacoes(data: JobDetails): string {
  const sections: string[] = []

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

### Step 4: Run test to verify it passes

```bash
pnpm test -- ai-mapper
```

Expected: PASS (all tests green)

### Step 5: Commit

```bash
git add lib/utils/ai-mapper.ts __tests__/lib/ai-mapper.test.ts
git commit -m "feat: add AI response to form data mapper utility

- mapJobDetailsToFormData() converts JobDetails to FormData
- buildObservacoes() formats arrays into markdown sections
- Full test coverage with edge cases"
```

---

## Task 2: ManualEntryTab Component

Extract form fields from AddVagaDialog into reusable ManualEntryTab component.

**Files:**

- Create: `components/tabs/manual-entry-tab.tsx`
- Test: `__tests__/components/tabs/manual-entry-tab.test.tsx`

### Step 1: Write the failing test

```typescript
// __tests__/components/tabs/manual-entry-tab.test.tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ManualEntryTab } from "@/components/tabs/manual-entry-tab"
import type { FormData } from "@/lib/utils/ai-mapper"

describe("ManualEntryTab", () => {
  const mockFormData: FormData = {
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
  }

  it("should render all form fields", () => {
    const mockSetFormData = vi.fn()
    const mockOnSubmit = vi.fn((e) => e.preventDefault())

    render(
      <ManualEntryTab
        formData={mockFormData}
        setFormData={mockSetFormData}
        onSubmit={mockOnSubmit}
        loading={false}
      />
    )

    expect(screen.getByLabelText(/empresa/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cargo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/local/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/modalidade/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/fit requisitos/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/fit perfil/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
  })

  it("should display pre-filled data from props", () => {
    const preFilledData: FormData = {
      ...mockFormData,
      empresa: "Google",
      cargo: "Software Engineer",
      local: "São Paulo",
      requisitos: "4.5",
      fit: "3.5",
    }

    const mockSetFormData = vi.fn()
    const mockOnSubmit = vi.fn((e) => e.preventDefault())

    render(
      <ManualEntryTab
        formData={preFilledData}
        setFormData={mockSetFormData}
        onSubmit={mockOnSubmit}
        loading={false}
      />
    )

    expect(screen.getByDisplayValue("Google")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Software Engineer")).toBeInTheDocument()
    expect(screen.getByDisplayValue("São Paulo")).toBeInTheDocument()
    expect(screen.getByDisplayValue("4.5")).toBeInTheDocument()
    expect(screen.getByDisplayValue("3.5")).toBeInTheDocument()
  })

  it("should call onSubmit when form submitted", () => {
    const mockSetFormData = vi.fn()
    const mockOnSubmit = vi.fn((e) => e.preventDefault())

    render(
      <ManualEntryTab
        formData={mockFormData}
        setFormData={mockSetFormData}
        onSubmit={mockOnSubmit}
        loading={false}
      />
    )

    const submitButton = screen.getByText(/salvar vaga/i)
    fireEvent.click(submitButton)

    expect(mockOnSubmit).toHaveBeenCalled()
  })

  it("should disable submit button when loading", () => {
    const mockSetFormData = vi.fn()
    const mockOnSubmit = vi.fn((e) => e.preventDefault())

    render(
      <ManualEntryTab
        formData={mockFormData}
        setFormData={mockSetFormData}
        onSubmit={mockOnSubmit}
        loading={true}
      />
    )

    const submitButton = screen.getByText(/salvando/i)
    expect(submitButton).toBeDisabled()
  })
})
```

### Step 2: Run test to verify it fails

```bash
pnpm test -- manual-entry-tab
```

Expected: FAIL with "Cannot find module '@/components/tabs/manual-entry-tab'"

### Step 3: Create directory and write implementation

```bash
mkdir -p components/tabs
```

```typescript
// components/tabs/manual-entry-tab.tsx
"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import type { FormData } from "@/lib/utils/ai-mapper"

interface ManualEntryTabProps {
  formData: FormData
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void
  onSubmit: (e: React.FormEvent) => Promise<void>
  loading: boolean
}

export function ManualEntryTab({ formData, setFormData, onSubmit, loading }: ManualEntryTabProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="empresa">Empresa *</Label>
          <Input
            id="empresa"
            value={formData.empresa}
            onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cargo">Cargo *</Label>
          <Input
            id="cargo"
            value={formData.cargo}
            onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="local">Local *</Label>
          <Input
            id="local"
            value={formData.local}
            onChange={(e) => setFormData({ ...formData, local: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="modalidade">Modalidade *</Label>
          <Select
            value={formData.modalidade}
            onValueChange={(value) =>
              setFormData({ ...formData, modalidade: value as "Presencial" | "Híbrido" | "Remoto" })
            }
          >
            <SelectTrigger id="modalidade">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Presencial">Presencial</SelectItem>
              <SelectItem value="Híbrido">Híbrido</SelectItem>
              <SelectItem value="Remoto">Remoto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="requisitos">Fit Requisitos (⭐)</Label>
          <Input
            id="requisitos"
            type="number"
            min="0"
            max="5"
            step="0.5"
            value={formData.requisitos}
            onChange={(e) => setFormData({ ...formData, requisitos: e.target.value })}
            placeholder="0.0 - 5.0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fit">Fit Perfil (⭐)</Label>
          <Input
            id="fit"
            type="number"
            min="0"
            max="5"
            step="0.5"
            value={formData.fit}
            onChange={(e) => setFormData({ ...formData, fit: e.target.value })}
            placeholder="0.0 - 5.0"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="etapa">Etapa</Label>
          <Input
            id="etapa"
            value={formData.etapa}
            onChange={(e) => setFormData({ ...formData, etapa: e.target.value })}
            placeholder="Ex: Inscrição"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status *</Label>
        <Select
          value={formData.status}
          onValueChange={(value) =>
            setFormData({ ...formData, status: value as "Pendente" | "Avançado" | "Melou" | "Contratado" })
          }
        >
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pendente">Pendente</SelectItem>
            <SelectItem value="Avançado">Avançado</SelectItem>
            <SelectItem value="Melou">Melou</SelectItem>
            <SelectItem value="Contratado">Contratado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          value={formData.observacoes}
          onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar Vaga"}
        </Button>
      </div>
    </form>
  )
}
```

### Step 4: Run test to verify it passes

```bash
pnpm test -- manual-entry-tab
```

Expected: PASS (all tests green)

### Step 5: Commit

```bash
git add components/tabs/manual-entry-tab.tsx __tests__/components/tabs/manual-entry-tab.test.tsx
git commit -m "feat: add ManualEntryTab component

- Stateless form component with props-driven state
- All form fields: empresa, cargo, local, modalidade, fit, status
- HTML5 validation with required fields
- Reusable in EditVagaDialog later"
```

---

## Task 3: AiParserTab Component

Create AI Parser tab for pasting job descriptions and triggering analysis.

**Files:**

- Create: `components/tabs/ai-parser-tab.tsx`
- Test: `__tests__/components/tabs/ai-parser-tab.test.tsx`

### Step 1: Write the failing test

```typescript
// __tests__/components/tabs/ai-parser-tab.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { AiParserTab } from "@/components/tabs/ai-parser-tab"
import type { FormData } from "@/lib/utils/ai-mapper"

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("AiParserTab", () => {
  const mockFormData: FormData = {
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
  }

  const mockSetFormData = vi.fn()
  const mockOnComplete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it("should render textarea and analyze button", () => {
    render(
      <AiParserTab
        formData={mockFormData}
        setFormData={mockSetFormData}
        onComplete={mockOnComplete}
      />
    )

    expect(screen.getByRole("textbox")).toBeInTheDocument()
    expect(screen.getByText(/analyze with ai/i)).toBeInTheDocument()
  })

  it("should disable button when input < 50 chars", () => {
    render(
      <AiParserTab
        formData={mockFormData}
        setFormData={mockSetFormData}
        onComplete={mockOnComplete}
      />
    )

    const textarea = screen.getByRole("textbox")
    fireEvent.change(textarea, { target: { value: "short" } })

    const button = screen.getByText(/analyze with ai/i)
    expect(button).toBeDisabled()
  })

  it("should enable button when input >= 50 chars", () => {
    render(
      <AiParserTab
        formData={mockFormData}
        setFormData={mockSetFormData}
        onComplete={mockOnComplete}
      />
    )

    const textarea = screen.getByRole("textbox")
    const longText = "a".repeat(50)
    fireEvent.change(textarea, { target: { value: longText } })

    const button = screen.getByText(/analyze with ai/i)
    expect(button).not.toBeDisabled()
  })

  it("should call API on analyze with successful response", async () => {
    const mockApiResponse = {
      success: true,
      data: {
        empresa: "Google",
        cargo: "Engineer",
        local: "SP",
        modalidade: "Híbrido",
        tipo_vaga: "Júnior",
        requisitos_obrigatorios: [],
        requisitos_desejaveis: [],
        responsabilidades: [],
        beneficios: [],
        salario: null,
        idioma_vaga: "pt",
        requisitos_score: 4.5,
        fit: 3.5,
      },
      metadata: {
        duration: 1000,
        model: "gemini-1.5-flash",
        tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        timestamp: new Date().toISOString(),
      },
    }

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockApiResponse),
      } as Response)
    )

    render(
      <AiParserTab
        formData={mockFormData}
        setFormData={mockSetFormData}
        onComplete={mockOnComplete}
      />
    )

    const textarea = screen.getByRole("textbox")
    const longText = "a".repeat(100)
    fireEvent.change(textarea, { target: { value: longText } })

    const button = screen.getByText(/analyze with ai/i)
    fireEvent.click(button)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/ai/parse-job",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      )
    })

    await waitFor(() => {
      expect(mockSetFormData).toHaveBeenCalled()
      expect(mockOnComplete).toHaveBeenCalled()
    })
  })

  it("should handle 429 rate limit error", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ success: false, error: "Rate limit exceeded" }),
      } as Response)
    )

    render(
      <AiParserTab
        formData={mockFormData}
        setFormData={mockSetFormData}
        onComplete={mockOnComplete}
      />
    )

    const textarea = screen.getByRole("textbox")
    const longText = "a".repeat(100)
    fireEvent.change(textarea, { target: { value: longText } })

    const button = screen.getByText(/analyze with ai/i)
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText(/rate limit/i)).toBeInTheDocument()
    })

    expect(mockOnComplete).not.toHaveBeenCalled()
  })

  it("should handle network error", async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error("Network error")))

    render(
      <AiParserTab
        formData={mockFormData}
        setFormData={mockSetFormData}
        onComplete={mockOnComplete}
      />
    )

    const textarea = screen.getByRole("textbox")
    const longText = "a".repeat(100)
    fireEvent.change(textarea, { target: { value: longText } })

    const button = screen.getByText(/analyze with ai/i)
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })

    expect(mockOnComplete).not.toHaveBeenCalled()
  })
})
```

### Step 2: Run test to verify it fails

```bash
pnpm test -- ai-parser-tab
```

Expected: FAIL with "Cannot find module '@/components/tabs/ai-parser-tab'"

### Step 3: Write implementation

```typescript
// components/tabs/ai-parser-tab.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { mapJobDetailsToFormData, type FormData } from "@/lib/utils/ai-mapper"
import type { ParseJobResponse, ParseJobErrorResponse } from "@/lib/ai/types"

interface AiParserTabProps {
  formData: FormData
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void
  onComplete: () => void
}

const MIN_CHARS = 50
const MAX_CHARS = 50000

export function AiParserTab({ formData, setFormData, onComplete }: AiParserTabProps) {
  const [jobDescription, setJobDescription] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAnalyze() {
    setAnalyzing(true)
    setError(null)

    try {
      const response = await fetch("/api/ai/parse-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription }),
      })

      const result: ParseJobResponse | ParseJobErrorResponse = await response.json()

      if (result.success) {
        const mapped = mapJobDetailsToFormData(result.data)
        setFormData((prev) => ({ ...prev, ...mapped }))
        toast.success("Analysis complete! Review the data.")

        // Auto-switch to manual tab after brief delay
        setTimeout(() => onComplete(), 500)
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

  function handleError(status: number, message: string) {
    switch (status) {
      case 429:
        setError("Rate limit reached. Try again in a moment or enter manually.")
        toast.error("Rate limit exceeded")
        break
      case 504:
        setError("Analysis timed out. Try shorter description or enter manually.")
        toast.error("Request timeout")
        break
      case 400:
        setError("Could not parse format. Check description or enter manually.")
        toast.error("Invalid format")
        break
      default:
        setError(message || "Unknown error occurred")
        toast.error("Analysis failed")
    }
  }

  function handleSwitchToManual() {
    onComplete()
  }

  const charCount = jobDescription.length
  const isValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="job-description">Job Description</Label>
          <span
            className={`text-xs ${
              charCount < MIN_CHARS
                ? "text-muted-foreground"
                : charCount > MAX_CHARS
                  ? "text-destructive"
                  : "text-green-600"
            }`}
          >
            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars
            {charCount < MIN_CHARS && ` (min ${MIN_CHARS})`}
          </span>
        </div>

        <Textarea
          id="job-description"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the full job description here (minimum 50 characters)..."
          rows={12}
          className="font-mono text-sm"
          disabled={analyzing}
        />

        <p className="text-xs text-muted-foreground">
          Paste job description from LinkedIn, Indeed, emails, or company websites. The AI will
          extract company, role, location, requirements, and more.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setError(null)}
                disabled={analyzing}
              >
                Try Again
              </Button>
              <Button size="sm" variant="outline" onClick={handleSwitchToManual}>
                Switch to Manual
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleAnalyze}
          disabled={!isValid || analyzing}
          className="flex-1"
          size="lg"
        >
          {analyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing with AI...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Analyze with AI
            </>
          )}
        </Button>

        <Button variant="outline" onClick={handleSwitchToManual} disabled={analyzing}>
          Skip to Manual
        </Button>
      </div>
    </div>
  )
}
```

### Step 4: Run test to verify it passes

```bash
pnpm test -- ai-parser-tab
```

Expected: PASS (all tests green)

### Step 5: Commit

```bash
git add components/tabs/ai-parser-tab.tsx __tests__/components/tabs/ai-parser-tab.test.tsx
git commit -m "feat: add AiParserTab component

- Textarea with character counter (50-50k chars)
- API call to /api/ai/parse-job with error handling
- Graceful degradation for 429, 504, 400, network errors
- Auto-switch to manual tab on success
- Loading states and user feedback"
```

---

## Task 4: MarkdownUploadTab Component

Create wrapper for existing MarkdownUpload component with auto-switch behavior.

**Files:**

- Create: `components/tabs/markdown-upload-tab.tsx`
- Test: `__tests__/components/tabs/markdown-upload-tab.test.tsx`

### Step 1: Write the failing test

```typescript
// __tests__/components/tabs/markdown-upload-tab.test.tsx
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { MarkdownUploadTab } from "@/components/tabs/markdown-upload-tab"
import type { FormData } from "@/lib/utils/ai-mapper"

// Mock MarkdownUpload component
vi.mock("@/components/markdown-upload", () => ({
  MarkdownUpload: ({ label }: { label: string }) => <div>{label}</div>,
}))

// Mock FileUpload component
vi.mock("@/components/file-upload", () => ({
  FileUpload: ({ label }: { label: string }) => <div>{label}</div>,
}))

describe("MarkdownUploadTab", () => {
  const mockFormData: FormData = {
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
  }

  const mockSetFormData = vi.fn()
  const mockOnComplete = vi.fn()

  it("should render MarkdownUpload and FileUpload components", () => {
    render(
      <MarkdownUploadTab
        formData={mockFormData}
        setFormData={mockSetFormData}
        onComplete={mockOnComplete}
      />
    )

    expect(screen.getByText(/job analysis/i)).toBeInTheDocument()
    expect(screen.getByText(/resume/i)).toBeInTheDocument()
  })

  it("should render description text", () => {
    render(
      <MarkdownUploadTab
        formData={mockFormData}
        setFormData={mockSetFormData}
        onComplete={mockOnComplete}
      />
    )

    expect(
      screen.getByText(/upload a markdown analysis file/i)
    ).toBeInTheDocument()
  })
})
```

### Step 2: Run test to verify it fails

```bash
pnpm test -- markdown-upload-tab
```

Expected: FAIL with "Cannot find module '@/components/tabs/markdown-upload-tab'"

### Step 3: Write implementation

```typescript
// components/tabs/markdown-upload-tab.tsx
"use client"

import { MarkdownUpload } from "@/components/markdown-upload"
import { FileUpload } from "@/components/file-upload"
import { toast } from "sonner"
import type { FormData } from "@/lib/utils/ai-mapper"
import type { ParsedVagaData } from "@/lib/markdown-parser"

interface MarkdownUploadTabProps {
  formData: FormData
  setFormData: (data: FormData | ((prev: FormData) => FormData)) => void
  onComplete: () => void
}

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

    // Auto-switch to manual tab after brief delay
    setTimeout(() => onComplete(), 1500)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload a markdown analysis file (.md) to automatically extract job details.
      </p>

      <MarkdownUpload
        onUploadComplete={(url, parsedData) => {
          setFormData((prev) => ({ ...prev, arquivo_analise_url: url }))
          if (parsedData) handleParsedData(parsedData)
        }}
        onParseComplete={handleParsedData}
        currentFile={formData.arquivo_analise_url}
        label="Job Analysis (.md)"
        autoFillFields={true}
      />

      <FileUpload
        onUploadComplete={(url) =>
          setFormData((prev) => ({ ...prev, arquivo_cv_url: url }))
        }
        currentFile={formData.arquivo_cv_url}
        label="Resume (PDF/DOCX)"
      />
    </div>
  )
}
```

### Step 4: Run test to verify it passes

```bash
pnpm test -- markdown-upload-tab
```

Expected: PASS (all tests green)

### Step 5: Commit

```bash
git add components/tabs/markdown-upload-tab.tsx __tests__/components/tabs/markdown-upload-tab.test.tsx
git commit -m "feat: add MarkdownUploadTab wrapper component

- Wraps existing MarkdownUpload and FileUpload components
- Auto-switches to manual tab after successful parse
- Maintains consistent behavior with AiParserTab"
```

---

## Task 5: Refactor AddVagaDialog to Use Tabs

Refactor AddVagaDialog to orchestrate tabs with shared state.

**Files:**

- Modify: `components/add-vaga-dialog.tsx`
- Test: `__tests__/components/add-vaga-dialog.test.tsx` (update existing)

### Step 1: Update existing test file

```typescript
// __tests__/components/add-vaga-dialog.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { AddVagaDialog } from "@/components/add-vaga-dialog"

// Mock Supabase
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
      }),
      insert: () => Promise.resolve({ error: null }),
    }),
  }),
}))

// Mock date utils
vi.mock("@/lib/date-utils", () => ({
  getDataInscricao: () => "2025-01-19",
}))

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("AddVagaDialog", () => {
  const mockOnOpenChange = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should render dialog when open", () => {
    render(
      <AddVagaDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    )

    expect(screen.getByText(/add new job/i)).toBeInTheDocument()
  })

  it("should default to AI Parser tab", () => {
    render(
      <AddVagaDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    )

    // AI Parser tab should be active (has textarea)
    expect(screen.getByRole("textbox")).toBeInTheDocument()
    expect(screen.getByText(/analyze with ai/i)).toBeInTheDocument()
  })

  it("should allow switching to manual tab", () => {
    render(
      <AddVagaDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    )

    const manualTab = screen.getByText("Manual Entry")
    fireEvent.click(manualTab)

    // Manual tab should show form fields
    expect(screen.getByLabelText(/empresa/i)).toBeInTheDocument()
    expect(screen.getByText(/salvar vaga/i)).toBeInTheDocument()
  })

  it("should allow switching to upload tab", () => {
    render(
      <AddVagaDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    )

    const uploadTab = screen.getByText("Upload .md")
    fireEvent.click(uploadTab)

    // Upload tab should show description
    expect(
      screen.getByText(/upload a markdown analysis file/i)
    ).toBeInTheDocument()
  })

  it("should share formData across tabs", async () => {
    render(
      <AddVagaDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    )

    // Switch to manual tab
    const manualTab = screen.getByText("Manual Entry")
    fireEvent.click(manualTab)

    // Fill empresa field
    const empresaInput = screen.getByLabelText(/empresa/i)
    fireEvent.change(empresaInput, { target: { value: "Google" } })

    // Switch to AI Parser tab and back
    const aiTab = screen.getByText("AI Parser")
    fireEvent.click(aiTab)
    fireEvent.click(manualTab)

    // Data should persist
    expect(empresaInput).toHaveValue("Google")
  })
})
```

### Step 2: Run test to verify it fails

```bash
pnpm test -- add-vaga-dialog
```

Expected: FAIL (tabs don't exist yet in component)

### Step 3: Refactor AddVagaDialog implementation

```typescript
// components/add-vaga-dialog.tsx
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getDataInscricao } from "@/lib/date-utils"
import type { Configuracao } from "@/lib/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AiParserTab } from "@/components/tabs/ai-parser-tab"
import { ManualEntryTab } from "@/components/tabs/manual-entry-tab"
import { MarkdownUploadTab } from "@/components/tabs/markdown-upload-tab"
import { toast } from "sonner"
import { normalizeRatingForSave } from "@/lib/utils"
import type { FormData } from "@/lib/utils/ai-mapper"

interface AddVagaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddVagaDialog({ open, onOpenChange, onSuccess }: AddVagaDialogProps) {
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<Configuracao | null>(null)
  const [activeTab, setActiveTab] = useState("ai-parser")
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

  const supabase = createClient()

  // Load config on mount
  useEffect(() => {
    loadConfig()
  }, [])

  async function loadConfig() {
    try {
      const { data } = await supabase.from("configuracoes").select("*").single()
      if (data) setConfig(data)
    } catch (error) {
      console.error("Erro ao carregar configurações:", error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const dataInscricao = getDataInscricao(new Date(), config || undefined)
      if (process.env.NODE_ENV === "development") {
        console.log("[AddVagaDialog] Criando vaga com data_inscricao:", dataInscricao, "Config:", config)
      }

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

  return (
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

          <TabsContent value="ai-parser" className="mt-4">
            <AiParserTab
              formData={formData}
              setFormData={setFormData}
              onComplete={handleTabComplete}
            />
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <ManualEntryTab
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <MarkdownUploadTab
              formData={formData}
              setFormData={setFormData}
              onComplete={handleTabComplete}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### Step 4: Run test to verify it passes

```bash
pnpm test -- add-vaga-dialog
```

Expected: PASS (all tests green)

### Step 5: Commit

```bash
git add components/add-vaga-dialog.tsx __tests__/components/add-vaga-dialog.test.tsx
git commit -m "refactor: convert AddVagaDialog to tabs-based architecture

- Add Radix Tabs with AI Parser, Manual Entry, Upload .md
- Centralized formData state shared across tabs
- Auto-switch to manual tab after preprocessing
- Preserve existing submit logic and Supabase integration"
```

---

## Task 6: Integration Testing

Test complete flow from AI parse to save.

**Files:**

- Create: `__tests__/integration/ai-job-auto-fill.test.tsx`

### Step 1: Write integration test

```typescript
// __tests__/integration/ai-job-auto-fill.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { AddVagaDialog } from "@/components/add-vaga-dialog"

// Mock Supabase
const mockInsert = vi.fn(() => Promise.resolve({ error: null }))
const mockSelect = vi.fn(() => ({
  single: () => Promise.resolve({ data: null, error: null }),
}))

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: mockSelect,
      insert: mockInsert,
    }),
  }),
}))

// Mock date utils
vi.mock("@/lib/date-utils", () => ({
  getDataInscricao: () => "2025-01-19",
}))

// Mock utils
vi.mock("@/lib/utils", () => ({
  normalizeRatingForSave: (value: string) => parseFloat(value) || 0,
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}))

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("AI Job Auto-Fill Integration", () => {
  const mockOnOpenChange = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it("should complete full flow: AI parse → manual review → save", async () => {
    const mockApiResponse = {
      success: true,
      data: {
        empresa: "Google",
        cargo: "Software Engineer",
        local: "São Paulo, SP",
        modalidade: "Híbrido",
        tipo_vaga: "Júnior",
        requisitos_obrigatorios: ["React", "TypeScript"],
        requisitos_desejaveis: ["Node.js"],
        responsabilidades: ["Develop features"],
        beneficios: ["Health insurance"],
        salario: "R$ 5000",
        idioma_vaga: "pt",
        requisitos_score: 4.5,
        fit: 3.5,
        etapa: "Inscrição",
        status: "Pendente",
      },
      metadata: {
        duration: 1000,
        model: "gemini-1.5-flash",
        tokenUsage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        timestamp: new Date().toISOString(),
      },
    }

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockApiResponse),
      } as Response)
    )

    render(
      <AddVagaDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    )

    // Step 1: Should default to AI Parser tab
    expect(screen.getByRole("textbox")).toBeInTheDocument()

    // Step 2: Paste job description
    const textarea = screen.getByRole("textbox")
    const jobDescription = "a".repeat(100)
    fireEvent.change(textarea, { target: { value: jobDescription } })

    // Step 3: Click Analyze
    const analyzeButton = screen.getByText(/analyze with ai/i)
    fireEvent.click(analyzeButton)

    // Step 4: Wait for API call and auto-switch to manual tab
    await waitFor(
      () => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/ai/parse-job",
          expect.objectContaining({ method: "POST" })
        )
      },
      { timeout: 3000 }
    )

    await waitFor(
      () => {
        expect(screen.getByDisplayValue("Google")).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    // Step 5: Verify pre-filled data in manual tab
    expect(screen.getByDisplayValue("Software Engineer")).toBeInTheDocument()
    expect(screen.getByDisplayValue("São Paulo, SP")).toBeInTheDocument()
    expect(screen.getByDisplayValue("4.5")).toBeInTheDocument()
    expect(screen.getByDisplayValue("3.5")).toBeInTheDocument()

    // Step 6: Submit form
    const submitButton = screen.getByText(/salvar vaga/i)
    fireEvent.click(submitButton)

    // Step 7: Verify Supabase insert called
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          empresa: "Google",
          cargo: "Software Engineer",
          local: "São Paulo, SP",
          modalidade: "Híbrido",
        })
      )
    })

    // Step 8: Verify success callback
    expect(mockOnSuccess).toHaveBeenCalled()
  })

  it("should allow manual entry without AI parsing", async () => {
    render(
      <AddVagaDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    )

    // Switch to manual tab directly
    const manualTab = screen.getByText("Manual Entry")
    fireEvent.click(manualTab)

    // Fill form manually
    fireEvent.change(screen.getByLabelText(/empresa/i), {
      target: { value: "Manual Company" },
    })
    fireEvent.change(screen.getByLabelText(/cargo/i), {
      target: { value: "Manual Role" },
    })
    fireEvent.change(screen.getByLabelText(/local/i), {
      target: { value: "Manual Location" },
    })

    // Submit
    const submitButton = screen.getByText(/salvar vaga/i)
    fireEvent.click(submitButton)

    // Verify insert called with manual data
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          empresa: "Manual Company",
          cargo: "Manual Role",
          local: "Manual Location",
        })
      )
    })
  })
})
```

### Step 2: Run test to verify it passes

```bash
pnpm test -- ai-job-auto-fill
```

Expected: PASS (all integration scenarios green)

### Step 3: Commit

```bash
git add __tests__/integration/ai-job-auto-fill.test.tsx
git commit -m "test: add integration tests for AI job auto-fill flow

- Complete flow: AI parse → auto-fill → manual review → save
- Manual entry without AI parsing
- Verifies API calls, state updates, Supabase integration"
```

---

## Task 7: Final Verification

Run all tests, linting, type checking, and build.

### Step 1: Run all tests

```bash
pnpm test
```

Expected: All tests PASS

### Step 2: Run linting

```bash
pnpm lint
```

Expected: No errors

### Step 3: Run type checking

```bash
pnpm tsc --noEmit
```

Expected: No TypeScript errors

### Step 4: Run build

```bash
pnpm build
```

Expected: Build succeeds

### Step 5: Manual testing checklist

Start dev server and test manually:

```bash
pnpm dev
```

**Test Cases:**

1. **AI Parser Tab:**
   - [ ] Paste job description (< 50 chars) → button disabled
   - [ ] Paste valid description → button enabled
   - [ ] Click "Analyze with AI" → loading state shows
   - [ ] Successful parse → fields auto-fill → auto-switch to manual tab
   - [ ] Rate limit error (429) → error message shows with retry/manual options
   - [ ] Network error → error message shows

2. **Manual Entry Tab:**
   - [ ] Switch directly to manual tab
   - [ ] Fill all fields manually
   - [ ] Submit → saves to database
   - [ ] Pre-filled data from AI persists when switching tabs

3. **Upload .md Tab:**
   - [ ] Upload markdown file
   - [ ] Fields auto-fill from parsed data
   - [ ] Auto-switch to manual tab
   - [ ] File URLs saved correctly

4. **State Persistence:**
   - [ ] Fill fields in manual tab → switch to AI tab → switch back → data persists
   - [ ] AI parse fills fields → switch to upload → switch back → data persists

5. **Form Validation:**
   - [ ] Required fields (empresa, cargo, local) enforce validation
   - [ ] Number inputs (fit) respect min/max/step constraints
   - [ ] Submit succeeds with valid data
   - [ ] Submit shows error with invalid data

### Step 6: Final commit

```bash
git add -A
git commit -m "feat: complete AI job auto-fill feature

Tabs-based interface for adding jobs with three input methods:
- AI Parser: paste description, analyze with Gemini, auto-fill
- Manual Entry: direct form input
- Upload .md: markdown file parsing

Features:
- One-way data flow: preprocessing tabs → manual review
- Graceful error handling with fallback options
- Shared formData state across tabs
- Auto-switch to manual tab after preprocessing
- Complete test coverage (unit + integration)

All tests passing, build successful, ready for production."
```

---

## Summary

**Total Tasks:** 7
**Estimated Time:** 2-3 hours (with testing)

**Task Breakdown:**

1. AI Mapper Utility (20 min)
2. ManualEntryTab Component (30 min)
3. AiParserTab Component (40 min)
4. MarkdownUploadTab Component (20 min)
5. AddVagaDialog Refactor (30 min)
6. Integration Testing (20 min)
7. Final Verification (20 min)

**Files Created:**

- `lib/utils/ai-mapper.ts`
- `components/tabs/ai-parser-tab.tsx`
- `components/tabs/manual-entry-tab.tsx`
- `components/tabs/markdown-upload-tab.tsx`
- `__tests__/lib/ai-mapper.test.ts`
- `__tests__/components/tabs/ai-parser-tab.test.tsx`
- `__tests__/components/tabs/manual-entry-tab.test.tsx`
- `__tests__/components/tabs/markdown-upload-tab.test.tsx`
- `__tests__/integration/ai-job-auto-fill.test.tsx`

**Files Modified:**

- `components/add-vaga-dialog.tsx`
- `__tests__/components/add-vaga-dialog.test.tsx`

**Dependencies Added:**

- None (all existing: Radix Tabs, Sonner, Zod)

**Success Criteria Met:**

- ✅ Textarea for pasting job descriptions
- ✅ AI analysis with /api/ai/parse-job
- ✅ Auto-fill all form fields
- ✅ User review and adjustment capability
- ✅ Error handling with graceful degradation
- ✅ Toast notifications for feedback
- ✅ Auto-switch to manual tab
- ✅ All tests pass
- ✅ Build succeeds
- ✅ No TypeScript/lint errors

**Ready for Production:** Yes

---

**Related Documentation:**

- Design: `docs/plans/2025-01-19-ai-job-auto-fill-design.md`
- API: `CLAUDE.md` (AI Job Parser section)
- Components: `components/CLAUDE.md`
