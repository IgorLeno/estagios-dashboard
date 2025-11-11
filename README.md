# 📊 Dashboard de Estágios - Engenharia Química

[![CI Status](https://github.com/igorleno/estagios-dashboard/workflows/CI/badge.svg)](https://github.com/igorleno/estagios-dashboard/actions)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat&logo=vercel)](https://vercel.com/igorlenos-projects/v0-estagios-dashboard)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=flat&logo=next.js)](https://nextjs.org/)

Dashboard moderno e intuitivo para **organizar e acompanhar inscrições em vagas de estágio** de Engenharia Química, com funcionalidades avançadas de automação e análise.

## ✨ Funcionalidades Principais

### 🚀 Automação Inteligente
- **Upload com Drag-and-Drop** para arquivos Markdown (.md) e currículos (PDF/DOCX)
- **Parser Automático de Markdown** - extrai dados da análise e preenche campos automaticamente
- **Horário Customizável** - define quando o "dia" começa (padrão: 6h-5:59)
- **Barra de Progresso** visual durante uploads com feedback em tempo real

### 📈 Acompanhamento e Metas
- **Metas Diárias** editáveis com gradiente dinâmico (vermelho → dourado)
- **Filtros Avançados** por modalidade, status, etapa, empresa e cargo
- **Histórico Completo** com relatórios por período, status e localização
- **Animações Suaves** e microinterações para melhor UX

### 🎯 Gestão de Vagas
- **4 Status Principais**: Pendente, Avançado, Melou, Contratado
- **Score de Requisitos** (0-100) e **Fit** (0-10)
- **Tracking de Etapas** do processo seletivo
- **Anexos**: Análise em Markdown + Currículo

### 🎨 Interface Moderna
- Design **mobile-first** totalmente responsivo
- Tema claro com paleta profissional (cinza, azul, violeta)
- Componentes **Radix UI** para acessibilidade
- **Toasts animados** (Sonner) para feedback

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 16.0 (App Router)
- **Linguagem**: TypeScript 5.x (strict mode)
- **UI/Styling**: Tailwind CSS 4.1, Radix UI, Lucide Icons
- **Backend**: Supabase (Auth, Database, Storage)
- **Formulários**: React Hook Form + Zod
- **Testes**: Vitest + React Testing Library
- **CI/CD**: GitHub Actions
- **Deploy**: Vercel
- **Qualidade**: ESLint + Prettier

## 📦 Instalação

### Pré-requisitos
- Node.js 20.x ou superior
- pnpm (recomendado) ou npm

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/igorleno/estagios-dashboard.git
cd estagios-dashboard

# 2. Instale as dependências
pnpm install

# 3. Configure variáveis de ambiente
# Copie .env.example para .env.local e preencha com suas credenciais Supabase
cp .env.example .env.local

# 4. Configure o Supabase
# Execute o script SQL em supabase-schema.sql no SQL Editor do Supabase
# Crie os buckets de storage: 'analises' e 'curriculos' (públicos)

# 5. Execute em desenvolvimento
pnpm dev
```

Acesse http://localhost:3000

## 🧪 Testes

```bash
# Executar testes
pnpm test

# Executar testes com UI
pnpm test:ui

# Gerar relatório de cobertura
pnpm test:coverage

# Executar linter
pnpm lint

# Formatar código
pnpm format
```

## 📚 Documentação

- **[SETUP.md](SETUP.md)** - Guia completo de configuração do Supabase
- **[CLAUDE.md](CLAUDE.md)** - Documentação da arquitetura do projeto
- **[supabase-schema.sql](supabase-schema.sql)** - Schema SQL completo

## 🗂️ Estrutura do Projeto

```
estagios-dashboard/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Dashboard principal
│   ├── vaga/[id]/         # Detalhe de vaga
│   └── admin/             # Rotas administrativas
├── components/            # Componentes React
│   ├── ui/               # Componentes base (Radix)
│   ├── *-dialog.tsx      # Modais de CRUD
│   ├── *-upload.tsx      # Componentes de upload
│   └── vagas-table.tsx   # Tabela principal
├── lib/                  # Utilitários e lógica
│   ├── types.ts          # Tipos TypeScript
│   ├── markdown-parser.ts # Parser de análises
│   ├── date-utils.ts     # Lógica de datas
│   └── supabase/         # Integração Supabase
├── __tests__/            # Testes unitários
└── .github/workflows/    # CI/CD
```

## 🚀 Deploy

### Vercel (Recomendado)

1. Faça push do código para GitHub
2. Importe o repositório na Vercel
3. Configure as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy automático!

## 📖 Como Usar

### Adicionando uma Vaga

1. Clique em **"Adicionar Vaga"**
2. **Opção 1 - Manual**: Preencha todos os campos
3. **Opção 2 - Automático**:
   - Faça upload de um arquivo `.md` com a análise da vaga
   - Os campos serão preenchidos automaticamente
   - Ajuste o que for necessário
4. Adicione o currículo (opcional)
5. Salve!

### Formato do Arquivo de Análise

```markdown
**Empresa**: Google
**Cargo**: Engenheiro Químico Jr
**Local**: São Paulo, SP
**Modalidade**: Híbrido
**Requisitos**: 85
**Fit**: 9
**Etapa**: Inscrição
**Status**: Pendente

**Observações**:
Empresa com ótima reputação...
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'feat: adicionar feature X'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 🙏 Agradecimentos

- Iniciado com [v0.app](https://v0.app)
- UI baseada em [Radix UI](https://www.radix-ui.com/)
- Ícones por [Lucide](https://lucide.dev/)

---

**Desenvolvido com ❤️ para facilitar a organização de processos seletivos**
