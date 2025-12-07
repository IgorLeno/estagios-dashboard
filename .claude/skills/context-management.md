
---
name: context-management
description: Monitora uso de contexto em tarefas longas e propõe limpeza estratégica com checkpoints, preservando progresso em tarefas multi-etapa
---

# 🧠 SKILL: GERENCIAMENTO INTELIGENTE DE CONTEXTO

## 📍 CONTEXTO

Claude Code, você deve monitorar o uso de contexto durante a execução de tarefas longas e propor limpeza estratégica quando o contexto estiver baixo, **SEM PERDER O PROGRESSO**.

Esta skill deve ser aplicada em **qualquer tarefa dividida em múltiplos passos/batches**.

---

## 🎯 QUANDO ATIVAR ESTA SKILL

Ative automaticamente ao **final de cada passo/batch** em tarefas que:

1. Estão divididas em múltiplas etapas (ex.: Batch 1, Batch 2, etc.)
2. Envolvem múltiplas chamadas de ferramentas (comandos bash, leitura de arquivos, testes)
3. Geram muito output (logs de testes, diffs extensos, análises longas)

**NÃO ative** no meio de uma etapa em andamento.

---

## 📊 CRITÉRIO DE AVALIAÇÃO DE CONTEXTO

Ao final de cada passo/batch, analise:

1. **Tokens consumidos até agora** (estimativa baseada em output acumulado)
2. **Tokens restantes** em relação ao total disponível (200,000 tokens)
3. **Passos restantes** no plano
4. **Complexidade esperada** dos próximos passos

**Regra de decisão atualizada:**

```
🟢 SE (contexto_restante > 50% do total):
    → CONTINUAR sem interrupção

🟡 SE (contexto_restante entre 40-50% do total) E (passos_restantes > 1):
    → AVALIAR se checkpoint é prudente
    → Considerar complexidade dos próximos passos
    → Se próximos passos são pesados (testes E2E, diffs grandes): SUGERIR checkpoint

🔴 SE (contexto_restante < 40% do total):
    → CHECKPOINT OBRIGATÓRIO
```

**Indicadores de contexto baixo:**
- Muitas leituras de arquivos grandes já realizadas
- Múltiplos outputs de testes (especialmente E2E com logs extensos)
- Diffs grandes de código já mostrados
- Histórico longo de comandos bash
- Contexto restante abaixo de 100k tokens (50% de 200k)

**Fórmula de referência:**
- Total disponível: 200,000 tokens
- 50% = 100,000 tokens restantes
- 40% = 80,000 tokens restantes

---

## 🔄 FLUXO DE GERENCIAMENTO DE CONTEXTO

### Passo 1: Detectar necessidade de limpeza

Ao **final de um batch/etapa concluída**, antes de iniciar o próximo:

```
⚠️ ANÁLISE DE CONTEXTO

Situação atual:
- Etapa concluída: [nome da etapa]
- Próximas etapas: [listar]
- Tokens consumidos: [X] / 200,000 ([Y]%)
- Tokens restantes: [Z] ([W]%)

[SE zona amarela ou vermelha]:
💡 RECOMENDAÇÃO: Limpar contexto agora para garantir espaço para as próximas etapas.

Você deseja:
1. ✅ Continuar com contexto atual (não recomendado se < 50%)
2. 🔄 Limpar contexto e gerar checkpoint (recomendado se ≤ 50%)

Responda: 1 ou 2
```

### Passo 2: Se usuário escolher "2" (limpar contexto)

Execute **antes de limpar**:

#### 2.1. Gerar arquivo de checkpoint

```
cat > docs/sessions/checkpoint-$(date +%Y%m%d-%H%M%S).md << 'EOF'
# Checkpoint de Contexto - [Nome da Tarefa]

**Data:** $(date +"%Y-%m-%d %H:%M:%S")
**Etapa concluída:** [nome]
**Próximas etapas:** [listar]
**Tokens restantes no momento do checkpoint:** [X] / 200,000 ([Y]%)

***

## 📊 STATUS ATUAL

### ✅ O que foi feito até agora

[Resumo bullet point de cada etapa concluída]

**Arquivos modificados:**
- `arquivo1.ts` - [descrição breve da mudança]
- `arquivo2.tsx` - [descrição breve da mudança]

**Comandos executados com sucesso:**
```bash
pnpm test -- [específico]
pnpm test:e2e [específico]
```

**Resultados dos testes:**
- Unit: X/Y passando
- E2E: X/Y passando

***

## 🎯 PRÓXIMOS PASSOS (Continuação)

### Etapa [N+1]: [Nome]

**Objetivo:**
[Descrição clara do que precisa ser feito]

**Arquivos a modificar:**
- `arquivo3.ts`
- `arquivo4.tsx`

**Comandos a executar:**
```bash
[comandos específicos]
```

**Critério de sucesso:**
[Como validar que esta etapa está completa]

***

## 🔍 CONTEXTO TÉCNICO IMPORTANTE

**Dependências chave:**
- [Listar bibliotecas/APIs relevantes]

**Convenções do projeto:**
- [Padrões de código, estrutura de pastas, etc.]

**Armadilhas conhecidas:**
- [Problemas já encontrados e como foram resolvidos]

***

## 📋 CHECKLIST DE RETOMADA

Ao retomar após `clear`:

1. [ ] Ler este checkpoint completo
2. [ ] Verificar estado atual dos arquivos modificados
3. [ ] Rodar testes para confirmar estado atual
4. [ ] Continuar na Etapa [N+1]

***

**Comando para retomar:**

```bash
cat docs/sessions/checkpoint-[data].md
git status
pnpm test -- [últimos testes executados]
```
EOF
```

#### 2.2. Atualizar CLAUDE.md (contexto permanente)

```
cat >> CLAUDE.md << 'EOF'

***

## 🔄 Checkpoint Ativo: [Nome da Tarefa]

**Última atualização:** $(date +"%Y-%m-%d %H:%M:%S")
**Arquivo de checkpoint:** `docs/sessions/checkpoint-[timestamp].md`

**Resumo executivo:**
- [1-2 frases sobre o que está sendo feito]
- Etapa atual: [N] de [Total]
- Status: [X]% concluído
- Contexto no checkpoint: [Y]% restante

**Para retomar:**
```bash
cat docs/sessions/checkpoint-[timestamp].md
```

EOF
```

#### 2.3. Informar o usuário

```
✅ Checkpoint criado com sucesso!

📄 Arquivos gerados:
- `docs/sessions/checkpoint-[timestamp].md` - Contexto completo da sessão
- `CLAUDE.md` - Atualizado com referência ao checkpoint

🔄 Próximos passos:

1. Execute o comando `clear` para limpar o contexto
2. Envie o seguinte prompt para retomar:

```markdown
Claude Code, retome a tarefa "[Nome da Tarefa]" a partir do checkpoint.

Execute:
```
cat docs/sessions/checkpoint-[timestamp].md
git status
pnpm test -- [últimos testes]
```

Continue a partir da Etapa [N+1].
```
```

---

## 📋 TEMPLATE DE RETOMADA (APÓS CLEAR)

Quando o usuário enviar o prompt de retomada:

1. Ler o checkpoint:
   ```
   cat docs/sessions/checkpoint-[timestamp].md
   ```

2. Verificar estado atual:
   ```
   git status
   git diff --stat
   ```

3. Confirmar testes ainda passando:
   ```
   pnpm test -- [últimos cenários]
   ```

4. Resumir para o usuário:
   ```
   ✅ Contexto restaurado!

   **Status recuperado:**
   - Etapas 1-[N] concluídas ✅
   - Próxima: Etapa [N+1] - [nome]
   - Testes: [X unit, Y E2E] passando
   - Contexto fresco: 100% disponível (200k tokens)

   Continuando execução...
   ```

5. Prosseguir com a próxima etapa do plano

---

## 🎯 REGRAS IMPORTANTES

1. **Nunca limpe contexto no meio de uma etapa** - Só sugira ao final de cada batch/passo concluído
2. **Checkpoint deve ser autocontido** - Quem ler deve entender o estado atual sem contexto prévio
3. **Sempre teste antes de limpar** - Garanta que a última etapa está realmente funcionando
4. **Priorize clareza** - Checkpoint deve ser em português claro, sem jargão desnecessário
5. **Preserve decisões** - Se algo foi tentado e não funcionou, documente no checkpoint
6. **Avalie ao final de CADA batch** - Mesmo que esteja em zona verde, informe os tokens restantes
7. **Seja conservador com zona amarela** - Se próximos passos são complexos (E2E, grandes diffs), sugira checkpoint mesmo com 45-50%

---

## ✅ EXEMPLO DE USO

```
### Fim do Batch 2 (de 5)

✅ Batch 2 concluído: Resume Generator integrado com loadUserAIConfig

⚠️ ANÁLISE DE CONTEXTO
- Tokens consumidos: 105,000 / 200,000 (52.5%)
- Tokens restantes: 95,000 (47.5%)
- Próximas etapas: Batch 3 (UI leve), Batch 4 (cleanup médio), Batch 5 (testes E2E pesados)

💡 RECOMENDAÇÃO: Limpar contexto agora.

Justificativa:
- Contexto abaixo de 50% ✅
- Batch 5 (testes E2E) gerará muito output ✅
- Melhor criar checkpoint agora com progresso consolidado ✅

Você deseja:
1. Continuar com contexto atual (não recomendado)
2. 🔄 Limpar contexto e gerar checkpoint (RECOMENDADO)

Responda: 1 ou 2
```

---

## 📦 ESTRUTURA DE ARQUIVOS ESPERADA

```
docs/
├── sessions/
│   ├── checkpoint-20251207-093000.md
│   ├── checkpoint-20251207-094500.md
│   └── ...
├── ia/
│   └── ia-settings-refactor.md
├── testing/
│   └── TEST_STATUS.md
└── ...

CLAUDE.md (raiz do projeto)
```

---

**Esta skill deve estar SEMPRE ATIVA** em qualquer tarefa multi-etapa executada.

**Referência de tokens:**
- Total disponível: 200,000 tokens
- 🟢 Verde (continuar): > 100,000 tokens (> 50%)
- 🟡 Amarelo (avaliar): 80,000-100,000 tokens (40-50%)
- 🔴 Vermelho (obrigatório): < 80,000 tokens (< 40%)
```
