# Testes E2E - Playwright

Testes end-to-end para validar fluxos críticos do dashboard de estágios.

## 📋 Suítes de Testes

### 1. `upload.spec.ts` - Upload de Arquivos

Valida upload e parsing automático de arquivos:

- ✅ Upload de análise .md com preenchimento automático de campos
- ✅ Upload de currículo PDF/DOCX
- ✅ Validação de tipo de arquivo
- ✅ Substituição de arquivos
- ✅ Indicadores de progresso
- ✅ Preview de campos detectados

**Cobertura:** Parsing de markdown, validação de arquivos, integração com Supabase Storage

### 2. `vagas.spec.ts` - Gerenciamento de Vagas

Testa operações CRUD completas:

- ✅ Criar vaga manualmente
- ✅ Validar campos obrigatórios
- ✅ Editar vaga existente
- ✅ Deletar vaga
- ✅ Preencher formulário completo

**Cobertura:** Formulários, validação, integração com banco de dados, toasts de feedback

### 3. `filters.spec.ts` - Filtros e Busca

Valida sistema de filtros:

- ✅ Busca por texto (empresa/cargo)
- ✅ Filtro por modalidade (Presencial/Híbrido/Remoto)
- ✅ Filtro por status (Pendente/Avançado/Melou/Contratado)
- ✅ Filtro por etapa
- ✅ Combinação de múltiplos filtros
- ✅ Limpar filtros
- ✅ Mensagem de "nenhum resultado"

**Cobertura:** Filtros, busca em tempo real, estado da UI

### 4. `navigation.spec.ts` - Navegação

Testa navegação e estado da aplicação:

- ✅ Navegação entre abas (Estágios/Resumo/Configurações)
- ✅ Navegação de datas (anterior/próximo)
- ✅ Detalhes da vaga em página separada
- ✅ Exibição de meta diária
- ✅ Persistência de estado
- ✅ Indicadores de carregamento

**Cobertura:** Tabs, navegação de páginas, loading states, meta cards

## 🚀 Executar Testes

### Todos os testes

```bash
pnpm test:e2e
```

### Com interface visual (recomendado para desenvolvimento)

```bash
pnpm test:e2e:ui
```

### Modo debug (passo a passo)

```bash
pnpm test:e2e:debug
```

### Ver último relatório

```bash
pnpm test:e2e:report
```

### Testes específicos

```bash
# Apenas upload
pnpm test:e2e upload

# Apenas filtros
pnpm test:e2e filters

# Teste específico
pnpm test:e2e --grep "deve criar nova vaga"
```

## 📁 Estrutura

```
e2e/
├── fixtures/              # Arquivos de teste
│   ├── analise-exemplo.md
│   ├── analise-exemplo-2.md
│   ├── analise-invalida.txt
│   └── curriculo.pdf
├── helpers/               # Funções auxiliares
│   └── test-utils.ts
├── upload.spec.ts         # 6 testes
├── vagas.spec.ts          # 5 testes
├── filters.spec.ts        # 7 testes
├── navigation.spec.ts     # 6 testes
└── README.md
```

**Total:** 24 testes E2E

## ⚙️ Configuração

- **Browser:** Chromium (Desktop Chrome)
- **Base URL:** http://localhost:3000
- **Timeout:** 120s para servidor iniciar
- **Retries:** 2x em CI, 0x local
- **Screenshots:** Apenas em falhas
- **Videos:** Retidos em falhas
- **Trace:** Na primeira tentativa de retry

Ver `playwright.config.ts` para mais detalhes.

## 🔧 Requisitos

### Pré-requisitos

1. **Aplicação rodando:** Testes iniciam servidor automaticamente via `pnpm dev`
2. **Supabase configurado:** Variáveis de ambiente `.env` configuradas
3. **Playwright instalado:** `pnpm install` + `pnpm exec playwright install`

### Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 📊 Coverage

Testes E2E cobrem fluxos que não podem ser testados eficientemente com testes unitários:

| Funcionalidade      | Unit Tests | E2E Tests     |
| ------------------- | ---------- | ------------- |
| Parsing de markdown | ✅ 100%    | ✅ Integração |
| Date utils          | ✅ 100%    | ✅ Integração |
| Utils (cn)          | ✅ 100%    | -             |
| Upload de arquivos  | ❌         | ✅            |
| CRUD de vagas       | ❌         | ✅            |
| Filtros             | ❌         | ✅            |
| Navegação           | ❌         | ✅            |

**Complementares:** Testes unitários validam lógica isolada, E2E valida fluxos completos.

## 🐛 Debugging

### Ver traces de falhas

```bash
pnpm test:e2e:report
```

### Executar com debug visual

```bash
pnpm test:e2e:debug
```

### Gerar código de teste automaticamente

```bash
pnpm exec playwright codegen http://localhost:3000
```

## 📝 Boas Práticas

### Seletores

1. **Preferência:** `getByRole()`, `getByLabel()`, `getByText()`
2. **Alternativa:** `data-testid` (adicionar nos componentes quando necessário)
3. **Evitar:** Classes CSS, estrutura DOM rígida

### Waits

- Use `expect().toBeVisible()` com timeout em vez de `waitForTimeout()`
- Aguarde por elementos específicos, não tempos fixos
- Playwright tem auto-waiting inteligente

### Dados de Teste

- Use prefixo `[E2E-TEST]` em empresas criadas nos testes
- Testes não fazem cleanup automático (performance)
- Cleanup manual via Supabase quando necessário

### Flakiness

- Evite `waitForTimeout()` sempre que possível
- Use `waitForLoadState()` ou `expect().toBeVisible()`
- Aumente timeout apenas quando realmente necessário

## 🔄 CI/CD

Testes rodam automaticamente no GitHub Actions:

- Push para `main` e `develop`
- Pull requests

Pipeline:

1. Setup (Node.js, pnpm, Playwright)
2. Build da aplicação
3. Execução dos testes E2E
4. Upload de relatórios (em falhas)

## 📈 Futuras Melhorias

### Curto Prazo

- [ ] Adicionar testes de autenticação admin
- [ ] Testar configurações de horário customizado
- [ ] Validar gráficos e resumo estatístico

### Médio Prazo

- [ ] Testes de performance (Lighthouse CI)
- [ ] Testes de acessibilidade (axe-core)
- [ ] Visual regression testing

### Longo Prazo

- [ ] Multi-browser testing (Firefox, WebKit)
- [ ] Testes em dispositivos móveis
- [ ] Ambiente Supabase de staging isolado

## 🎯 Métricas de Sucesso

- ✅ Todos os testes E2E passam em <60s
- ✅ Zero flakiness em 10 execuções consecutivas
- ✅ CI verde em todos os PRs
- ✅ Coverage de 80%+ dos fluxos críticos

---

**Dúvidas?** Abra uma issue no repositório.
