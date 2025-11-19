# Design: AI Job Parser (Fase 1)

**Data:** 2025-01-17
**Autor:** Claude Code + Igor
**Status:** Aprovado para implementação

---

## 1. Contexto e Objetivos

### Problema

O dashboard atual suporta upload de arquivos `.md` (análises de vagas) que são parseados para preencher formulários. Porém, descrições de vagas vêm de fontes não estruturadas:

- LinkedIn, Indeed, Gupy
- E-mails de recrutadores
- Sites de empresas

Atualmente, o usuário precisa:

1. Copiar descrição da vaga
2. Manualmente criar arquivo `.md` seguindo template
3. Fazer upload

**Objetivo:** Automatizar a extração de dados estruturados de descrições não estruturadas usando LLM.

### Escopo - Fase 1

**O que será implementado:**

- ✅ Endpoint REST que recebe texto livre (descrição de vaga)
- ✅ Integração com Gemini 1.5 Flash para extração de dados
- ✅ Validação e normalização de output
- ✅ Interface de teste para validação manual

**O que NÃO será implementado (fases futuras):**

- ❌ Cálculo automático de fit (requisitos/perfil)
- ❌ Geração de arquivo `analise-vaga.md`
- ❌ Personalização de currículos
- ❌ Geração de PDFs
- ❌ Integração com dashboard principal

### Critérios de Sucesso

- ✅ Parsing extrai 80%+ dos campos corretamente
- ✅ Completa em menos de 5 segundos
- ✅ Custo < $0.001 por parsing
- ✅ Interface de teste funcional

---

## 2. Arquitetura

### Visão Geral

```
┌─────────────────┐
│  /test-ai       │  Interface de teste (dev)
│  (Next.js page) │
└────────┬────────┘
         │ POST
         ↓
┌─────────────────────────┐
│ /api/ai/parse-job       │  API Route (Next.js)
│ - Validação input (Zod) │
│ - Error handling        │
└────────┬────────────────┘
         │ calls
         ↓
┌─────────────────────────────┐
│ lib/ai/job-parser.ts        │  Serviço principal
│ - Monta prompt              │
│ - Chama Gemini              │
│ - Valida output             │
│ - Normaliza scores          │
└────────┬────────────────────┘
         │ uses
         ↓
┌─────────────────────────────┐
│ lib/ai/config.ts            │  Gemini client
│ - GoogleGenerativeAI        │
│ - Configurações do modelo   │
└─────────────────────────────┘
```

### Componentes

**1. API Route** (`app/api/ai/parse-job/route.ts`)

- Valida input (min 50 caracteres)
- Valida `GOOGLE_API_KEY` presente
- Chama serviço de parsing
- Retorna JSON estruturado ou erro

**2. Job Parser Service** (`lib/ai/job-parser.ts`)

- Carrega prompt de extração
- Chama Gemini 1.5 Flash (com fallback automático)
- Extrai JSON da resposta
- Valida com Zod
- Normaliza scores (0-100 → 0-5, 0-10 → 0-5)
- Registra modelo usado com sucesso

**3. Prompts** (`lib/ai/prompts.ts`)

- Prompt de extração isolado
- Fácil iterar e versionar

**4. Configuração** (`lib/ai/config.ts`)

- Cliente Gemini com API key
- Parâmetros do modelo (temperature=0.1)

**5. Tipos** (`lib/ai/types.ts`)

- Interface `JobDetails`
- Schema Zod para validação

**6. Interface de Teste** (`app/test-ai/page.tsx`)

- Textarea para colar descrição
- Botão "Parse Job"
- Display JSON + human-readable

**7. Script de Validação** (`scripts/validate-ai-setup.ts`)

- Valida `GOOGLE_API_KEY` configurada
- Testa conexão com Gemini
- Executa via `pnpm validate:ai`

---

## 3. Estrutura de Pastas

```
lib/
├── ai/                          # Novo diretório
│   ├── types.ts                 # Interfaces TypeScript
│   ├── config.ts                # Cliente Gemini
│   ├── job-parser.ts            # Lógica principal
│   └── prompts.ts               # Prompts isolados

app/
├── api/
│   └── ai/
│       └── parse-job/
│           └── route.ts         # POST endpoint

├── test-ai/                     # Página de teste
│   └── page.tsx

scripts/
└── validate-gemini-setup.ts         # Script de validação
```

**Total:** 7-8 arquivos novos

---

## 4. Fluxo de Dados

### Request Flow

```
1. Usuário (/test-ai)
   - Cola descrição da vaga
   - Clica "Parse Job"
   ↓
2. POST /api/ai/parse-job
   - Body: { jobDescription: "..." }
   - Valida com Zod (min 50 chars)
   ↓
3. job-parser.ts
   - Carrega prompt
   - Injeta descrição no prompt
   - Chama Gemini API
   ↓
4. Gemini 1.5 Flash (+ fallback chain)
   - Analisa texto não estruturado
   - Retorna JSON em code fence
   - Fallback automático se quota excedida
   ↓
5. job-parser.ts (validação)
   - Extrai JSON (regex)
   - Valida com Zod
   - Normaliza scores
   ↓
6. API Response
   - { success: true, data: {...} }
   - OU { success: false, error: "..." }
   ↓
7. Interface (/test-ai)
   - Exibe JSON formatado
   - Card com dados extraídos
   - Metadata (tempo, modelo)
```

### Data Structures

```typescript
// Input
{
  "jobDescription": "Vaga de Estágio em Engenharia..."
}

// Output (success)
{
  "success": true,
  "data": {
    "empresa": "Saipem",
    "cargo": "Estagiário QHSE",
    "local": "Guarujá, São Paulo",
    "modalidade": "Híbrido",
    "tipo_vaga": "Estágio",
    "requisitos_obrigatorios": ["Graduação em andamento", "Inglês intermediário"],
    "requisitos_desejaveis": ["ISO 9001:2015"],
    "responsabilidades": ["Monitoramento de registros", "Suporte em KPIs"],
    "beneficios": ["Seguro saúde", "Vale refeição"],
    "salario": null,
    "idioma_vaga": "pt"
  },
  "metadata": {
    "duration": 3245,
    "model": "gemini-2.0-flash-exp",
    "timestamp": "2025-01-17T21:30:00.000Z"
  }
}

// Output (error)
{
  "success": false,
  "error": "GOOGLE_API_KEY not found in environment",
  "details": null
}
```

---

## 5. Detalhes de Implementação

### 5.1 Modelo LLM

**Gemini 2.0 Flash**

- Model ID: `gemini-2.0-flash-exp`
- Temperature: 0.1 (consistência)
- Max tokens: 8192
- Top-p: 0.95
- Top-k: 40

**Custos:**

- Input: ~$0.075/1M tokens
- Output: ~$0.30/1M tokens
- Parsing típico: ~1000 tokens → $0.0003

**Free tier:**

- 15 requests/minuto
- 1M tokens/dia

### 5.2 Prompt Engineering

**Estrutura do prompt:**

````
Você é um especialista em análise de vagas de emprego.

Extraia os seguintes dados da descrição abaixo:

DESCRIÇÃO DA VAGA:
{jobDescription}

CAMPOS A EXTRAIR:
- empresa: Nome completo da empresa
- cargo: Título exato da vaga
- local: Cidade, Estado OU "Remoto"
- modalidade: EXATAMENTE um de: "Presencial" | "Híbrido" | "Remoto"
- tipo_vaga: EXATAMENTE um de: "Estágio" | "Júnior" | "Pleno" | "Sênior"
- requisitos_obrigatorios: Array de skills/experiências obrigatórias
- requisitos_desejaveis: Array de diferenciais
- responsabilidades: Array de atividades do cargo
- beneficios: Array de benefícios oferecidos
- salario: Faixa salarial (string) OU null se não mencionado
- idioma_vaga: "pt" se português, "en" se inglês

REGRAS CRÍTICAS:
1. Extraia EXATAMENTE como escrito na vaga
2. Se informação faltante: use [] (array) ou null
3. modalidade e tipo_vaga DEVEM ser valores EXATOS da lista
4. Preserve keywords originais (importante para ATS)

RETORNE APENAS JSON válido em code fence:

```json
{
  "empresa": "...",
  "cargo": "...",
  ...
}
````

````

### 5.3 Validação com Zod

```typescript
import { z } from 'zod'

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
````

### 5.4 Normalização de Scores (Futuro)

Quando adicionar campos `requisitos` e `fit` (Fase 2), seguir lógica do `markdown-parser.ts`:

```typescript
function normalizeScore(value: number): number {
  // 0-5: manter (escala nova)
  if (value >= 0 && value <= 5) {
    return Math.round(value * 2) / 2 // Step 0.5
  }

  // 5.1-10: converter de 0-10 para 0-5
  if (value > 5 && value <= 10) {
    return Math.round((value / 10) * 5 * 2) / 2
  }

  // 10.1-100: converter de 0-100 para 0-5
  if (value > 10 && value <= 100) {
    return Math.round((value / 100) * 5 * 2) / 2
  }

  return 0
}
```

### 5.5 Error Handling

**Tipos de erro:**

1. **Missing API Key**
   - Status: 500
   - Message: "GOOGLE_API_KEY not found. Configure in .env.local"
   - Action: Adicionar key em `.env.local`

2. **Invalid Input**
   - Status: 400
   - Message: "Job description must be at least 50 characters"
   - Action: Fornecer descrição mais completa

3. **Gemini API Failure**
   - Status: 500
   - Message: "Failed to parse job description"
   - Action: Retry 1x, depois retornar erro

4. **Invalid JSON Response**
   - Status: 500
   - Message: "LLM did not return valid JSON"
   - Action: Log resposta completa, retry com prompt ajustado

5. **Validation Error (Zod)**
   - Status: 500
   - Message: "Invalid job details: [campo] is missing"
   - Action: Ajustar prompt, retry

6. **Rate Limit (15 req/min)**
   - Status: 429
   - Message: "Rate limit exceeded. Try again in X seconds"
   - Action: Usuário aguarda

**Retry Strategy:**

- Max 1 retry para API failures
- Não retry para validation errors (evitar loop)

---

## 6. Estratégia de Testes

### 6.1 Testes Manuais

**Interface `/test-ai`:**

- Textarea com exemplo pré-carregado
- Botão "Parse Job"
- Display:
  - JSON formatado (syntax highlighting)
  - Card human-readable
  - Metadata (tempo, modelo)

**Exemplo embutido:**

```
Vaga de Estágio em Engenharia Química - Saipem

Local: Guarujá, São Paulo
Modalidade: Híbrido

Sobre a empresa:
Saipem é uma multinacional italiana...

Responsabilidades:
- Monitoramento de registros
- Suporte em KPIs

Requisitos obrigatórios:
- Graduação em Engenharia
- Inglês intermediário
- MS Excel

Benefícios:
- Seguro saúde
- Vale refeição
```

**Checklist de validação manual:**

- ✅ Empresa: "Saipem"
- ✅ Cargo: "Estágio em Engenharia Química" (ou similar)
- ✅ Local: "Guarujá, São Paulo"
- ✅ Modalidade: "Híbrido"
- ✅ Tipo: "Estágio"
- ✅ Requisitos separados corretamente
- ✅ Idioma: "pt"

### 6.2 Testes Automatizados (Vitest)

**Escopo:** Apenas lógica pura (sem LLM calls)

````typescript
// __tests__/lib/ai/job-parser.test.ts

describe("extractJsonFromResponse", () => {
  it("should extract JSON from code fence", () => {
    const response = '```json\n{"empresa": "Test"}\n```'
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ empresa: "Test" })
  })

  it("should extract JSON without code fence", () => {
    const response = '{"empresa": "Test"}'
    const result = extractJsonFromResponse(response)
    expect(result).toEqual({ empresa: "Test" })
  })

  it("should throw if no JSON found", () => {
    const response = "No JSON here"
    expect(() => extractJsonFromResponse(response)).toThrow()
  })
})

describe("JobDetailsSchema validation", () => {
  it("should accept valid job details", () => {
    const valid = {
      empresa: "Test Corp",
      cargo: "Dev",
      local: "SP",
      modalidade: "Remoto",
      tipo_vaga: "Júnior",
      requisitos_obrigatorios: ["JS"],
      requisitos_desejaveis: [],
      responsabilidades: ["Code"],
      beneficios: [],
      salario: null,
      idioma_vaga: "pt",
    }
    expect(() => JobDetailsSchema.parse(valid)).not.toThrow()
  })

  it("should reject invalid modalidade", () => {
    const invalid = { ...validData, modalidade: "Invalid" }
    expect(() => JobDetailsSchema.parse(invalid)).toThrow()
  })
})
````

**Não testar:**

- ❌ Calls diretas ao Gemini (custa dinheiro, lentas)
- ❌ Integração completa (usar testes manuais)

### 6.3 Validação de Qualidade

**Testar com 3 tipos de fonte:**

1. **LinkedIn/Indeed** (estruturada)
   - Campos bem definidos
   - Esperado: 95%+ acurácia

2. **E-mail de recrutador** (semi-estruturada)
   - Menos formatação
   - Esperado: 80%+ acurácia

3. **Site de empresa** (texto corrido)
   - Narrativa, menos estrutura
   - Esperado: 70%+ acurácia

**Métricas de sucesso:**

- ✅ 80%+ dos campos extraídos corretamente
- ✅ Sem campos com dados ERRADOS (prefiro vazio a errado)
- ✅ Parsing completa em < 5 segundos
- ✅ Custo < $0.001 por parsing

---

## 7. Configuração e Deploy

### 7.1 Variáveis de Ambiente

**`.env.local` (desenvolvimento):**

```env
# Existing variables...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# NEW: AI Configuration
GOOGLE_API_KEY=your_api_key_here
```

**Obter API key:**

1. Acesse https://aistudio.google.com/app/apikey
2. Crie nova API key
3. Copie e adicione ao `.env.local`

**`.env.example` (documentação):**

```env
# === Google Gemini API Configuration ===
# Get your API key at: https://aistudio.google.com/app/apikey
# Free tier limits: 15 requests/min, 1.5K requests/day, 1M tokens/min
# Monitor usage: https://ai.dev/usage
GOOGLE_API_KEY=your_api_key_here

# Model used: gemini-1.5-flash (stable)
# Alternative models available via automatic fallback:
# - gemini-2.0-flash-001 (stable, higher quality)
# - gemini-2.5-pro (highest quality, requires billing for production)
# Note: Experimental models (-exp suffix) are NOT supported in free tier as of Nov 2025
```

### 7.2 Dependências

**Adicionar ao `package.json`:**

```bash
pnpm add @google/generative-ai
```

**Versões:**

- `@google/generative-ai`: ^0.21.0

### 7.3 Scripts npm

**Adicionar a `package.json`:**

```json
{
  "scripts": {
    "validate:ai": "tsx scripts/validate-gemini-setup.ts"
  }
}
```

**Uso:**

```bash
# Validar configuração AI
pnpm validate:ai

# Iniciar dev server
pnpm dev

# Acessar interface de teste
# http://localhost:3000/test-ai
```

### 7.4 Deploy (Vercel)

**Environment Variables no Vercel:**

```
GOOGLE_API_KEY = <sua_key_aqui>
```

**Considerações:**

- API key é server-side only (segura)
- Next.js API routes rodam em serverless functions
- Gemini tem cold start ~500ms (aceitável)

---

## 8. Próximos Passos (Fases Futuras)

### Fase 2: Fit Calculator

- Comparar perfil do candidato vs requisitos
- Calcular scores `fit_requisitos` e `fit_perfil` (0-5)
- Gerar justificativas

### Fase 3: Analysis Writer

- Gerar arquivo `analise-vaga.md`
- Seguir template `modelo-analise.md`
- Incluir resumo detalhado

### Fase 4: Resume Personalizer

- Ajustar seção RESUMO do CV
- Destacar skills relevantes
- Gerar PDFs (PT e EN)

### Fase 5: Integração com Dashboard

- Adicionar botão "Parse from description" no `add-vaga-dialog.tsx`
- Auto-preencher formulário com dados extraídos
- Upload opcional de análise gerada

---

## 9. Riscos e Mitigações

### Risco 1: LLM retorna dados incorretos

**Impacto:** Médio
**Probabilidade:** Baixa (temperature=0.1)
**Mitigação:**

- Validação com Zod bloqueia estrutura inválida
- Interface de teste permite revisão manual
- Futuro: adicionar feedback loop para corrigir

### Risco 2: Rate limit excedido (15 req/min)

**Impacto:** Baixo (uso pessoal)
**Probabilidade:** Baixa
**Mitigação:**

- Mensagem clara: "Try again in X seconds"
- Futuro: implementar queue se necessário

### Risco 3: Custo inesperado

**Impacto:** Muito Baixo
**Probabilidade:** Muito Baixa
**Mitigação:**

- Free tier: 1M tokens/dia (suficiente para ~1000 parsings)
- Custo por parsing: ~$0.0003
- 100 parsings/dia = $0.03/dia = $1/mês

### Risco 4: Gemini API instável

**Impacto:** Médio
**Probabilidade:** Baixa
**Mitigação:**

- Retry 1x automático
- Error handling graceful
- Futuro: fallback para GPT-4o-mini se necessário

---

## 10. Checklist de Implementação

### Setup

- [ ] Instalar dependência: `pnpm add @google/generative-ai`
- [ ] Obter `GOOGLE_API_KEY` em https://aistudio.google.com/app/apikey
- [ ] Adicionar key ao `.env.local`
- [ ] Atualizar `.env.example` com documentação

### Código

- [ ] Criar `lib/ai/types.ts` - Interfaces e schemas Zod
- [ ] Criar `lib/ai/config.ts` - Cliente Gemini
- [ ] Criar `lib/ai/prompts.ts` - Prompt de extração
- [ ] Criar `lib/ai/job-parser.ts` - Lógica principal
- [ ] Criar `app/api/ai/parse-job/route.ts` - API endpoint
- [ ] Criar `app/test-ai/page.tsx` - Interface de teste
- [ ] Criar `scripts/validate-gemini-setup.ts` - Script de validação

### Validação

- [ ] Executar `pnpm validate:ai` - deve passar
- [ ] Iniciar `pnpm dev`
- [ ] Acessar http://localhost:3000/test-ai
- [ ] Testar com exemplo pré-carregado
- [ ] Verificar JSON retornado está correto
- [ ] Testar com descrição real do LinkedIn
- [ ] Testar com descrição real de e-mail
- [ ] Verificar tempo de resposta < 5s

### Testes

- [ ] Criar `__tests__/lib/ai/job-parser.test.ts`
- [ ] Testar `extractJsonFromResponse()`
- [ ] Testar validação Zod
- [ ] Executar `pnpm test` - deve passar

### Documentação

- [ ] Atualizar `CLAUDE.md` com instruções AI
- [ ] Documentar scripts npm em README (opcional)
- [ ] Commitar design document

---

## 11. Referências

**Projeto:**

- `lib/markdown-parser.ts` - Parser existente (padrão a seguir)
- `lib/types.ts` - Tipos existentes (compatibilidade)
- `modelo-analise.md` - Template de análise (referência futura)

**Documentação Externa:**

- [Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [Google Generative AI Node.js SDK](https://github.com/google/generative-ai-js)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Zod Validation](https://zod.dev/)

**Custos:**

- [Gemini Pricing](https://ai.google.dev/pricing)
- Free tier: 15 RPM, 1M tokens/day

---

**Design aprovado em:** 2025-01-17
**Pronto para implementação:** ✅
