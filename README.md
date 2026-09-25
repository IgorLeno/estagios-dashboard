# Dashboard de Estágios

Camada visual e analítica, **somente leitura**, do repositório `job-search`. Os bots do `job-search` fazem o trabalho (análise de vagas, currículo, candidatura) e mantêm a Google Sheet de registro; este dashboard consolida e apresenta esses dados.

Plano de migração e estado atual: [`docs/plans/2026-09-25-job-search-visual-layer.md`](docs/plans/2026-09-25-job-search-visual-layer.md).

## Estado

- Shell visual read-only (Estágios, Resumo, Configurações e página de vaga), ainda sem fonte de dados.
- Sem IA, sem geração de PDF e sem banco: Supabase e rotas de IA foram removidos.
- Próximos passos: camada de dados sobre a Sheet (read-only), login Google, telas de visão geral/vagas/vaga.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Radix UI (shadcn/ui), Recharts, Vitest, Playwright.

## Desenvolvimento

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm lint
pnpm format:check
pnpm test             # Vitest
pnpm test:e2e         # Playwright (Chromium)
pnpm build
```
