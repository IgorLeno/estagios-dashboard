# Diagnóstico: Configurações de IA não refletidas nos prompts/LLM

**Data:** 2025-12-07
**Status:** 🔴 Confirmado - Root cause identificado
**Prioridade:** Alta

---

## 📋 Sumário Executivo

**Problema:** A tela de Configurações > Prompts de IA permite editar modelo, temperatura, dossiê e prompts customizados, mas as rotas de IA (`/api/ai/parse-job`, `/api/ai/generate-resume`) **ignoram completamente** essas configurações e continuam usando valores hardcoded.

**Impacto:**

- Dossiê customizado (Engenharia Química, Bertioga/SP) não é usado
- Análises de vaga assumem perfil errado (Engenharia de Software / Computação)
- Modelo exibido na UI (Gemini) não corresponde ao usado (Grok)
- Parâmetros de temperatura/tokens não são aplicados

**Root Cause:** Rotas de IA não chamam `loadUserAIConfig()` nem usam `PromptsConfig`. Usam prompts/perfil hardcoded.

---

## 🔍 Phase 1: Root Cause Investigation

### 1. Onde as configs são salvas

**Fonte de verdade:**

- **Tabela Supabase:** `prompts_config`
- **Serviço:** `lib/supabase/prompts.ts`
  - `getPromptsConfig(userId)` - Lê configs (user-specific ou global default)
  - `savePromptsConfig(config, userId)` - Salva/atualiza configs
- **Tipo:** `PromptsConfig` em `lib/types.ts`

**UI:**

- **Componente:** `components/configuracoes-prompts.tsx`
- **API Route:** `app/api/prompts/route.ts`
  - GET: retorna configs via `getPromptsConfig()`
  - POST: salva via `savePromptsConfig()`

**Campos persistidos:**

```typescript
{
  modelo_gemini: string       // Ex: "x-ai/grok-4.1-fast"
  temperatura: number         // 0.0 - 1.0
  max_tokens: number          // 512 - 32768
  top_p?: number
  top_k?: number
  dossie_prompt: string       // Perfil do candidato
  analise_prompt: string      // Regras de análise
  curriculo_prompt: string    // Regras de currículo
}
```

**✅ Conclusão:** Sistema de persistência **funciona perfeitamente**. Configs salvam e leem corretamente.

---

### 2. Onde os prompts/modelo são montados hoje (rotas de IA)

#### Rota: `/api/ai/parse-job`

**Arquivo:** `app/api/ai/parse-job/route.ts`
**Função:** `parseJobWithAnalysis()` em `lib/ai/job-parser.ts`

**Linha 437 (`job-parser.ts`):**

```typescript
const prompt = buildJobAnalysisPrompt(jobDescription, USER_PROFILE) // ❌ HARDCODED
```

**USER_PROFILE hardcoded (`lib/ai/user-profile.ts:17-26`):**

```typescript
export const USER_PROFILE: UserProfile = {
  skills: ["TypeScript", "React", "Next.js", "Node.js", ...],
  education: "Cursando Engenharia de Software / Ciência da Computação",  // ❌ ERRADO!
  goals: "Conseguir estágio em tech para ganhar experiência prática em desenvolvimento de software",
}
```

**buildJobAnalysisPrompt() (`lib/ai/analysis-prompts.ts:38-54`):**

```typescript
export function buildJobAnalysisPrompt(jobDescription: string, userProfile: UserProfile): string {
  return `
  2. Perfil do Candidato:
  - Habilidades: ${userProfile.skills.join(", ")}      // ❌ USA USER_PROFILE HARDCODED
  - Experiência: ${userProfile.experience.join("; ")}
  - Formação: ${userProfile.education}                  // ❌ "Eng. Software", não "Eng. Química"
  - Objetivos: ${userProfile.goals}
  `
}
```

**Modelo usado (`lib/ai/config.ts:9-14`):**

```typescript
export const AI_MODEL_CONFIG = {
  model: "x-ai/grok-4.1-fast", // ✅ Correto (Grok)
  temperature: 0.7, // ❌ Hardcoded, não usa config.temperatura
  maxOutputTokens: 4096, // ❌ Hardcoded, não usa config.max_tokens
  topP: 0.9, // ❌ Hardcoded, não usa config.top_p
}
```

**❌ Problema:** `parseJobWithAnalysis()` **NUNCA** chama:

- `loadUserAIConfig(userId)` (existe mas não é usado)
- `config.dossie_prompt` (existe mas é ignorado)
- `getGenerationConfig(config)` (existe mas não é usado)

#### Rota: `/api/ai/generate-resume`

**Análise pendente** - provavelmente mesmo padrão (prompts hardcoded).

---

### 3. Existe serviço central de settings?

**✅ SIM!** Infraestrutura completa já existe em `lib/ai/config.ts`:

**Funções prontas mas NÃO USADAS:**

```typescript
// lib/ai/config.ts:114-116
export async function loadUserAIConfig(userId?: string): Promise<PromptsConfig> {
  return await getPromptsConfig(userId)
}

// lib/ai/config.ts:125-131
export function getGenerationConfig(config: PromptsConfig) {
  return {
    temperature: config.temperatura,
    maxOutputTokens: config.max_tokens,
    topP: config.top_p,
  }
}
```

**✅ Conclusão:** Funções já existem para integração, mas **rotas de IA não as chamam**.

---

## 🎯 Root Cause Summary

| Componente               | Status                    | Problema                                       |
| ------------------------ | ------------------------- | ---------------------------------------------- |
| UI de Configs            | ✅ Funciona               | Salva/lê corretamente de Supabase              |
| API `/api/prompts`       | ✅ Funciona               | GET/POST usando `getPromptsConfig()`           |
| Serviço `prompts.ts`     | ✅ Funciona               | Persistência funcional                         |
| Tipo `PromptsConfig`     | ✅ Funciona               | Schema correto                                 |
| Funções de integração    | ⚠️ Existem mas não usadas | `loadUserAIConfig()`, `getGenerationConfig()`  |
| **Rotas de IA**          | ❌ **IGNORAM CONFIGS**    | Usam `USER_PROFILE` hardcoded                  |
| **Prompts de análise**   | ❌ **HARDCODED**          | `analysis-prompts.ts` não usa `dossie_prompt`  |
| **Parâmetros do modelo** | ❌ **HARDCODED**          | `AI_MODEL_CONFIG` não usa `config.temperatura` |

**Root Cause:**
As rotas de IA (`parse-job`, `generate-resume`) usam:

- ❌ `USER_PROFILE` hardcoded em vez de `config.dossie_prompt`
- ❌ `AI_MODEL_CONFIG` hardcoded em vez de `getGenerationConfig(config)`
- ❌ Prompts hardcoded em `analysis-prompts.ts` em vez de `config.analise_prompt`

**Infraestrutura de integração existe, mas não é chamada pelas rotas.**

---

## 📝 Phase 2: Plano de Correção

### Objetivo

Fazer com que as rotas de IA (`/api/ai/parse-job`, `/api/ai/generate-resume`) leiam e usem as configurações salvas em `prompts_config` via `loadUserAIConfig()`.

### Fonte de Verdade Única

**Tabela:** `prompts_config` (Supabase)
**Serviço:** `lib/supabase/prompts.ts` (`getPromptsConfig`, `savePromptsConfig`)
**Tipo:** `PromptsConfig` (`lib/types.ts`)

**Campos:**

- `modelo_gemini`: Nome do modelo (Grok via OpenRouter)
- `temperatura`, `max_tokens`, `top_p`, `top_k`: Parâmetros de geração
- `dossie_prompt`: Perfil completo do candidato (substitui `USER_PROFILE`)
- `analise_prompt`: Regras de análise de vaga
- `curriculo_prompt`: Regras de personalização de currículo

### Estratégia de Implementação

**Princípio:** Usar funções existentes (`loadUserAIConfig`, `getGenerationConfig`) nas rotas de IA.

### Batches de Implementação

#### Batch A: Integração no Job Parser

**Arquivos afetados:**

- `lib/ai/job-parser.ts` (parseJobWithAnalysis)
- `lib/ai/analysis-prompts.ts` (buildJobAnalysisPrompt)

**Mudanças:**

1. **`job-parser.ts:parseJobWithAnalysis()`**
   - Adicionar parâmetro `userId?: string`
   - Chamar `loadUserAIConfig(userId)` no início
   - Passar `config` para `buildJobAnalysisPrompt()`
   - Usar `config.dossie_prompt` em vez de `USER_PROFILE`
   - Usar `getGenerationConfig(config)` para parâmetros do modelo

2. **`analysis-prompts.ts:buildJobAnalysisPrompt()`**
   - Remover parâmetro `userProfile: UserProfile`
   - Adicionar parâmetro `dossiePrompt: string`
   - Substituir interpolação de `userProfile.*` por inclusão direta de `dossiePrompt`

3. **`app/api/ai/parse-job/route.ts`**
   - Obter `userId` da sessão (`supabase.auth.getUser()`)
   - Passar `userId` para `parseJobWithAnalysis(jobDescription, { userId })`

**Resultado esperado:**

- Análise de vaga usa dossiê salvo (Engenharia Química, Bertioga/SP)
- Parâmetros do modelo (temperatura, tokens) vêm de `prompts_config`

#### Batch B: Integração no Resume Generator

**Arquivos afetados:**

- `lib/ai/resume-generator.ts`
- `app/api/ai/generate-resume/route.ts`

**Mudanças:**

1. **`resume-generator.ts`**
   - Adicionar parâmetro `userId?: string`
   - Chamar `loadUserAIConfig(userId)`
   - Usar `config.curriculo_prompt` para system instruction
   - Usar `getGenerationConfig(config)` para parâmetros

2. **`app/api/ai/generate-resume/route.ts`**
   - Obter `userId` da sessão
   - Passar para gerador de currículo

**Resultado esperado:**

- Currículo personalizado usa regras salvas em `config.curriculo_prompt`

#### Batch C: Atualização da UI de Configurações

**Arquivos afetados:**

- `components/configuracoes-prompts.tsx` (labels, help text)

**Mudanças:**

1. Trocar label "Modelo Gemini" → "Modelo LLM" (linha 207)
2. Atualizar placeholder: `"gemini-2.5-flash"` → `"x-ai/grok-4.1-fast"` (linha 212)
3. Atualizar texto explicativo para mencionar Grok/OpenRouter (linha 215)
4. Atualizar descrição do card (linha 160): remover menção a "Gemini"

**Resultado esperado:**

- UI mostra modelo correto (Grok)
- Usuário sabe que é OpenRouter, não Gemini

#### Batch D: Deprecação de Arquivos Hardcoded

**Arquivos para remover (após Batch A/B):**

- `lib/ai/user-profile.ts` - Substituído por `config.dossie_prompt`

**Arquivos para documentar como deprecated:**

- `lib/ai/prompts.ts` - Se contiver prompts não usados
- Funções hardcoded em `analysis-prompts.ts` - Manter apenas wrappers para `config.*`

**Resultado esperado:**

- Código mais limpo, sem duplicação de fonte de verdade

#### Batch E: Testes

**Testes a criar/atualizar:**

1. **Unit Test:** `lib/ai/config.test.ts`
   - Testar `loadUserAIConfig(userId)` retorna config correta
   - Testar `getGenerationConfig(config)` extrai campos certos

2. **Integration Test:** `__tests__/api/ai/parse-job.test.ts`
   - Criar config customizada via `savePromptsConfig()`
   - Chamar `/api/ai/parse-job`
   - Verificar que análise menciona dados do dossiê customizado (não hardcoded)

3. **E2E Test (Playwright):** `tests/e2e/ia-settings.spec.ts`
   - Acessar Configurações > Prompts de IA
   - Atualizar dossiê (mudar formação, localização)
   - Salvar
   - Ir para análise de vaga
   - Verificar que texto da análise reflete novo dossiê

**Resultado esperado:**

- Cobertura de testes garante que configs são aplicadas
- Regressão detectável se rotas voltarem a usar hardcoded

---

## ✅ Critérios de Pronto

**Batch A (Job Parser):**

- [ ] `parseJobWithAnalysis()` chama `loadUserAIConfig(userId)`
- [ ] Dossiê usado vem de `config.dossie_prompt`, não `USER_PROFILE`
- [ ] Parâmetros do modelo vêm de `getGenerationConfig(config)`
- [ ] Análise de vaga menciona "Engenharia Química" e "Bertioga/SP" (do dossiê salvo)

**Batch B (Resume Generator):**

- [ ] Gerador de currículo usa `config.curriculo_prompt`
- [ ] Parâmetros do modelo vêm de `getGenerationConfig(config)`

**Batch C (UI):**

- [ ] Label exibe "Modelo LLM" (não "Modelo Gemini")
- [ ] Placeholder mostra `x-ai/grok-4.1-fast`
- [ ] Descrição menciona OpenRouter/Grok

**Batch D (Cleanup):**

- [ ] `user-profile.ts` removido
- [ ] Imports de `USER_PROFILE` removidos
- [ ] Funções hardcoded documentadas como deprecated

**Batch E (Testes):**

- [ ] Teste unitário para `loadUserAIConfig()` passa
- [ ] Teste de integração valida uso de config customizada
- [ ] Teste E2E confirma que dossiê atualizado reflete na análise

**Bug Resolvido:**

- [ ] Análise de vaga **NÃO menciona mais** "engenheiro de computação"
- [ ] Análise de vaga **USA** perfil salvo (Engenharia Química, Bertioga/SP)
- [ ] UI mostra modelo correto (Grok)
- [ ] Parâmetros salvos (temperatura, tokens) são aplicados nas chamadas de IA

---

## 📊 Evidências Coletadas (Phase 1)

### Arquivos Lidos

| Arquivo                                | Papel                  | Conclusão                             |
| -------------------------------------- | ---------------------- | ------------------------------------- |
| `components/configuracoes-prompts.tsx` | UI de configs          | ✅ Funciona corretamente              |
| `app/api/prompts/route.ts`             | API de configs         | ✅ GET/POST funcionais                |
| `lib/supabase/prompts.ts`              | Persistência           | ✅ CRUD funcional                     |
| `lib/types.ts`                         | Schema `PromptsConfig` | ✅ Tipo correto                       |
| `lib/ai/config.ts`                     | Funções de integração  | ⚠️ Existem mas não usadas             |
| `lib/ai/job-parser.ts`                 | Parser de vaga         | ❌ Usa `USER_PROFILE` hardcoded       |
| `lib/ai/user-profile.ts`               | Perfil hardcoded       | ❌ "Eng. Software" (errado!)          |
| `lib/ai/analysis-prompts.ts`           | Prompts de análise     | ❌ Interpola `USER_PROFILE` hardcoded |

### Linhas Críticas

**`job-parser.ts:437`**

```typescript
const prompt = buildJobAnalysisPrompt(jobDescription, USER_PROFILE) // ❌ NÃO USA CONFIG
```

**`user-profile.ts:17-26`**

```typescript
export const USER_PROFILE: UserProfile = {
  education: "Cursando Engenharia de Software / Ciência da Computação", // ❌ ERRADO
  // Deveria ser: "Engenharia Química (UNESP)"
}
```

**`config.ts:114-116` (existe mas não é chamado)**

```typescript
export async function loadUserAIConfig(userId?: string): Promise<PromptsConfig> {
  return await getPromptsConfig(userId) // ✅ Função pronta, só falta usar!
}
```

---

## 🔄 Próximos Passos

1. ✅ **Phase 1 completa:** Diagnóstico documentado
2. ⏭️ **Aprovação do plano:** Revisar este documento com usuário
3. ⏭️ **Phase 3:** Implementar Batch A (Job Parser)
4. ⏭️ **Phase 3:** Implementar Batch B (Resume Generator)
5. ⏭️ **Phase 3:** Implementar Batch C (UI labels)
6. ⏭️ **Phase 3:** Implementar Batch D (Cleanup)
7. ⏭️ **Phase 3:** Implementar Batch E (Testes)
8. ⏭️ **Verificação final:** Confirmar que análise usa dossiê correto

---

**Diagnostic completed:** 2025-12-07
**Agent:** Claude Sonnet 4.5 (systematic-debugging skill)
**Next:** Aguardando aprovação para Phase 3 (implementação)
