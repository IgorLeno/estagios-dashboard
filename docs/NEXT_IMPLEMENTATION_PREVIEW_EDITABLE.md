# Implementação: Preview Editável de Currículos

> **Histórico.** Descreve a arquitetura antiga (IA, PDF, Supabase, deploy no Vercel), removida. O dashboard atual é local-first e somente leitura: veja `README.md` e `docs/plans/2026-09-25-job-search-visual-layer.md`.

**Data:** 2025-01-27
**Status:** Pronto para implementação
**Prioridade:** Média
**Estimativa:** 2-3 horas

---

## 🎯 Objetivo

Implementar fluxo de preview editável antes da geração final do PDF:

```
Formulário → Gerar Preview → Editar HTML → Gerar PDF → Download
```

---

## 📋 Contexto da Sessão Anterior

### ✅ Já Implementado (Sessão Anterior)

1. **Formatação corrigida** (linhas pretas, nome à esquerda, 1 página A4)
2. **Prompts ajustados** para idioma 100% correto (PT/EN)
3. **Seletor "Ambos"** (gera PT + EN em paralelo)
4. **Build validado** (sem erros críticos)

### 📂 Arquivos Modificados na Sessão Anterior

- `lib/ai/resume-html-template.ts` - Template HTML otimizado
- `lib/ai/resume-prompts.ts` - Prompts com instruções de idioma
- `lib/ai/resume-generator.ts` - Funções com parâmetro `language`
- `components/resume-generator-dialog.tsx` - UI com seletor PT/EN/Ambos

---

## 🚀 Implementação do Preview Editável

### ARQUITETURA GERAL

```
┌─────────────────────────────────────────────────────────────────┐
│ ResumeGeneratorDialog (components/resume-generator-dialog.tsx) │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Step: "form"  │  ← Seletor de idioma + botão "Gerar Preview"
                    └─────────────────┘
                              │
                              ▼ handleGeneratePreview()
                    ┌─────────────────┐
                    │ Step: "preview" │  ← Textarea editável com HTML + botão "Gerar PDF"
                    └─────────────────┘
                              │
                              ▼ handleGeneratePdf()
                    ┌─────────────────┐
                    │   Step: "pdf"   │  ← Botões de download PT/EN
                    └─────────────────┘
```

---

## 📝 TAREFAS ESPECÍFICAS

### TAREFA 1: Criar Endpoint de Geração de PDF

**Arquivo:** `app/api/pdf/generate/route.ts` (NOVO)

**Responsabilidade:** Converter HTML → PDF usando Puppeteer

**Código base:**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { generateResumePDF } from "@/lib/ai/pdf-generator"

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { html, filename } = await req.json()

    if (!html || typeof html !== "string") {
      return NextResponse.json({ success: false, error: "HTML content is required" }, { status: 400 })
    }

    // Gerar PDF usando Puppeteer (já existe em lib/ai/pdf-generator.ts)
    const pdfBuffer = await generateResumePDF(html)

    // Converter para base64
    const pdfBase64 = pdfBuffer.toString("base64")

    return NextResponse.json({
      success: true,
      data: {
        pdfBase64,
        filename: filename || "curriculum.pdf",
      },
    })
  } catch (error) {
    console.error("[PDF Generator] Error:", error)
    return NextResponse.json({ success: false, error: "Failed to generate PDF" }, { status: 500 })
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    message: "PDF Generator API is running",
  })
}
```

**Validação:**

- Testar com: `curl -X POST http://localhost:3000/api/pdf/generate -H "Content-Type: application/json" -d '{"html":"<html>...</html>","filename":"test.pdf"}'`

---

### TAREFA 2: Modificar ResumeGeneratorDialog

**Arquivo:** `components/resume-generator-dialog.tsx`

#### 2.1 Adicionar Estados

```typescript
type Step = "form" | "preview" | "pdf"

const [step, setStep] = useState<Step>("form")
const [htmlPreviewPt, setHtmlPreviewPt] = useState<string>("")
const [htmlPreviewEn, setHtmlPreviewEn] = useState<string>("")
```

#### 2.2 Criar Função handleGeneratePreview()

```typescript
const handleGeneratePreview = async () => {
  if (!vagaId && !jobDescription) {
    toast.error("No job data provided")
    return
  }

  setState("loading")
  setError(null)

  try {
    if (language === "both") {
      // Gerar HTML PT + EN em paralelo
      const [responsePt, responseEn] = await Promise.all([
        fetch("/api/ai/generate-resume-html", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(vagaId ? { vagaId } : { jobDescription }),
            language: "pt",
          }),
        }),
        fetch("/api/ai/generate-resume-html", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(vagaId ? { vagaId } : { jobDescription }),
            language: "en",
          }),
        }),
      ])

      const dataPt = await responsePt.json()
      const dataEn = await responseEn.json()

      if (!responsePt.ok || !dataPt.success) {
        throw new Error(dataPt.error || "Failed to generate PT preview")
      }

      if (!responseEn.ok || !dataEn.success) {
        throw new Error(dataEn.error || "Failed to generate EN preview")
      }

      setHtmlPreviewPt(dataPt.data.html)
      setHtmlPreviewEn(dataEn.data.html)
      setStep("preview")
      setState("idle")
      toast.success("Preview gerado com sucesso!")
    } else {
      // Gerar HTML único (PT ou EN)
      const response = await fetch("/api/ai/generate-resume-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(vagaId ? { vagaId } : { jobDescription }),
          language,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate preview")
      }

      if (language === "pt") {
        setHtmlPreviewPt(data.data.html)
      } else {
        setHtmlPreviewEn(data.data.html)
      }

      setStep("preview")
      setState("idle")
      toast.success("Preview gerado com sucesso!")
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error"
    setError(errorMessage)
    setState("idle")
    toast.error(errorMessage)
  }
}
```

#### 2.3 Criar Função handleGeneratePdf()

```typescript
const handleGeneratePdf = async () => {
  setState("loading")
  setError(null)

  try {
    const requests = []

    if (htmlPreviewPt) {
      requests.push(
        fetch("/api/pdf/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            html: htmlPreviewPt,
            filename: `cv-igor-fernandes-pt.pdf`,
          }),
        })
      )
    }

    if (htmlPreviewEn) {
      requests.push(
        fetch("/api/pdf/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            html: htmlPreviewEn,
            filename: `cv-igor-fernandes-en.pdf`,
          }),
        })
      )
    }

    const responses = await Promise.all(requests)
    const results = await Promise.all(responses.map((r) => r.json()))

    // Processar resultados
    if (htmlPreviewPt && results[0]) {
      if (!results[0].success) {
        throw new Error("Failed to generate PT PDF")
      }
      setResultPt(results[0].data)
    }

    if (htmlPreviewEn) {
      const idx = htmlPreviewPt ? 1 : 0
      if (!results[idx].success) {
        throw new Error("Failed to generate EN PDF")
      }
      setResultEn(results[idx].data)
    }

    setStep("pdf")
    setState("idle")
    toast.success("PDF gerado com sucesso!")
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error"
    setError(errorMessage)
    setState("idle")
    toast.error(errorMessage)
  }
}
```

#### 2.4 Atualizar UI para Incluir Step "preview"

**Step 1: Form (já existe, trocar botão):**

```tsx
{
  state === "idle" && step === "form" && (
    <Button className="flex-1" onClick={handleGeneratePreview}>
      <FileText className="mr-2 h-4 w-4" />
      Gerar Preview
    </Button>
  )
}
```

**Step 2: Preview (NOVO):**

```tsx
{
  step === "preview" && (
    <div className="space-y-4">
      <Label>Preview do Currículo</Label>
      <p className="text-xs text-muted-foreground">Você pode editar o HTML abaixo antes de gerar o PDF final.</p>

      {htmlPreviewPt && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Português</Label>
          <Textarea
            value={htmlPreviewPt}
            onChange={(e) => setHtmlPreviewPt(e.target.value)}
            rows={25}
            className="font-mono text-xs"
          />
        </div>
      )}

      {htmlPreviewEn && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Inglês</Label>
          <Textarea
            value={htmlPreviewEn}
            onChange={(e) => setHtmlPreviewEn(e.target.value)}
            rows={25}
            className="font-mono text-xs"
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep("form")}>
          Voltar
        </Button>
        <Button onClick={handleGeneratePdf}>
          <FileText className="mr-2 h-4 w-4" />
          Gerar PDF
        </Button>
      </div>
    </div>
  )
}
```

**Step 3: PDF (já existe, ajustar condição):**

```tsx
{step === "pdf" && (resultPt || resultEn) && (
  // ... código de success state já existe
)}
```

---

### TAREFA 3: Criar Endpoint de Geração HTML (Sem PDF)

**Arquivo:** `app/api/ai/generate-resume-html/route.ts` (NOVO)

**Responsabilidade:** Retornar apenas HTML (sem converter para PDF)

**Código base:**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateTailoredResume } from "@/lib/ai/resume-generator"
import { generateResumeHTML } from "@/lib/ai/resume-html-template"
import { JobDetailsSchema, JobDetails } from "@/lib/ai/types"
import { parseJobWithGemini } from "@/lib/ai/job-parser"
import { validateAIConfig } from "@/lib/ai/config"
import { ZodError } from "zod"

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    validateAIConfig()

    const body = await req.json()
    const { vagaId, jobDescription, language } = body

    if (!language || !["pt", "en"].includes(language)) {
      return NextResponse.json({ success: false, error: "Invalid language" }, { status: 400 })
    }

    // Get job details (igual ao endpoint original)
    let jobDetails: JobDetails | undefined

    if (vagaId) {
      const supabase = await createClient()
      const { data: vaga, error } = await supabase.from("vagas_estagio").select("*").eq("id", vagaId).single()

      if (error || !vaga) {
        return NextResponse.json({ success: false, error: "Vaga not found" }, { status: 404 })
      }

      jobDetails = JobDetailsSchema.parse({
        empresa: vaga.empresa || "",
        cargo: vaga.cargo || "",
        local: vaga.local || "",
        modalidade: vaga.modalidade || "Presencial",
        tipo_vaga: vaga.tipo_vaga || "Estágio",
        requisitos_obrigatorios: vaga.requisitos_obrigatorios || [],
        requisitos_desejaveis: vaga.requisitos_desejaveis || [],
        responsabilidades: vaga.responsabilidades || [],
        beneficios: vaga.beneficios || [],
        salario: vaga.salario,
        idioma_vaga: vaga.idioma_vaga || "pt",
      })
    } else if (jobDescription) {
      const parseResult = await parseJobWithGemini(jobDescription)
      jobDetails = parseResult.data
    } else {
      throw new Error("Either vagaId or jobDescription is required")
    }

    // Gerar currículo personalizado (só CV object, sem PDF)
    const resumeResult = await generateTailoredResume(jobDetails, language)

    // Gerar HTML a partir do CV object
    const html = generateResumeHTML(resumeResult.cv)

    return NextResponse.json({
      success: true,
      data: {
        html,
      },
      metadata: {
        duration: resumeResult.duration,
        model: resumeResult.model,
        tokenUsage: resumeResult.tokenUsage,
        personalizedSections: resumeResult.personalizedSections,
      },
    })
  } catch (error: unknown) {
    console.error("[Resume HTML API] Error:", error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }

    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    message: "Resume HTML Generator API is running",
  })
}
```

---

### TAREFA 4: Adicionar Componente Textarea ao UI Kit (Se não existir)

**Verificar se existe:** `components/ui/textarea.tsx`

Se não existir, criar:

```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
```

---

### TAREFA 5: Atualizar handleReset()

```typescript
const handleReset = () => {
  setStep("form")
  setState("idle")
  setError(null)
  setResultPt(null)
  setResultEn(null)
  setHtmlPreviewPt("")
  setHtmlPreviewEn("")
  setMetadata(null)
}
```

---

## 🧪 TESTES

### Teste 1: Preview PT

1. Abrir dialog
2. Selecionar "Português"
3. Clicar "Gerar Preview"
4. Verificar textarea com HTML em português
5. Editar algum texto no HTML
6. Clicar "Gerar PDF"
7. Baixar e verificar PDF com texto editado

### Teste 2: Preview EN

1. Selecionar "English"
2. Gerar preview
3. Verificar textarea com HTML em inglês
4. Editar e gerar PDF
5. Verificar edições no PDF final

### Teste 3: Preview Ambos

1. Selecionar "Ambos"
2. Gerar preview
3. Verificar 2 textareas (PT + EN)
4. Editar ambos
5. Gerar PDFs
6. Baixar ambos e verificar

### Teste 4: Botão "Voltar"

1. Gerar preview
2. Clicar "Voltar"
3. Verificar que volta para form
4. Preview anterior deve ser mantido se gerar novamente

### Teste 5: Erro Handling

1. Testar com API offline
2. Verificar mensagem de erro
3. Botão "Retry" deve funcionar

---

## 📊 CRITÉRIOS DE ACEITAÇÃO

### UX/Fluxo ✅

- [ ] Passo 1: Formulário + seletor de idioma
- [ ] Passo 2: Preview editável em textarea (HTML visível)
- [ ] Passo 3: Botão "Gerar PDF"
- [ ] Passo 4: Botão(s) "Baixar PDF"
- [ ] Opção "Ambos" mostra 2 textareas (PT + EN)
- [ ] Possível editar HTML antes de gerar PDF
- [ ] Botão "Voltar" retorna ao formulário

### Técnico ✅

- [ ] TypeScript sem erros
- [ ] Endpoint `/api/ai/generate-resume-html` funcional
- [ ] Endpoint `/api/pdf/generate` funcional
- [ ] Build passa sem erros
- [ ] Edições no HTML refletem no PDF final

---

## 🚨 OBSERVAÇÕES IMPORTANTES

1. **Puppeteer no Vercel:** Já configurado em `lib/ai/pdf-generator.ts` com `@sparticuz/chromium`
2. **Timeout:** Manter 60s para geração (já configurado em `vercel.json`)
3. **Validação HTML:** Não validar HTML editado (confiar no usuário)
4. **Tamanho do HTML:** Textarea pode ter problemas com HTML muito grande (>50KB)
5. **UX Loading:** Mostrar loader durante "Gerando preview..." e "Gerando PDF..."

---

## 📝 COMANDOS ÚTEIS

```bash
# Validar TypeScript
npx tsc --noEmit

# Build completo
pnpm build

# Rodar dev server
pnpm dev

# Testar endpoint HTML
curl -X POST http://localhost:3000/api/ai/generate-resume-html \
  -H "Content-Type: application/json" \
  -d '{"vagaId":"uuid","language":"pt"}'

# Testar endpoint PDF
curl -X POST http://localhost:3000/api/pdf/generate \
  -H "Content-Type: application/json" \
  -d '{"html":"<html>...</html>","filename":"test.pdf"}'
```

---

## 🎯 ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

1. **Criar endpoint `/api/pdf/generate`** (mais simples, já usa código existente)
2. **Criar endpoint `/api/ai/generate-resume-html`** (copiar do endpoint original)
3. **Adicionar estados ao dialog** (`step`, `htmlPreviewPt`, `htmlPreviewEn`)
4. **Implementar `handleGeneratePreview()`**
5. **Implementar `handleGeneratePdf()`**
6. **Atualizar UI com step "preview"** (textareas + botões)
7. **Testar fluxo completo** (PT, EN, Ambos)
8. **Validar build** (`pnpm build`)

---

## 🔗 ARQUIVOS DE REFERÊNCIA

- `app/api/ai/generate-resume/route.ts` - Endpoint original (para copiar lógica)
- `lib/ai/pdf-generator.ts` - Função `generateResumePDF()` (já existe)
- `lib/ai/resume-html-template.ts` - Função `generateResumeHTML()` (já existe)
- `components/resume-generator-dialog.tsx` - Dialog atual (modificar)

---

**FIM DO DOCUMENTO DE INSTRUÇÕES**

Após executar `/clear`, basta abrir este arquivo e seguir as tarefas na ordem recomendada.
