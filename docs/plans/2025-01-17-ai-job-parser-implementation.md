# AI Job Parser Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build REST API endpoint that uses Gemini 1.5 Flash to extract structured data from unstructured job descriptions.

**Architecture:** Server-side API route receives job description text, calls Gemini LLM with extraction prompt, validates response with Zod, returns structured JSON compatible with existing `ParsedVagaData` interface.

**Tech Stack:** Next.js 16 API Routes, Google Generative AI SDK, Zod validation, TypeScript

---

## Task 1: Setup Dependencies and Environment

**Files:**
- Modify: `package.json`
- Create: `.env.local`
- Modify: `.env.example`

**Step 1: Install Google Generative AI SDK**

```bash
pnpm add @google/generative-ai
```

Expected: Package added to dependencies

**Step 2: Get Google API Key**

1. Open https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

**Step 3: Add API key to .env.local**

Create or append to `.env.local`:

```env
# === AI Agents (Gemini 2.0 Flash) ===
GOOGLE_API_KEY=your_actual_api_key_here
```

**Step 4: Document in .env.example**

Append to `.env.example`:

```env
# === AI Agents (Gemini 2.0 Flash) ===
# Get your key at: https://aistudio.google.com/app/apikey
# Free tier: 15 requests/minute, 1M tokens/day
GOOGLE_API_KEY=your_gemini_api_key_here
```

**Step 5: Add validation script to package.json**

Add to `"scripts"` section:

```json
"validate:ai": "tsx scripts/validate-ai-setup.ts"
```

**Step 6: Commit setup**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "chore: add @google/generative-ai dependency and env config"
```

---

## Task 2: Create Types and Zod Schemas

**Files:**
- Create: `lib/ai/types.ts`
- Test: `__tests__/lib/ai/types.test.ts`

**Step 1: Write schema validation test**

Create `__tests__/lib/ai/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { JobDetailsSchema } from '@/lib/ai/types'

describe('JobDetailsSchema', () => {
  const validJob = {
    empresa: 'Test Corp',
    cargo: 'Developer',
    local: 'São Paulo, SP',
    modalidade: 'Remoto' as const,
    tipo_vaga: 'Júnior' as const,
    requisitos_obrigatorios: ['JavaScript'],
    requisitos_desejaveis: ['TypeScript'],
    responsabilidades: ['Code'],
    beneficios: ['Health insurance'],
    salario: 'R$ 5000',
    idioma_vaga: 'pt' as const,
  }

  it('should accept valid job details', () => {
    expect(() => JobDetailsSchema.parse(validJob)).not.toThrow()
  })

  it('should reject invalid modalidade', () => {
    const invalid = { ...validJob, modalidade: 'Invalid' }
    expect(() => JobDetailsSchema.parse(invalid)).toThrow()
  })

  it('should reject invalid tipo_vaga', () => {
    const invalid = { ...validJob, tipo_vaga: 'Invalid' }
    expect(() => JobDetailsSchema.parse(invalid)).toThrow()
  })

  it('should reject missing required fields', () => {
    const invalid = { ...validJob, empresa: '' }
    expect(() => JobDetailsSchema.parse(invalid)).toThrow()
  })

  it('should accept null salario', () => {
    const valid = { ...validJob, salario: null }
    expect(() => JobDetailsSchema.parse(valid)).not.toThrow()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm test __tests__/lib/ai/types.test.ts --run
```

Expected: FAIL - "Cannot find module '@/lib/ai/types'"

**Step 3: Create types file**

Create `lib/ai/types.ts`:

```typescript
import { z } from 'zod'

/**
 * Schema de validação para dados extraídos de vagas
 * Compatível com ParsedVagaData do markdown-parser.ts
 */
export const JobDetailsSchema = z.object({
  empresa: z.string().min(1, 'Empresa é obrigatória'),
  cargo: z.string().min(1, 'Cargo é obrigatório'),
  local: z.string().min(1, 'Local é obrigatório'),
  modalidade: z.enum(['Presencial', 'Híbrido', 'Remoto']),
  tipo_vaga: z.enum(['Estágio', 'Júnior', 'Pleno', 'Sênior']),
  requisitos_obrigatorios: z.array(z.string()),
  requisitos_desejaveis: z.array(z.string()),
  responsabilidades: z.array(z.string()),
  beneficios: z.array(z.string()),
  salario: z.string().nullable(),
  idioma_vaga: z.enum(['pt', 'en']),
})

export type JobDetails = z.infer<typeof JobDetailsSchema>

/**
 * Schema de validação para input da API
 */
export const ParseJobRequestSchema = z.object({
  jobDescription: z.string().min(50, 'Descrição da vaga deve ter ao menos 50 caracteres'),
})

export type ParseJobRequest = z.infer<typeof ParseJobRequestSchema>

/**
 * Resposta da API (success)
 */
export interface ParseJobResponse {
  success: true
  data: JobDetails
  metadata: {
    duration: number
    model: string
    timestamp: string
  }
}

/**
 * Resposta da API (error)
 */
export interface ParseJobErrorResponse {
  success: false
  error: string
  details?: unknown
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm test __tests__/lib/ai/types.test.ts --run
```

Expected: PASS (5 tests)

**Step 5: Commit types**

```bash
git add lib/ai/types.ts __tests__/lib/ai/types.test.ts
git commit -m "feat(ai): add TypeScript types and Zod schemas for job parsing"
```

---

## Task 3: Create Gemini Configuration

**Files:**
- Create: `lib/ai/config.ts`
- Test: `__tests__/lib/ai/config.test.ts`

**Step 1: Write config validation test**

Create `__tests__/lib/ai/config.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createGeminiClient, validateAIConfig, GEMINI_CONFIG } from '@/lib/ai/config'

describe('AI Config', () => {
  let originalApiKey: string | undefined

  beforeEach(() => {
    originalApiKey = process.env.GOOGLE_API_KEY
  })

  afterEach(() => {
    process.env.GOOGLE_API_KEY = originalApiKey
  })

  describe('createGeminiClient', () => {
    it('should throw if GOOGLE_API_KEY is missing', () => {
      delete process.env.GOOGLE_API_KEY
      expect(() => createGeminiClient()).toThrow('GOOGLE_API_KEY not found')
    })

    it('should create client if GOOGLE_API_KEY exists', () => {
      process.env.GOOGLE_API_KEY = 'test-key'
      const client = createGeminiClient()
      expect(client).toBeDefined()
    })
  })

  describe('validateAIConfig', () => {
    it('should return true if GOOGLE_API_KEY exists', () => {
      process.env.GOOGLE_API_KEY = 'test-key'
      expect(validateAIConfig()).toBe(true)
    })

    it('should throw if GOOGLE_API_KEY is missing', () => {
      delete process.env.GOOGLE_API_KEY
      expect(() => validateAIConfig()).toThrow()
    })
  })

  describe('GEMINI_CONFIG', () => {
    it('should have correct model name', () => {
      expect(GEMINI_CONFIG.model).toBe('gemini-2.0-flash-exp')
    })

    it('should have low temperature for consistency', () => {
      expect(GEMINI_CONFIG.temperature).toBe(0.1)
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm test __tests__/lib/ai/config.test.ts --run
```

Expected: FAIL - "Cannot find module '@/lib/ai/config'"

**Step 3: Create config file**

Create `lib/ai/config.ts`:

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Configuração do modelo Gemini
 */
export const GEMINI_CONFIG = {
  model: 'gemini-2.0-flash-exp',
  temperature: 0.1, // Baixa para consistência
  maxOutputTokens: 8192,
  topP: 0.95,
  topK: 40,
} as const

/**
 * Cria cliente Gemini configurado
 * @throws Error se GOOGLE_API_KEY não estiver configurada
 */
export function createGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_API_KEY

  if (!apiKey) {
    throw new Error(
      'GOOGLE_API_KEY not found in environment. ' +
      'Get your key at: https://aistudio.google.com/app/apikey'
    )
  }

  return new GoogleGenerativeAI(apiKey)
}

/**
 * Valida que a configuração AI está correta
 * @throws Error se configuração inválida
 */
export function validateAIConfig(): boolean {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error(
      'GOOGLE_API_KEY not found. Configure in .env.local\n' +
      'Get your key at: https://aistudio.google.com/app/apikey'
    )
  }
  return true
}
```

**Step 4: Run test to verify it passes**

```bash
pnpm test __tests__/lib/ai/config.test.ts --run
```

Expected: PASS (5 tests)

**Step 5: Commit config**

```bash
git add lib/ai/config.ts __tests__/lib/ai/config.test.ts
git commit -m "feat(ai): add Gemini client configuration"
```

---

## Task 4: Create Extraction Prompts

**Files:**
- Create: `lib/ai/prompts.ts`

**Step 1: Create prompts file**

Create `lib/ai/prompts.ts`:

```typescript
/**
 * Prompt para extrair dados estruturados de descrições de vagas
 */
export function buildJobExtractionPrompt(jobDescription: string): string {
  return `
Você é um especialista em análise de vagas de emprego com mais de 10 anos de experiência.

Sua tarefa é extrair dados estruturados da descrição de vaga abaixo.

DESCRIÇÃO DA VAGA:
${jobDescription}

CAMPOS A EXTRAIR:

1. **Empresa:** Nome completo da empresa
2. **Cargo:** Título exato da vaga
3. **Local:** Cidade, Estado, País OU "Remoto" se trabalho remoto
4. **Modalidade:** EXATAMENTE um dos valores: "Presencial" | "Híbrido" | "Remoto"
5. **Tipo da Vaga:** EXATAMENTE um dos valores: "Estágio" | "Júnior" | "Pleno" | "Sênior"
6. **Requisitos Obrigatórios:** Array de habilidades, experiências ou formação obrigatórias
7. **Requisitos Desejáveis:** Array de qualificações nice-to-have
8. **Responsabilidades:** Array de principais atividades do cargo
9. **Benefícios:** Array de benefícios oferecidos (vale refeição, plano de saúde, etc)
10. **Salário:** Faixa salarial como string OU null se não mencionado
11. **Idioma da Vaga:** "pt" se a vaga está em português, "en" se em inglês

REGRAS CRÍTICAS:
- Extraia EXATAMENTE como escrito na descrição original
- Se uma informação não estiver presente, use [] (array vazio) ou null
- Os campos modalidade e tipo_vaga DEVEM usar EXATAMENTE um dos valores permitidos
- Preserve palavras-chave originais (importante para ATS - Applicant Tracking Systems)
- Não invente informações - se não está na descrição, deixe vazio

FORMATO DE SAÍDA:

Retorne APENAS um objeto JSON válido dentro de um code fence, seguindo este formato exato:

\`\`\`json
{
  "empresa": "Nome da Empresa",
  "cargo": "Título da Vaga",
  "local": "Cidade, Estado",
  "modalidade": "Presencial" | "Híbrido" | "Remoto",
  "tipo_vaga": "Estágio" | "Júnior" | "Pleno" | "Sênior",
  "requisitos_obrigatorios": ["skill1", "skill2"],
  "requisitos_desejaveis": ["skill1", "skill2"],
  "responsabilidades": ["atividade1", "atividade2"],
  "beneficios": ["beneficio1", "beneficio2"],
  "salario": "R$ 2000-3000" | null,
  "idioma_vaga": "pt" | "en"
}
\`\`\`

Retorne SOMENTE o JSON. Não adicione explicações antes ou depois.
`.trim()
}

/**
 * System prompt que define o papel do agente
 */
export const SYSTEM_PROMPT = `
Você é um Senior Job Posting Analyst especializado em extrair dados estruturados de descrições de vagas.

Você processou mais de 10.000 vagas do LinkedIn, Indeed, Gupy e sites de empresas.

Você identifica com 100% de precisão:
- Informações da empresa e cargo
- Requisitos obrigatórios vs desejáveis
- Responsabilidades e benefícios
- Modalidade de trabalho (presencial/híbrido/remoto)
- Nível de senioridade

Você sempre retorna JSON válido dentro de code fence markdown.
`.trim()
```

**Step 2: Commit prompts**

```bash
git add lib/ai/prompts.ts
git commit -m "feat(ai): add job extraction prompts"
```

---

## Task 5: Create Job Parser Service

**Files:**
- Create: `lib/ai/job-parser.ts`
- Test: `__tests__/lib/ai/job-parser.test.ts`

**Step 1: Write JSON extraction test**

Create `__tests__/lib/ai/job-parser.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { extractJsonFromResponse } from '@/lib/ai/job-parser'

describe('extractJsonFromResponse', () => {
  it('should extract JSON from code fence', () => {
    const response = '```json\n{"empresa": "Test Corp"}\n```'
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ empresa: 'Test Corp' })
  })

  it('should extract JSON without code fence', () => {
    const response = '{"empresa": "Test Corp"}'
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ empresa: 'Test Corp' })
  })

  it('should extract JSON with extra text before', () => {
    const response = 'Here is the data:\n```json\n{"empresa": "Test"}\n```'
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ empresa: 'Test' })
  })

  it('should extract JSON with extra text after', () => {
    const response = '```json\n{"empresa": "Test"}\n```\nHope this helps!'
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ empresa: 'Test' })
  })

  it('should throw if no JSON found', () => {
    const response = 'No JSON here at all'
    expect(() => extractJsonFromResponse(response)).toThrow('No valid JSON found')
  })

  it('should throw if JSON is invalid', () => {
    const response = '```json\n{invalid json}\n```'
    expect(() => extractJsonFromResponse(response)).toThrow()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
pnpm test __tests__/lib/ai/job-parser.test.ts --run
```

Expected: FAIL - "Cannot find module '@/lib/ai/job-parser'"

**Step 3: Create job parser service**

Create `lib/ai/job-parser.ts`:

```typescript
import { createGeminiClient, GEMINI_CONFIG } from './config'
import { buildJobExtractionPrompt, SYSTEM_PROMPT } from './prompts'
import { JobDetails, JobDetailsSchema } from './types'

/**
 * Extrai JSON de resposta do LLM
 * Suporta JSON em code fence ou JSON direto
 */
export function extractJsonFromResponse(response: string): unknown {
  // Tentar extrair de code fence primeiro
  const codeFenceMatch = response.match(/```json\s*\n([\s\S]+?)\n```/)

  if (codeFenceMatch) {
    try {
      return JSON.parse(codeFenceMatch[1])
    } catch (error) {
      throw new Error('Invalid JSON in code fence')
    }
  }

  // Tentar extrair JSON direto
  const jsonMatch = response.match(/\{[\s\S]+\}/)

  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch (error) {
      throw new Error('Invalid JSON format')
    }
  }

  throw new Error('No valid JSON found in LLM response')
}

/**
 * Parseia descrição de vaga usando Gemini
 */
export async function parseJobWithGemini(
  jobDescription: string
): Promise<{ data: JobDetails; duration: number }> {
  const startTime = Date.now()

  // Criar cliente Gemini
  const genAI = createGeminiClient()
  const model = genAI.getGenerativeModel({
    model: GEMINI_CONFIG.model,
    generationConfig: {
      temperature: GEMINI_CONFIG.temperature,
      maxOutputTokens: GEMINI_CONFIG.maxOutputTokens,
      topP: GEMINI_CONFIG.topP,
      topK: GEMINI_CONFIG.topK,
    },
    systemInstruction: SYSTEM_PROMPT,
  })

  // Montar prompt
  const prompt = buildJobExtractionPrompt(jobDescription)

  // Chamar Gemini
  const result = await model.generateContent(prompt)
  const response = result.response
  const text = response.text()

  // Extrair JSON
  const jsonData = extractJsonFromResponse(text)

  // Validar com Zod
  const validated = JobDetailsSchema.parse(jsonData)

  const duration = Date.now() - startTime

  return { data: validated, duration }
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test __tests__/lib/ai/job-parser.test.ts --run
```

Expected: PASS (6 tests for extractJsonFromResponse)

Note: We're NOT testing `parseJobWithGemini` directly as it calls external API

**Step 5: Commit job parser**

```bash
git add lib/ai/job-parser.ts __tests__/lib/ai/job-parser.test.ts
git commit -m "feat(ai): add job parser service with Gemini integration"
```

---

## Task 6: Create API Route

**Files:**
- Create: `app/api/ai/parse-job/route.ts`

**Step 1: Create API route**

Create `app/api/ai/parse-job/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { validateAIConfig } from '@/lib/ai/config'
import { parseJobWithGemini } from '@/lib/ai/job-parser'
import { ParseJobRequestSchema } from '@/lib/ai/types'
import { ZodError } from 'zod'

/**
 * POST /api/ai/parse-job
 * Parseia descrição de vaga usando Gemini
 */
export async function POST(request: NextRequest) {
  try {
    // Validar configuração
    validateAIConfig()

    // Parse e validar body
    const body = await request.json()
    const { jobDescription } = ParseJobRequestSchema.parse(body)

    console.log('[AI Parser] Starting job parsing...')

    // Chamar serviço de parsing
    const { data, duration } = await parseJobWithGemini(jobDescription)

    console.log(`[AI Parser] Parsing completed in ${duration}ms`)

    // Retornar sucesso
    return NextResponse.json({
      success: true,
      data,
      metadata: {
        duration,
        model: 'gemini-2.0-flash-exp',
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('[AI Parser] Error:', error)

    // Erro de validação Zod
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    // Erro genérico
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/parse-job
 * Health check endpoint
 */
export async function GET() {
  try {
    validateAIConfig()
    return NextResponse.json({
      status: 'ok',
      message: 'AI Parser configured correctly',
      model: 'gemini-2.0-flash-exp',
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Configuration error',
      },
      { status: 500 }
    )
  }
}
```

**Step 2: Test health check endpoint**

```bash
# Start dev server in background
pnpm dev &

# Wait for server to start
sleep 5

# Test health check
curl http://localhost:3000/api/ai/parse-job
```

Expected: `{"status":"ok","message":"AI Parser configured correctly","model":"gemini-2.0-flash-exp"}`

**Step 3: Commit API route**

```bash
git add app/api/ai/parse-job/route.ts
git commit -m "feat(ai): add REST API endpoint for job parsing"
```

---

## Task 7: Create Test Interface

**Files:**
- Create: `app/test-ai/page.tsx`

**Step 1: Create test interface**

Create `app/test-ai/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { JobDetails } from '@/lib/ai/types'

const EXAMPLE_JOB = `Vaga de Estágio em Engenharia Química - Saipem

Local: Guarujá, São Paulo
Modalidade: Híbrido

Sobre a empresa:
Saipem é uma multinacional italiana líder em engenharia e construção para o setor de energia.

Responsabilidades:
- Monitoramento e arquivamento de registros de qualidade
- Suporte em indicadores de desempenho (KPIs)
- Participação em treinamentos

Requisitos obrigatórios:
- Graduação em andamento em Engenharia (Química, Mecânica, Produção)
- Inglês intermediário
- MS Excel, Word, PowerPoint

Requisitos desejáveis:
- Conhecimento em ISO 9001:2015

Benefícios:
- Seguro saúde e odontológico
- Vale refeição
- Vale transporte`

export default function TestAIPage() {
  const [jobDescription, setJobDescription] = useState(EXAMPLE_JOB)
  const [result, setResult] = useState<JobDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<any>(null)

  const handleParse = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    setMetadata(null)

    try {
      const response = await fetch('/api/ai/parse-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription }),
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.data)
        setMetadata(data.metadata)
      } else {
        setError(data.error || 'Unknown error')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🤖 AI Job Parser Test</h1>
        <p className="text-gray-600">
          Test Gemini-powered job description parser (Phase 1)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              📋 Job Description Input
            </label>
            <textarea
              className="w-full h-96 p-4 border rounded-lg font-mono text-sm"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste job description here..."
            />
          </div>

          <button
            onClick={handleParse}
            disabled={loading || !jobDescription}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? '⏳ Parsing...' : '🚀 Parse Job Description'}
          </button>

          {metadata && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm">
              <p><strong>Model:</strong> {metadata.model}</p>
              <p><strong>Duration:</strong> {metadata.duration}ms</p>
              <p><strong>Timestamp:</strong> {new Date(metadata.timestamp).toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Output Section */}
        <div>
          <label className="block text-sm font-medium mb-2">
            📊 Parsed Output
          </label>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 font-medium">❌ Error:</p>
              <pre className="text-sm mt-2 text-red-700 whitespace-pre-wrap">{error}</pre>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* JSON View */}
              <div className="p-4 bg-gray-900 text-green-400 rounded-lg overflow-x-auto">
                <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
              </div>

              {/* Human-Readable View */}
              <div className="p-4 bg-white border rounded-lg">
                <h3 className="font-bold mb-3">✅ Extracted Data:</h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="font-semibold">Company:</dt>
                    <dd>{result.empresa}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Position:</dt>
                    <dd>{result.cargo}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Location:</dt>
                    <dd>{result.local} ({result.modalidade})</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Level:</dt>
                    <dd>{result.tipo_vaga}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold">Required Skills:</dt>
                    <dd>{result.requisitos_obrigatorios.join(', ')}</dd>
                  </div>
                  {result.requisitos_desejaveis.length > 0 && (
                    <div>
                      <dt className="font-semibold">Nice-to-Have:</dt>
                      <dd>{result.requisitos_desejaveis.join(', ')}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="font-semibold">Language:</dt>
                    <dd>{result.idioma_vaga === 'pt' ? '🇧🇷 Portuguese' : '🇺🇸 English'}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Test interface manually**

```bash
# Dev server should still be running
# Open browser: http://localhost:3000/test-ai
```

Expected: Interface loads, shows example job description

**Step 3: Commit test interface**

```bash
git add app/test-ai/page.tsx
git commit -m "feat(ai): add test interface for job parser"
```

---

## Task 8: Create Validation Script

**Files:**
- Create: `scripts/validate-ai-setup.ts`

**Step 1: Create validation script**

Create `scripts/validate-ai-setup.ts`:

```typescript
import { createGeminiClient, GEMINI_CONFIG } from '../lib/ai/config'

async function validateSetup() {
  console.log('🔍 Validating AI Setup...\n')

  // Check environment variable
  if (!process.env.GOOGLE_API_KEY) {
    console.error('❌ GOOGLE_API_KEY not found in .env.local')
    console.error('\nGet your key at: https://aistudio.google.com/app/apikey')
    process.exit(1)
  }
  console.log('✅ GOOGLE_API_KEY configured')

  // Test Gemini connection
  try {
    const genAI = createGeminiClient()
    const model = genAI.getGenerativeModel({
      model: GEMINI_CONFIG.model,
    })

    console.log('🔄 Testing Gemini connection...')

    const result = await model.generateContent('Say "Hello, AI Parser!"')
    const response = result.response.text()

    console.log('✅ Gemini connection successful')
    console.log(`📝 Test response: ${response}\n`)

    console.log('🎉 All validations passed!')
    console.log(`\nConfiguration:`)
    console.log(`  - Model: ${GEMINI_CONFIG.model}`)
    console.log(`  - Temperature: ${GEMINI_CONFIG.temperature}`)
    console.log(`  - Max tokens: ${GEMINI_CONFIG.maxOutputTokens}`)
  } catch (error) {
    console.error('❌ Failed to connect to Gemini:', error)
    process.exit(1)
  }
}

validateSetup()
```

**Step 2: Run validation script**

```bash
pnpm validate:ai
```

Expected: All checks pass, shows test response from Gemini

**Step 3: Commit validation script**

```bash
git add scripts/validate-ai-setup.ts
git commit -m "feat(ai): add validation script for AI setup"
```

---

## Task 9: End-to-End Validation

**Files:**
- None (validation only)

**Step 1: Run all tests**

```bash
pnpm test --run
```

Expected: All tests pass (including new AI tests)

**Step 2: Test API with real job description**

Create test file `test-job.sh`:

```bash
#!/bin/bash

curl -X POST http://localhost:3000/api/ai/parse-job \
  -H "Content-Type: application/json" \
  -d '{
    "jobDescription": "Vaga de Desenvolvedor Full Stack Júnior na TechCorp. Local: São Paulo, SP. Modalidade: Híbrido. Requisitos: JavaScript, React, Node.js. Inglês intermediário. Benefícios: Vale refeição, plano de saúde."
  }' | jq
```

**Step 3: Run API test**

```bash
chmod +x test-job.sh
./test-job.sh
```

Expected: Valid JSON response with extracted data

**Step 4: Test via interface**

1. Open http://localhost:3000/test-ai
2. Click "Parse Job Description" (using pre-loaded example)
3. Verify all fields extracted correctly

**Step 5: Verify quality checklist**

- [ ] Empresa extracted correctly
- [ ] Cargo extracted correctly
- [ ] Local extracted correctly
- [ ] Modalidade is one of: Presencial/Híbrido/Remoto
- [ ] Tipo_vaga is one of: Estágio/Júnior/Pleno/Sênior
- [ ] Requisitos separated (obrigatórios vs desejáveis)
- [ ] Responsabilidades extracted
- [ ] Benefícios extracted
- [ ] Salário is string or null
- [ ] Idioma detected (pt or en)
- [ ] Parsing completes in < 5 seconds
- [ ] No TypeScript errors (`pnpm build`)

**Step 6: Final commit**

```bash
git add test-job.sh
git commit -m "test(ai): add end-to-end validation script"
```

---

## Task 10: Documentation and Cleanup

**Files:**
- Modify: `CLAUDE.md`
- Create: `README-AI.md` (optional)

**Step 1: Update CLAUDE.md**

Add to `CLAUDE.md` after "File Upload Architecture" section:

```markdown
### AI Job Parser (Phase 1)

The system includes LLM-powered parsing to extract structured data from unstructured job descriptions.

**Architecture:**
- **Service:** `lib/ai/job-parser.ts` - Gemini 2.0 Flash integration
- **API:** `POST /api/ai/parse-job` - REST endpoint
- **Test UI:** `/test-ai` - Manual validation interface

**Configuration:**
```env
GOOGLE_API_KEY=your_key_here  # Get at: https://aistudio.google.com/app/apikey
```

**Validation:**
```bash
pnpm validate:ai  # Test Gemini connection
```

**Usage:**
```typescript
import { parseJobWithGemini } from '@/lib/ai/job-parser'

const { data, duration } = await parseJobWithGemini(jobDescription)
// data: JobDetails (validated with Zod)
```

**Output Schema:** Compatible with `ParsedVagaData` from `markdown-parser.ts`

**Costs:** ~$0.0003 per parsing (Gemini free tier: 15 req/min, 1M tokens/day)

**Future Phases:**
- Phase 2: Fit calculator (compare profile vs requirements)
- Phase 3: Analysis writer (generate `analise-vaga.md`)
- Phase 4: Resume personalizer (generate PDFs)
```

**Step 2: Commit documentation**

```bash
git add CLAUDE.md
git commit -m "docs: document AI job parser in CLAUDE.md"
```

**Step 3: Final validation**

```bash
# Run all tests
pnpm test --run

# Check TypeScript
pnpm build

# Verify lint
pnpm lint
```

Expected: All pass

---

## Completion Checklist

**Setup:**
- [ ] `@google/generative-ai` installed
- [ ] `GOOGLE_API_KEY` configured in `.env.local`
- [ ] `.env.example` updated with documentation
- [ ] `validate:ai` script added to package.json

**Code:**
- [ ] `lib/ai/types.ts` - Types and Zod schemas
- [ ] `lib/ai/config.ts` - Gemini client config
- [ ] `lib/ai/prompts.ts` - Extraction prompts
- [ ] `lib/ai/job-parser.ts` - Main parsing service
- [ ] `app/api/ai/parse-job/route.ts` - API endpoint
- [ ] `app/test-ai/page.tsx` - Test interface
- [ ] `scripts/validate-ai-setup.ts` - Validation script

**Tests:**
- [ ] `__tests__/lib/ai/types.test.ts` - Schema validation
- [ ] `__tests__/lib/ai/config.test.ts` - Config validation
- [ ] `__tests__/lib/ai/job-parser.test.ts` - JSON extraction
- [ ] All tests pass (`pnpm test --run`)

**Validation:**
- [ ] Health check works: `curl localhost:3000/api/ai/parse-job`
- [ ] Validation script works: `pnpm validate:ai`
- [ ] Test interface loads: `http://localhost:3000/test-ai`
- [ ] Can parse example job successfully
- [ ] Parsing completes in < 5 seconds
- [ ] All fields extracted correctly
- [ ] No TypeScript errors (`pnpm build`)
- [ ] No lint errors (`pnpm lint`)

**Documentation:**
- [ ] `CLAUDE.md` updated with AI parser docs
- [ ] Design document committed (`docs/plans/2025-01-17-ai-job-parser-design.md`)
- [ ] All commits follow conventional commits format

---

## Next Steps (After Phase 1)

Once this implementation is complete and validated:

1. **Merge to main** - Use `superpowers:finishing-a-development-branch`
2. **Phase 2 Planning** - Fit calculator design
3. **Phase 3 Planning** - Analysis writer design
4. **Phase 4 Planning** - Resume personalizer design
5. **Integration** - Add to main dashboard UI

---

**Plan saved to:** `docs/plans/2025-01-17-ai-job-parser-implementation.md`
**Ready for execution via:** `superpowers:executing-plans` or `superpowers:subagent-driven-development`
