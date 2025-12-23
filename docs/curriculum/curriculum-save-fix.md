# Root Cause: Currículo não está sendo salvo

**Data:** 2025-12-08
**Status:** ✅ IMPLEMENTED - Ready for Testing

**Última atualização:** 2025-12-08 14:30

## Problema Reportado

**Fluxo atual:**

1. ✅ Usuário clica em "Adicionar Estágio"
2. ✅ Preenche dados da vaga
3. ✅ Clica em "Realizar Análise" → Análise é gerada com sucesso
4. ✅ Clica em "Gerar Preview" → Currículo é gerado e exibido corretamente no preview
5. ✅ Clica em "Salvar Vaga" → Vaga é salva no banco
6. ❌ Acessa página de detalhes da vaga → Mostra "Nenhum currículo gerado ainda" (currículo NÃO foi persistido)

## Phase 1: Root Cause Investigation

### Step 1: Map Add-Job Flow Components ✅

**Componente principal:** `components/add-vaga-dialog.tsx`

**Estados relevantes:**

- Linha 55: `const [resumeContent, setResumeContent] = useState("")`
- Linha 56: `const [resumePdfBase64, setResumePdfBase64] = useState<string | null>(null)`
- Linha 57: `const [resumeFilename, setResumeFilename] = useState<string | null>(null)`

**Tab de currículo:** `components/tabs/curriculo-tab.tsx`

- Recebe `resumePdfBase64` e `resumeFilename` como props (valores)
- **NÃO recebe** `setResumePdfBase64` nem `setResumeFilename` (setters)
- Usa estados locais próprios:
  - Linha 46: `const [pdfBase64Pt, setPdfBase64Pt] = useState<string | null>(null)`
  - Linha 47: `const [pdfBase64En, setPdfBase64En] = useState<string | null>(null)`

### Step 2: Trace Curriculum Generation API Call ✅

**Novo fluxo (CurriculoTab):**

1. **Gerar Preview:**
   - Linha 59-169: `handleGeneratePreview()`
   - Chama `/api/ai/generate-resume-html` para gerar HTML
   - Converte HTML → Markdown via `htmlToMarkdown()`
   - Linha 109: `setMarkdownPreviewPt(markdown)` - **Estado LOCAL**
   - Linha 153: `setMarkdownPreviewEn(markdown)` - **Estado LOCAL**

2. **Converter para PDF:**
   - Linha 173-255: `handleConvertToPdf()`
   - Converte Markdown → HTML → PDF
   - Chama `/api/ai/html-to-pdf`
   - Linha 207: `setPdfBase64Pt(result.data.pdfBase64)` - **Estado LOCAL**
   - Linha 242: `setPdfBase64En(result.data.pdfBase64)` - **Estado LOCAL**

**Problema:** Todos os PDFs gerados ficam nos estados locais do `CurriculoTab` (`pdfBase64Pt`, `pdfBase64En`), não atualizando os estados do dialog pai (`resumePdfBase64`).

### Step 3: Trace Job Save Flow ✅

**Função de salvamento:** `add-vaga-dialog.tsx:223-271` - `handleSaveVaga()`

```typescript
// Linha 232: Lê do estado do dialog PAI
const cvDataUrl = resumePdfBase64 ? `data:application/pdf;base64,${resumePdfBase64}` : null

const insertData = {
  empresa: formData.empresa,
  cargo: formData.cargo,
  // ... outros campos
  arquivo_cv_url: cvDataUrl, // Linha 245: Inclui no payload
  data_inscricao: dataInscricao,
}

// Linha 250: Insere no Supabase
const { data, error } = await supabase.from("vagas_estagio").insert(insertData).select()
```

**Schema do banco:** `supabase-schema.sql:32`

```sql
arquivo_cv_url TEXT -- URL do currículo PDF/DOCX
```

Campo existe no banco ✅

### Step 4: Verify Curriculum in Save Payload ✅

**Análise:**

- Linha 232: `cvDataUrl` é construído a partir de `resumePdfBase64`
- Linha 245: `arquivo_cv_url: cvDataUrl` está incluído no payload ✅
- **PROBLEMA:** `resumePdfBase64` está vazio/null porque o novo fluxo não atualiza esse estado do pai
- Os PDFs gerados ficam em `pdfBase64Pt`/`pdfBase64En` (estados locais do `CurriculoTab`)
- Resultado: `cvDataUrl = null` → `arquivo_cv_url = null` → Currículo não é salvo

### Step 5: Check Job Details Page ✅

**Página de detalhes:** `app/vaga/[id]/page.tsx`

**Leitura do currículo:**

- Linha 54-56: Verifica se `data?.arquivo_cv_url` existe
  ```typescript
  if (data?.arquivo_cv_url) {
    setHasGeneratedResume(true)
  }
  ```
- Linha 332-341: Se `vaga.arquivo_cv_url` existe, mostra botão "Baixar PDF"
- Linha 402-425: Se não existe, mostra "Nenhum currículo gerado ainda"

**Confirmação:** A página lê corretamente de `vaga.arquivo_cv_url`, mas esse campo está vazio no banco porque não foi salvo.

---

## Root Cause Analysis

### 🔴 ROOT CAUSE CONFIRMADO

**Problema:** Estados locais do `CurriculoTab` não propagam para o dialog pai.

**Fluxo atual (QUEBRADO):**

```
1. Usuário gera preview no CurriculoTab
   ↓
2. CurriculoTab.handleGeneratePreview() executa
   ↓
3. Markdown é armazenado em `markdownPreviewPt` (estado LOCAL)
   ↓
4. Usuário clica "Gerar PDF"
   ↓
5. CurriculoTab.handleConvertToPdf() executa
   ↓
6. PDF base64 é armazenado em `pdfBase64Pt` (estado LOCAL)
   ↓
7. Usuário clica "Salvar Vaga"
   ↓
8. AddVagaDialog.handleSaveVaga() executa
   ↓
9. Lê `resumePdfBase64` do estado do PAI → ❌ VAZIO/NULL
   ↓
10. `cvDataUrl = null`
    ↓
11. Vaga é salva com `arquivo_cv_url = null`
    ↓
12. Página de detalhes mostra "Nenhum currículo gerado ainda" ❌
```

**Evidências:**

1. **CurriculoTab não recebe setters do pai:**

   ```typescript
   // curriculo-tab.tsx:13-27
   interface CurriculoTabProps {
     resumePdfBase64: string | null // ✅ Recebe valor
     resumeFilename: string | null // ✅ Recebe valor
     // ❌ NÃO recebe setResumePdfBase64
     // ❌ NÃO recebe setResumeFilename
   }
   ```

2. **AddVagaDialog não passa setters:**

   ```typescript
   // add-vaga-dialog.tsx:332-346
   <CurriculoTab
     resumePdfBase64={resumePdfBase64}  // Passa valor
     resumeFilename={resumeFilename}    // Passa valor
     // ❌ NÃO passa setResumePdfBase64
     // ❌ NÃO passa setResumeFilename
   />
   ```

3. **CurriculoTab usa estados locais:**

   ```typescript
   // curriculo-tab.tsx:46-47
   const [pdfBase64Pt, setPdfBase64Pt] = useState<string | null>(null)
   const [pdfBase64En, setPdfBase64En] = useState<string | null>(null)
   ```

4. **handleSaveVaga lê estado vazio:**
   ```typescript
   // add-vaga-dialog.tsx:232
   const cvDataUrl = resumePdfBase64 ? `data:application/pdf;base64,${resumePdfBase64}` : null
   // resumePdfBase64 está null → cvDataUrl = null
   ```

### Causa Raiz

O novo fluxo de geração de currículo (preview → markdown → PDF) foi implementado com estados locais no `CurriculoTab`, mas não foi criado um mecanismo para propagar esses PDFs gerados de volta para os estados do dialog pai (`resumePdfBase64`, `resumeFilename`).

**Por que o código antigo funcionava:**

O fluxo antigo (comentado ou substituído) provavelmente atualizava diretamente os estados do pai através de callbacks ou props. O novo fluxo isolou a geração no tab, mas esqueceu de conectar os estados.

---

## Phase 2: Plano de Correção

### Solução Proposta

**Abordagem:** Propagar os PDFs gerados no `CurriculoTab` de volta para os estados do dialog pai.

**Estratégia:** Passar callbacks do `AddVagaDialog` para o `CurriculoTab` que atualizam os estados do pai quando PDFs são gerados.

### Alterações Necessárias

#### Batch A: Adicionar callbacks no AddVagaDialog

**Arquivo:** `components/add-vaga-dialog.tsx`

**Mudanças:**

1. Passar callbacks para atualizar os estados do pai:

```typescript
// Linha ~332-346 (onde CurriculoTab é usado)
<CurriculoTab
  resumeContent={resumeContent}
  setResumeContent={setResumeContent}
  resumePdfBase64={resumePdfBase64}
  resumeFilename={resumeFilename}
  // ✅ ADICIONAR: Callbacks para atualizar estados do pai
  onPdfGenerated={(pdfBase64: string, filename: string) => {
    setResumePdfBase64(pdfBase64)
    setResumeFilename(filename)
  }}
  jobAnalysisData={jobAnalysisData}
  generatingResume={generatingResume}
  savingVaga={loading}
  onGenerateResume={handleGenerateResume}
  onRefreshResume={handleRefreshResume}
  onDownloadPDF={handleDownloadPDF}
  onSaveVaga={handleSaveVaga}
  jobDescription={lastAnalyzedDescription || jobDescription}
  vagaId={undefined}
/>
```

**Motivo:** Permitir que o `CurriculoTab` notifique o pai quando PDFs são gerados.

**Linhas afetadas:** ~332-346

---

#### Batch B: Atualizar interface do CurriculoTab

**Arquivo:** `components/tabs/curriculo-tab.tsx`

**Mudanças:**

1. Adicionar callback na interface de props:

```typescript
// Linha 13-27
interface CurriculoTabProps {
  resumeContent: string
  setResumeContent: (value: string) => void
  resumePdfBase64: string | null
  resumeFilename: string | null
  // ✅ ADICIONAR: Callback para notificar o pai
  onPdfGenerated?: (pdfBase64: string, filename: string) => void
  jobAnalysisData: JobDetails | null
  generatingResume: boolean
  savingVaga: boolean
  onGenerateResume: () => Promise<void>
  onRefreshResume: () => Promise<void>
  onDownloadPDF: () => void
  onSaveVaga: () => Promise<void>
  jobDescription: string
  vagaId?: string
}
```

2. Desestruturar o callback:

```typescript
// Linha 29-38
export function CurriculoTab({
  resumePdfBase64,
  resumeFilename,
  jobAnalysisData,
  savingVaga,
  onDownloadPDF,
  onSaveVaga,
  jobDescription,
  vagaId,
  // ✅ ADICIONAR
  onPdfGenerated,
}: CurriculoTabProps) {
```

**Motivo:** Permitir que o componente receba e use o callback do pai.

**Linhas afetadas:** ~13-27, ~29-38

---

#### Batch C: Chamar callback após gerar PDF

**Arquivo:** `components/tabs/curriculo-tab.tsx`

**Mudanças:**

1. Notificar o pai após gerar PDF PT:

```typescript
// Linha ~207 (dentro de handleConvertToPdf, após gerar PDF PT)
if (result.success && result.data?.pdfBase64) {
  setPdfBase64Pt(result.data.pdfBase64)
  console.log("[CurriculoTab] PT PDF generated from Markdown")

  // ✅ ADICIONAR: Notificar o pai
  if (onPdfGenerated) {
    const filename = `cv-igor-fernandes-${jobAnalysisData?.empresa || "vaga"}-pt.pdf`
    onPdfGenerated(result.data.pdfBase64, filename)
  }
}
```

2. Notificar o pai após gerar PDF EN:

```typescript
// Linha ~242 (dentro de handleConvertToPdf, após gerar PDF EN)
if (result.success && result.data?.pdfBase64) {
  setPdfBase64En(result.data.pdfBase64)
  console.log("[CurriculoTab] EN PDF generated from Markdown")

  // ✅ ADICIONAR: Notificar o pai
  if (onPdfGenerated) {
    const filename = `cv-igor-fernandes-${jobAnalysisData?.empresa || "vaga"}-en.pdf`
    onPdfGenerated(result.data.pdfBase64, filename)
  }
}
```

**Motivo:** Propagar os PDFs gerados de volta para os estados do dialog pai.

**Observação:** Se `resumeLanguage === "both"`, o último PDF gerado (EN) será salvo. Se quiser salvar ambos, precisaria de lógica adicional (por exemplo, criar um ZIP ou salvar múltiplos campos).

**Decisão:** Por ora, salvar o último PDF gerado (compatível com a estrutura atual que só tem um campo `arquivo_cv_url`).

**Linhas afetadas:** ~207, ~242

---

### Fluxo Corrigido

```
1. Usuário gera preview no CurriculoTab
   ↓
2. CurriculoTab.handleGeneratePreview() executa
   ↓
3. Markdown é armazenado em `markdownPreviewPt` (estado LOCAL)
   ↓
4. Usuário clica "Gerar PDF"
   ↓
5. CurriculoTab.handleConvertToPdf() executa
   ↓
6. PDF base64 é armazenado em `pdfBase64Pt` (estado LOCAL)
   ↓
7. ✅ NOVO: onPdfGenerated(pdfBase64, filename) é chamado
   ↓
8. ✅ NOVO: AddVagaDialog.setResumePdfBase64(pdfBase64) atualiza estado do PAI
   ↓
9. Usuário clica "Salvar Vaga"
   ↓
10. AddVagaDialog.handleSaveVaga() executa
    ↓
11. Lê `resumePdfBase64` do estado do PAI → ✅ PREENCHIDO
    ↓
12. `cvDataUrl = "data:application/pdf;base64,{base64}"`
    ↓
13. Vaga é salva com `arquivo_cv_url = cvDataUrl`
    ↓
14. Página de detalhes mostra o currículo ✅
```

---

### Testes Necessários

#### Teste Manual

1. **Setup:**

   ```bash
   pnpm dev
   ```

2. **Fluxo completo:**
   - Abrir dialog "Adicionar Estágio"
   - Preencher descrição da vaga
   - Clicar "Realizar Análise"
   - Ir para aba "Dados da Vaga" (confirmar preenchimento)
   - Ir para aba "Currículo"
   - Clicar "Gerar Preview"
   - Revisar markdown gerado
   - Clicar "Gerar PDF"
   - Confirmar que PDF aparece na seção "PDFs Gerados"
   - Clicar "Salvar Vaga"
   - Acessar página de detalhes da vaga (clicar na linha da tabela)
   - **VERIFICAR:** Seção "Currículo Personalizado" mostra currículo salvo (não mostra "Nenhum currículo gerado ainda")
   - **VERIFICAR:** Botão "Baixar PDF" funciona e baixa o arquivo

3. **Verificação no banco:**
   ```sql
   SELECT id, empresa, cargo, arquivo_cv_url FROM vagas_estagio
   ORDER BY created_at DESC LIMIT 5;
   ```

   - Campo `arquivo_cv_url` deve começar com `"data:application/pdf;base64,"`
   - Não deve ser `NULL`

#### Teste de Regressão

Verificar que o fluxo antigo (se ainda existir) não foi quebrado:

- Se houver outro caminho para gerar currículo, testar também

---

### Considerações Adicionais

#### Múltiplos PDFs (PT e EN)

**Problema:** Atualmente só salvamos um PDF (`arquivo_cv_url`), mas o usuário pode gerar PT e EN.

**Opções:**

**A. Salvar apenas o último gerado** (implementação atual)

- Simples
- Compatível com schema atual
- **Limitação:** Se gerar ambos, apenas o último (EN) é salvo

**B. Salvar ambos em campos separados**

- Requer migration: adicionar `arquivo_cv_url_pt` e `arquivo_cv_url_en`
- Mais complexo
- Permite preservar ambos os PDFs

**C. Salvar um ZIP com ambos**

- Requer lógica adicional para criar ZIP client-side
- Complexo
- Bom para preservar múltiplas versões

**Recomendação:** Começar com **Opção A** (salvar último gerado). Se necessário, evoluir para Opção B em outra tarefa.

#### Limpeza de Estados

Atualizar `resetForm()` no `AddVagaDialog` para limpar os novos estados:

```typescript
// add-vaga-dialog.tsx:273-294
function resetForm() {
  // ... código existente
  setResumePdfBase64(null) // ✅ Já existe
  setResumeFilename(null) // ✅ Já existe
  // Estados locais do CurriculoTab são resetados automaticamente ao fechar
}
```

**Verificação:** `resetForm()` já limpa `resumePdfBase64` e `resumeFilename` (linhas 291-292). Nenhuma mudança necessária.

---

### Resumo das Mudanças

| Batch | Arquivo               | Mudança                                                                   | Linhas         |
| ----- | --------------------- | ------------------------------------------------------------------------- | -------------- |
| A     | `add-vaga-dialog.tsx` | Adicionar callback `onPdfGenerated` ao passar props para `<CurriculoTab>` | ~332-346       |
| B     | `curriculo-tab.tsx`   | Adicionar `onPdfGenerated?` na interface e desestruturar                  | ~13-27, ~29-38 |
| C     | `curriculo-tab.tsx`   | Chamar `onPdfGenerated()` após gerar PDFs PT e EN                         | ~207, ~242     |

**Total de arquivos modificados:** 2
**Total de linhas modificadas:** ~15-20 linhas

---

## ✅ Critérios de Pronto

- [x] Callback `onPdfGenerated` adicionado no `AddVagaDialog` (Batch A)
- [x] Interface `CurriculoTabProps` atualizada com `onPdfGenerated` (Batch B)
- [x] `CurriculoTab` chama `onPdfGenerated` após gerar PDFs (Batch C)
- [x] Estados do pai (`resumePdfBase64`, `resumeFilename`) são atualizados quando PDF é gerado
- [x] Migration criada para campos `arquivo_cv_url_pt` e `arquivo_cv_url_en` (Batch D)
- [x] Tipos TypeScript atualizados (`VagaEstagio`)
- [x] `handleSaveVaga` salva AMBOS os currículos nos campos corretos (Batch E)
- [x] Página de detalhes exibe ambos os currículos salvos (Batch G)
- [x] Botões "Baixar PDF (PT)" e "Baixar PDF (EN)" na página de detalhes
- [ ] Migration executada no banco de dados
- [ ] Teste manual completo executado e aprovado
- [ ] Verificação no banco confirma que campos estão preenchidos

---

## 📦 Phase 3 & 4: Implementação Concluída

### Resumo das Mudanças

**Phase 3: Correção Básica (3 batches)**

- ✅ Callback `onPdfGenerated` conecta estados do `CurriculoTab` ao `AddVagaDialog`
- ✅ PDFs gerados agora propagam para o componente pai
- ✅ `handleSaveVaga` recebe os PDFs corretamente

**Phase 4: Suporte a Múltiplos PDFs (4 batches)**

- ✅ Migration `003_add_separate_cv_fields.sql` criada
- ✅ Novos campos: `arquivo_cv_url_pt`, `arquivo_cv_url_en`
- ✅ Campo legacy `arquivo_cv_url` mantido para compatibilidade
- ✅ `AddVagaDialog` detecta idioma e salva em campos separados
- ✅ Página de detalhes exibe ambos os PDFs quando disponíveis

### Arquivos Modificados

| Arquivo                                     | Mudanças                                                                                                                                            | Linhas         |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `components/add-vaga-dialog.tsx`            | + Callback `onPdfGenerated`<br>+ Estados `resumePdfBase64Pt/En`<br>+ Detecção de idioma<br>+ Salvamento em campos separados<br>+ Limpeza de estados | ~30            |
| `components/tabs/curriculo-tab.tsx`         | + Interface `onPdfGenerated`<br>+ Chamadas de callback após gerar PDFs                                                                              | ~15            |
| `migrations/003_add_separate_cv_fields.sql` | + Novos campos no banco                                                                                                                             | 1 arquivo novo |
| `lib/types.ts`                              | + Campos `arquivo_cv_url_pt/en`                                                                                                                     | ~3             |
| `app/vaga/[id]/page.tsx`                    | + Detecção de múltiplos PDFs<br>+ Botões separados PT/EN<br>+ Exibição de ambos os arquivos                                                         | ~25            |

**Total:** 5 arquivos modificados, 1 arquivo novo, ~73 linhas de código

---

## 🧪 Próximos Passos: Testes

### 1. Executar Migration

```bash
# Conectar ao Supabase
psql postgresql://[connection-string]

# Executar migration
\i migrations/003_add_separate_cv_fields.sql

# Verificar colunas criadas
\d vagas_estagio
```

**Esperado:**

- Colunas `arquivo_cv_url_pt` e `arquivo_cv_url_en` criadas
- Tipo: `TEXT`
- Nullable: `YES`

### 2. Teste Manual Completo

**Cenário 1: Gerar PDF único (PT)**

1. Adicionar vaga → Analisar → Ir para aba "Currículo"
2. Selecionar "Português"
3. Clicar "Gerar Preview"
4. Revisar markdown
5. Clicar "Gerar PDF"
6. Verificar PDF aparece na lista
7. Clicar "Salvar Vaga"
8. Acessar página de detalhes
9. **Verificar:** Botão "Baixar PDF (PT)" aparece
10. **Verificar:** Clicar e baixar funciona

**Cenário 2: Gerar ambos (PT e EN)**

1. Adicionar vaga → Analisar → Ir para aba "Currículo"
2. Selecionar "Ambos"
3. Clicar "Gerar Preview"
4. Revisar ambos os markdowns
5. Clicar "Gerar PDF"
6. Verificar ambos PDFs aparecem na lista
7. Clicar "Salvar Vaga"
8. Acessar página de detalhes
9. **Verificar:** Ambos botões "Baixar PDF (PT)" e "Baixar PDF (EN)" aparecem
10. **Verificar:** Ambos downloads funcionam

**Cenário 3: Compatibilidade com vagas antigas**

1. Acessar vaga criada ANTES da migration (sem `arquivo_cv_url_pt/en`)
2. **Verificar:** Se houver `arquivo_cv_url`, botão "Baixar PDF" aparece normalmente
3. **Verificar:** Não mostra "Nenhum currículo gerado"

### 3. Verificação no Banco

```sql
-- Verificar última vaga criada
SELECT
  id,
  empresa,
  cargo,
  arquivo_cv_url IS NOT NULL as has_legacy,
  arquivo_cv_url_pt IS NOT NULL as has_pt,
  arquivo_cv_url_en IS NOT NULL as has_en,
  LENGTH(arquivo_cv_url_pt) as pt_size,
  LENGTH(arquivo_cv_url_en) as en_size
FROM vagas_estagio
ORDER BY created_at DESC
LIMIT 5;
```

**Esperado (após Cenário 1):**

- `has_legacy`: `true` (fallback)
- `has_pt`: `true`
- `has_en`: `false`
- `pt_size`: > 10000 (base64 string grande)

**Esperado (após Cenário 2):**

- `has_legacy`: `true` (último gerado = EN)
- `has_pt`: `true`
- `has_en`: `true`
- `pt_size`: > 10000
- `en_size`: > 10000

### 4. Testes de Regressão

- [ ] Adicionar vaga sem gerar currículo → Salvar → Não gera erro
- [ ] Editar vaga existente → Não perde currículos salvos
- [ ] Gerar currículo na página de detalhes → Funciona normalmente

---

## 🎉 Resultado Esperado

### Antes (QUEBRADO)

```
Gerar Preview → Gerar PDF → Salvar Vaga
→ arquivo_cv_url = NULL
→ Página de detalhes: "Nenhum currículo gerado ainda" ❌
```

### Depois (CORRIGIDO)

```
Gerar Preview (PT) → Gerar PDF → Salvar Vaga
→ arquivo_cv_url_pt = "data:application/pdf;base64,..." ✅
→ arquivo_cv_url = "data:application/pdf;base64,..." (fallback) ✅
→ Página de detalhes: Botão "Baixar PDF (PT)" ✅

Gerar Preview (PT e EN) → Gerar PDF → Salvar Vaga
→ arquivo_cv_url_pt = "data:application/pdf;base64,..." ✅
→ arquivo_cv_url_en = "data:application/pdf;base64,..." ✅
→ Página de detalhes: Botões "Baixar PDF (PT)" e "Baixar PDF (EN)" ✅
```
