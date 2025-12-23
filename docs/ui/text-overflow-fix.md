# Fix: Texto transbordando no card de resumo (página de estágios)

**Data:** 2025-12-07
**Componente afetado:** `components/vaga-table-row.tsx`
**Linha modificada:** 109
**Root cause:** Grid item não respeita largura disponível devido a `min-width: auto` padrão

---

## 🔍 Problema Identificado

### Sintoma

Texto do resumo da vaga (campo `observacoes`) transbordava horizontalmente para fora do card na página de listagem de estágios, criando scroll horizontal indesejado.

### Contexto

- **Onde:** Página de listagem de estágios (`/`)
- **Quando:** Ao expandir card de vaga (linha expansível da tabela)
- **O que:** Texto longo (URLs, palavras sem espaços) estoura para a direita
- **Contraste:** Na página individual da vaga (`/vaga/[id]`), o mesmo texto **está contido corretamente**

---

## 🧪 Root Cause Analysis

### Estrutura Problemática (ANTES)

```tsx
<TableRow>
  <TableCell colSpan={5} className="bg-muted/20 p-6">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ❌ Card sem min-w-0 → não encolhe abaixo do conteúdo */}
      <Card className="glass-card lg:col-span-2">
        <CardContent>
          <div className="w-full overflow-hidden">
            <MarkdownPreview
              content={vaga.observacoes}
              editable={false}
              className="max-h-[400px] !max-w-full break-words"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  </TableCell>
</TableRow>
```

### Root Cause

**CSS Grid + Table Cell + min-width: auto**

1. **Elementos de Grid/Flexbox** têm `min-width: auto` por padrão
2. Isso significa que **nunca encolhem abaixo do tamanho do conteúdo**
3. Quando há **texto longo sem quebras** (URLs, palavras compostas), o Card expande além do espaço disponível
4. **TableCell** (`<td>`) tem comportamento especial de largura e não força overflow como `display: block`
5. Resultado: Grid calcula largura com base no **conteúdo**, não no **espaço disponível**

### Por que o MarkdownPreview NÃO era o problema

O componente `MarkdownPreview` **já tinha todos os estilos corretos**:

- ✅ `break-words` (word-wrap: break-word)
- ✅ `overflow-wrap-anywhere` (mais agressivo)
- ✅ `overflow-x-hidden` (esconde overflow horizontal)

**Mas** o **container pai** (Card) estava impedindo esses estilos de funcionarem porque:

- Card expandia além da largura disponível
- MarkdownPreview tentava quebrar, mas o Card não deixava

---

## ✅ Solução Implementada

### Fix Aplicado

**Arquivo:** `components/vaga-table-row.tsx`
**Linha:** 109

```diff
- <Card className="glass-card lg:col-span-2">
+ <Card className="glass-card lg:col-span-2 min-w-0">
```

### O que `min-w-0` faz

```css
.min-w-0 {
  min-width: 0;
}
```

**Efeito:**

- Permite que o Card **encolha abaixo do tamanho do seu conteúdo**
- Força o Grid a **respeitar a largura disponível** (2/3 das 3 colunas)
- O MarkdownPreview interno agora consegue **quebrar linhas corretamente**

### Estrutura Corrigida (DEPOIS)

```tsx
<TableRow>
  <TableCell colSpan={5} className="bg-muted/20 p-6">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ✅ Card com min-w-0 → encolhe até largura do grid */}
      <Card className="glass-card lg:col-span-2 min-w-0">
        <CardContent>
          <div className="w-full overflow-hidden">
            <MarkdownPreview
              content={vaga.observacoes}
              editable={false}
              className="max-h-[400px] !max-w-full break-words"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  </TableCell>
</TableRow>
```

---

## 📊 Comparação: Listagem vs. Página Individual

| Aspecto         | Página Individual (✅) | Listagem (❌→✅)                |
| --------------- | ---------------------- | ------------------------------- |
| Container pai   | Card normal            | TableCell + Grid                |
| Layout          | Sem grid               | Grid 3 colunas                  |
| Largura do card | Largura natural        | `lg:col-span-2` (2/3 do grid)   |
| min-width       | Não afeta              | **Crítico** - precisa `min-w-0` |
| Funciona?       | ✅ Sempre              | ✅ Após fix                     |

---

## 🧪 Testes de Verificação

### Manual (Desktop)

1. `pnpm dev`
2. Abrir `http://localhost:3000`
3. Expandir card de vaga (clicar na empresa)
4. **Verificar:** Texto do resumo não transborda
5. **Verificar:** Quebra de linha automática funciona
6. **Verificar:** Sem scroll horizontal

### Manual (Responsivo)

| Viewport | Largura | Grid Behavior      | Esperado                        |
| -------- | ------- | ------------------ | ------------------------------- |
| Mobile   | 375px   | 1 coluna (stacked) | Card 100% largura, texto quebra |
| Tablet   | 768px   | 3 colunas          | Card 2/3 largura, texto quebra  |
| Desktop  | 1920px  | 3 colunas          | Card 2/3 largura, texto quebra  |

### Lint/Build

```bash
pnpm lint    # ✅ Passou sem erros
pnpm build   # (não executado ainda)
```

---

## 📚 Referências Técnicas

### CSS Grid + min-width

Quando usar `min-w-0` em Grid/Flexbox:

- ✅ Item de grid tem conteúdo que pode transbordar (texto, imagens)
- ✅ Precisa que `overflow-hidden` ou `word-break` funcionem
- ✅ Grid/Flex está dentro de outro container com largura fixa (tabela, sidebar)

### Tailwind Classes para Text Overflow

```css
/* Solução aplicada */
.min-w-0           /* min-width: 0 (permite encolher) */
.break-words       /* word-wrap: break-word */
.overflow-hidden   /* overflow: hidden */

/* Outras úteis */
.overflow-wrap-anywhere  /* Mais agressivo que break-word */
.truncate          /* text-overflow: ellipsis (1 linha) */
.line-clamp-3      /* Truncar com 3 linhas */
```

### Quando NÃO funcionar

Se `min-w-0` não resolver:

1. **Verificar TableCell:** Pode precisar `max-width: 100%`
2. **Verificar container pai:** Pode ter `width: max-content`
3. **Verificar elementos inline:** `<a>`, `<code>` podem ignorar quebras
4. **Solução alternativa:** `word-break: break-all` (quebra no meio da palavra)

---

## 📝 Lições Aprendidas

1. **Componentes de UI podem estar corretos** - O problema estava nos containers pai
2. **Grid/Flexbox + overflow** - Sempre considerar `min-width: 0` em items de grid/flex
3. **TableCell comportamento especial** - Tabelas HTML têm regras de largura próprias
4. **Teste em múltiplos contextos** - Mesmo componente funciona diferente em estruturas diferentes

---

## ✅ Status

- ✅ Root cause identificado
- ✅ Fix aplicado (`min-w-0`)
- ✅ Lint passou
- ⏳ Teste manual pendente (requer servidor dev)
- ⏳ Build verification pendente

**Próximos passos:**

1. Testar visualmente em `pnpm dev`
2. Confirmar em diferentes tamanhos de tela
3. Verificar que não quebrou nada na página individual
4. Considerar aplicar mesmo fix em outros cards se necessário
