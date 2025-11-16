# Workflow de Desenvolvimento - Dashboard Estágios

## 🎯 Visão Geral da Integração

Este projeto usa dois sistemas poderosos:

- **Superpowers** (6 skills): TDD, Systematic Debugging, Planning, Brainstorming
- **Playwright Skill** (1 skill): Browser automation e visual testing

Esta integração cria um workflow profissional que combina o melhor de ambos.

---

## 📋 Mapa de Uso: Quando Usar Cada Plugin

### **🔧 Use SUPERPOWERS para:**

| Cenário                      | Comando                         | Skill Ativada                  |
| ---------------------------- | ------------------------------- | ------------------------------ |
| Planejar feature complexa    | `/superpowers:brainstorm`       | brainstorming                  |
| Criar plano de implementação | `/superpowers:write-plan`       | writing-plans                  |
| Executar plano em lotes      | `/superpowers:execute-plan`     | executing-plans                |
| Desenvolver com TDD          | (automático ao codificar)       | test-driven-development        |
| Debugar bug sistemicamente   | (automático ao debugar)         | systematic-debugging           |
| Verificar antes de completar | (automático antes de finalizar) | verification-before-completion |

### **🎭 Use PLAYWRIGHT SKILL para:**

| Cenário                     | Comando Exemplo                                       |
| --------------------------- | ----------------------------------------------------- |
| Validar feature visualmente | "Teste o fluxo de expansão de vagas visualmente"      |
| Debugar teste E2E falhando  | "Execute o teste de upload e mostre onde quebra"      |
| Criar teste ad-hoc          | "Verifique se dark mode funciona em todas as páginas" |
| Explorar comportamento      | "Navegue pelo app e teste duplo clique nas vagas"     |
| Gerar screenshots           | "Tire screenshots do dashboard em mobile e desktop"   |

---

## 🔄 Workflow Integrado Completo

### **Ciclo de Desenvolvimento de Feature**

```
Nova Feature
    ↓
/superpowers:brainstorm (refinar requisitos)
    ↓
/superpowers:write-plan (criar plano detalhado)
    ↓
/superpowers:execute-plan (executar em lotes)
    ↓
Playwright: Testar Visualmente
    ↓
Bugs? → Sim → Superpowers: Debug Sistemático → Re-testar
    ↓
    Não
    ↓
Criar Teste Persistente
    ↓
Commit & Deploy
```

---

## 📝 Exemplos Práticos do Projeto

### **Exemplo 1: Implementar Expansão de Vagas**

#### **Fase 1: Planejamento (Superpowers)**

```
/superpowers:brainstorm

Contexto: Preciso implementar expansão de vagas com clique simples e duplo clique para navegação.

Requisitos:
- Clique simples expande/recolhe vaga
- Exibe cards de Fit e Status quando expandido
- Duplo clique navega para página de detalhes
- Animação suave
- Não quebrar testes E2E existentes
```

**Claude vai:**

- Fazer perguntas socráticas
- Refinar requisitos
- Identificar edge cases
- Sugerir abordagem técnica

---

#### **Fase 2: Criar Plano (Superpowers)**

```
/superpowers:write-plan

Implemente expansão de vagas conforme brainstorm anterior.
```

**Claude vai:**

- Criar plano detalhado step-by-step
- Dividir em lotes executáveis
- Identificar riscos
- Definir ordem de execução

---

#### **Fase 3: Executar (Superpowers)**

```
/superpowers:execute-plan
```

**Claude vai:**

- Executar lote por lote
- Rodar testes após cada mudança
- Parar se algo quebrar
- Fazer commits incrementais

---

#### **Fase 4: Validar Visualmente (Playwright Skill)**

```
Teste a expansão de vagas:

1. Navegue para http://localhost:3000
2. Clique na primeira vaga (deve expandir)
3. Verifique que cards de Fit e Status aparecem
4. Clique novamente (deve recolher)
5. Duplo clique em outra vaga
6. Verifique navegação para /vaga/[id]
7. Tire screenshots de cada estado

Execute com browser visível.
```

**Playwright Skill vai:**

- Escrever código Playwright customizado
- Executar com browser aberto (você vê acontecendo)
- Tirar screenshots
- Retornar console output
- Reportar sucesso/falha

---

#### **Fase 5: Corrigir Bugs (Superpowers)**

Se Playwright encontrou bugs:

```
Corrija o erro encontrado: [descrever erro]

Siga systematic debugging:
1. Reproduzir
2. Isolar causa raiz
3. Criar teste que falha
4. Corrigir
5. Verificar que passou
```

**Superpowers vai:**

- Aplicar debugging sistemático
- Usar TDD
- Verificar antes de completar
- Garantir nenhuma regressão

---

#### **Fase 6: Re-validar (Playwright Skill)**

```
Re-execute o teste de expansão após correção.
```

---

#### **Fase 7: Criar Teste Persistente**

```
Opção A (Manual com Superpowers):
"Adicione teste E2E para expansão em e2e/vagas.spec.ts"

Opção B (Gerar com Playwright):
"Gere código de teste Playwright para expansão"
→ Copiar código gerado para e2e/vagas.spec.ts
```

---

### **Exemplo 2: Corrigir Bug Crítico (TypeError)**

#### **Fase 1: Debug (Superpowers - Automático)**

```
Corrija TypeError: e.toFixed is not a function que ocorre ao duplo clicar em vaga.
```

**Systematic Debugging skill ativa automaticamente:**

- Reproduz erro
- Busca causa raiz
- Identifica locais com .toFixed()
- Aplica correção defensiva

---

#### **Fase 2: Validar Correção (Playwright Skill)**

```
Teste duplo clique em todas as vagas e verifique que nenhuma causa TypeError.

1. Navegue para http://localhost:3000
2. Para cada vaga na lista:
   - Duplo clique
   - Verifique que página carrega
   - Verifique console sem erro
   - Voltar para lista
3. Reporte resultados
```

**Playwright vai:**

- Iterar por todas as vagas
- Detectar TypeError no console
- Reportar exatamente qual vaga quebrou (se alguma)

---

### **Exemplo 3: Nova Feature de Dark Mode**

#### **Fase 1-3: Planejar + Implementar (Superpowers)**

```
/superpowers:brainstorm

Implementar dark mode toggle em configurações.

/superpowers:write-plan
/superpowers:execute-plan
```

---

#### **Fase 4: Testar Visualmente (Playwright Skill)**

```
Teste dark mode:

1. Navegue para http://localhost:3000/configuracoes
2. Toggle para dark mode
3. Verifique que cores inverteram
4. Navegue para as outras tabs (Resumo, Estágios)
5. Verifique consistência visual
6. Toggle de volta para light
7. Screenshots de todas as páginas em ambos os modos
```

---

## 🎓 Comandos Rápidos de Referência

### **Superpowers Slash Commands**

```bash
/superpowers:brainstorm     # Refinar design com perguntas socráticas
/superpowers:write-plan     # Criar plano de implementação detalhado
/superpowers:execute-plan   # Executar plano em batches com checkpoints
```

### **Superpowers Auto-Activated Skills**

- `test-driven-development` → Ao implementar features
- `systematic-debugging` → Ao debugar bugs
- `verification-before-completion` → Antes de marcar como completo

### **Playwright Skill (Natural Language)**

```bash
# Não há slash commands - apenas descreva o que quer:
"Teste [fluxo] visualmente"
"Verifique se [comportamento] funciona"
"Debug por que [elemento] não aparece"
"Tire screenshots de [páginas] em [viewports]"
```

---

## 📊 Decision Tree: Qual Plugin Usar?

```
┌─ Preciso fazer algo ─┐
│                      │
├─ Desenvolver código? ─→ Superpowers
│  ├─ Feature nova?    ─→ /superpowers:brainstorm → write-plan → execute-plan
│  ├─ Bug?             ─→ Descrever bug (systematic-debugging ativa auto)
│  └─ Refatorar?       ─→ Descrever mudança (TDD ativa auto)
│
├─ Testar visualmente? ─→ Playwright Skill
│  ├─ Validar feature? ─→ "Teste [feature] visualmente"
│  ├─ Debug E2E?       ─→ "Execute [teste] e mostre onde quebra"
│  └─ Screenshots?     ─→ "Tire screenshots de [páginas]"
│
└─ Planejar complexo?  ─→ Superpowers
   └─ Brainstorm       ─→ /superpowers:brainstorm
```

---

## 💡 Dicas de Produtividade

### **Atalhos Mentais:**

- 🔧 **Código/Bug/Refactor** → Superpowers
- 🎭 **Testar/Validar/Screenshots** → Playwright

### **Boas Práticas:**

- ✅ Sempre use `/superpowers:brainstorm` para features complexas
- ✅ Use Playwright após cada implementação para validar
- ✅ Corrija bugs com Superpowers (systematic debugging)
- ✅ Re-valide com Playwright após correção
- ✅ Crie testes persistentes após validação

### **Evite:**

- ❌ Pular brainstorming em features complexas
- ❌ Implementar sem plano
- ❌ Não validar visualmente
- ❌ Pular verification before completion

---

## 🚀 Exemplos Específicos do Dashboard Estágios

### **Upload de Arquivo Markdown**

```
# Superpowers: Implementação
/superpowers:brainstorm
→ Requisitos de upload, parsing, validação

/superpowers:write-plan
→ Plano detalhado com markdown-parser.ts

/superpowers:execute-plan
→ Implementar com TDD

# Playwright: Validação
"Teste upload de arquivo .md:
1. Navegue para dashboard
2. Clique em 'Adicionar Vaga'
3. Faça upload de teste.md
4. Verifique que campos foram preenchidos automaticamente
5. Tire screenshot do formulário preenchido"
```

### **Filtros da Tabela de Vagas**

```
# Superpowers: Implementação
"Adicione filtro de etapa na tabela de vagas"
→ TDD automático

# Playwright: Validação
"Teste filtros da tabela:
1. Navegue para dashboard
2. Selecione filtro 'Etapa: Entrevista'
3. Verifique que apenas vagas com etapa Entrevista aparecem
4. Clique em 'Limpar filtros'
5. Verifique que todas as vagas voltaram"
```

### **Edição de Vaga**

```
# Superpowers: Implementação
"Atualize EditVagaDialog para suportar upload de CV"
→ Systematic debugging se houver problemas

# Playwright: Validação
"Teste edição de vaga:
1. Clique em 'Editar' em uma vaga
2. Altere campo 'Fit' para 8
3. Faça upload de novo CV
4. Salve
5. Verifique que mudanças persistiram
6. Recarregue página e confirme"
```

---

## ✅ Checklist de Setup

### Setup Inicial:

- [x] Superpowers instalado (6 skills)
- [x] Playwright Skill instalado (1 skill)
- [ ] Testar Superpowers: `/superpowers:brainstorm`
- [ ] Testar Playwright: "Teste se homepage carrega"

### Documentação:

- [x] Criar `.claude/WORKFLOW.md` com este guia
- [ ] Atualizar `.claude/CLAUDE.md` com referência ao workflow
- [ ] Adicionar exemplos específicos conforme necessário

### Primeiros Usos:

- [ ] Use Superpowers para próxima feature
- [ ] Use Playwright para validar feature
- [ ] Iterar conforme workflow acima

---

## 🔗 Arquivos Relacionados

- **CLAUDE.md** - Instruções principais do projeto
- **SETUP.md** - Configuração do Supabase
- **lib/markdown-parser.ts** - Parser de markdown (11 testes)
- **lib/date-utils.ts** - Utilitários de data
- **components/vagas-table.tsx** - Tabela principal de vagas
- **vitest.config.ts** - Configuração de testes

---

## 📞 Comandos Úteis do Projeto

```bash
# Desenvolvimento
pnpm dev              # Servidor local (http://localhost:3000)

# Testes
pnpm test             # Vitest (unit tests)
pnpm test:coverage    # Cobertura de testes
pnpm lint             # ESLint
pnpm lint:fix         # Fix automático

# Build
pnpm build            # Build de produção
```

---

## 🎯 Próximos Passos Recomendados

1. **Testar integração** (rode exemplos acima)
2. **Criar primeiro teste visual** com Playwright
3. **Implementar próxima feature** com workflow completo
4. **Documentar learnings** específicos do projeto aqui

---

**Última atualização:** 2025-11-15
**Mantido por:** @igor
