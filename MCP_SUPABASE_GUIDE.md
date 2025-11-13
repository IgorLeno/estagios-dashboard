# Guia de Uso do MCP do Supabase

## O que é o MCP do Supabase?

O **MCP (Model Context Protocol) do Supabase** é uma integração que permite que assistentes de IA (como o Claude no Cursor) interajam diretamente com seu banco de dados Supabase através de ferramentas especiais. Isso permite:

- ✅ Executar queries SQL diretamente
- ✅ Aplicar migrações
- ✅ Listar tabelas e estruturas
- ✅ Gerar tipos TypeScript automaticamente
- ✅ Verificar logs e advisors de segurança
- ✅ Gerenciar Edge Functions
- ✅ Trabalhar com branches de desenvolvimento

## Status da Configuração

✅ **O MCP do Supabase já está configurado e funcionando!**

Seu projeto está conectado ao Supabase. A URL do projeto está definida em `NEXT_PUBLIC_SUPABASE_URL`.

## Tabelas Disponíveis

O banco de dados possui as seguintes tabelas:

1. **`vagas_estagio`** - Vagas de estágio cadastradas
2. **`metas_diarias`** - Metas diárias de inscrições
3. **`configuracoes`** - Configurações do sistema
4. **`inscricoes`** - Inscrições de candidatos
5. **`admin_users`** - Usuários administradores

> **Dica**: Use `mcp_supabase_list_tables` para ver a estrutura atual e contagens de registros.

## Ferramentas Disponíveis

### 1. Consultas e Execução SQL

#### `mcp_supabase_execute_sql`

Executa queries SQL no banco de dados.

**Como usar no Cursor:**
Peça à IA: "Execute esta query no banco: SELECT * FROM vagas_estagio WHERE status = 'Pendente' ORDER BY created_at DESC"

**Exemplo de query:**

```sql
-- Buscar todas as vagas pendentes
SELECT * FROM vagas_estagio
WHERE status = 'Pendente'
ORDER BY created_at DESC;
```

#### `mcp_supabase_list_tables`

Lista todas as tabelas do banco de dados.

**Como usar no Cursor:**
Peça à IA: "Liste todas as tabelas do banco de dados" ou "Mostre a estrutura da tabela vagas_estagio"

**O que retorna:**

- Tabelas do schema `public`
- Estrutura, colunas, tipos de dados e constraints

### 2. Migrações

#### `mcp_supabase_apply_migration`

Aplica migrações DDL (Data Definition Language) ao banco.

**Como usar no Cursor:**
Peça à IA: "Aplique uma migração para adicionar a coluna 'prioridade' na tabela vagas_estagio"

**Exemplo de migração:**

```sql
-- Criar nova tabela
CREATE TABLE IF NOT EXISTS public.logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acao TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Quando usar:**

- Criar/modificar tabelas
- Adicionar colunas
- Criar índices
- Modificar constraints

> **Importante**: Use `apply_migration` para mudanças de schema, não `execute_sql`

### 3. Geração de Tipos TypeScript

#### `mcp_supabase_generate_typescript_types`

Gera tipos TypeScript baseados no schema do banco.

**Como usar no Cursor:**
Peça à IA: "Gere os tipos TypeScript atualizados do banco de dados"

**Uso recomendado:**

- Atualizar `lib/types.ts` quando o schema mudar
- Garantir type-safety entre banco e aplicação
- Executar após aplicar migrações

### 4. Verificação de Segurança e Performance

#### `mcp_supabase_get_advisors`

Verifica problemas de segurança e performance.

**Como usar no Cursor:**

- Para segurança: "Verifique se há problemas de segurança no banco de dados"
- Para performance: "Verifique otimizações de performance no banco"

**Tipos de verificação:**

- `security` - Verifica RLS policies, vulnerabilidades, exposição de dados
- `performance` - Sugere otimizações de índices, queries lentas

### 5. Logs

#### `mcp_supabase_get_logs`

Obtém logs dos serviços do Supabase (últimas 24h).

**Como usar no Cursor:**
Peça à IA: "Mostre os logs da API" ou "Verifique os logs de autenticação"

**Serviços disponíveis:**

- `api` - Logs da API REST
- `auth` - Logs de autenticação e autorização
- `storage` - Logs de upload/download de arquivos
- `postgres` - Logs do banco de dados PostgreSQL
- `edge-function` - Logs de Edge Functions
- `realtime` - Logs de conexões em tempo real

### 6. Edge Functions

#### `mcp_supabase_list_edge_functions`

Lista todas as Edge Functions do projeto.

**Como usar no Cursor:**
Peça à IA: "Liste as Edge Functions do projeto"

#### `mcp_supabase_get_edge_function`

Obtém o código de uma Edge Function específica.

**Como usar no Cursor:**
Peça à IA: "Mostre o código da Edge Function chamada 'processamento'"

#### `mcp_supabase_deploy_edge_function`

Faz deploy de uma nova Edge Function.

**Como usar no Cursor:**
Peça à IA: "Faça deploy da Edge Function 'nova-funcao' com este código: [código]"

### 7. Branches de Desenvolvimento

> **Útil para**: Testar mudanças de schema antes de aplicar em produção

#### `mcp_supabase_create_branch`

Cria um branch de desenvolvimento para testar mudanças.

**Como usar no Cursor:**
Peça à IA: "Crie um branch chamado 'feature/nova-coluna' para testar mudanças"

#### `mcp_supabase_list_branches`

Lista todos os branches criados.

**Como usar no Cursor:**
Peça à IA: "Liste os branches de desenvolvimento"

#### `mcp_supabase_merge_branch`

Mescla mudanças de um branch para produção.

**Como usar no Cursor:**
Peça à IA: "Mescle o branch 'feature/nova-coluna' para produção"

#### `mcp_supabase_rebase_branch`

Rebaseia um branch com as mudanças mais recentes de produção.

#### `mcp_supabase_reset_branch`

Reseta um branch para um estado anterior.

### 8. Documentação

#### `mcp_supabase_search_docs`

Busca na documentação oficial do Supabase.

**Como usar no Cursor:**
Peça à IA: "Busque na documentação do Supabase sobre row level security"

**Útil para:**

- Encontrar informações sobre recursos do Supabase
- Ver exemplos de implementação
- Consultar best practices

## Exemplos Práticos

### Exemplo 1: Consultar Vagas por Status

**Comando:**
"Execute esta query: SELECT id, empresa, cargo, status, created_at FROM vagas_estagio WHERE status = 'Pendente' ORDER BY created_at DESC LIMIT 10"

Ou simplesmente: "Mostre as 10 vagas pendentes mais recentes"

**Query SQL:**

```sql
SELECT
  id,
  empresa,
  cargo,
  status,
  created_at
FROM vagas_estagio
WHERE status = 'Pendente'
ORDER BY created_at DESC
LIMIT 10;
```

### Exemplo 2: Criar Nova Coluna

**Comando:**
"Aplique uma migração para adicionar a coluna 'prioridade' do tipo INTEGER com valor padrão 0 na tabela vagas_estagio"

**SQL da migração:**

```sql
-- Adicionar coluna de prioridade
ALTER TABLE vagas_estagio
ADD COLUMN IF NOT EXISTS prioridade INTEGER DEFAULT 0;
```

### Exemplo 3: Verificar Políticas RLS

**Comando:**
"Verifique se há problemas de segurança no banco de dados"

A IA usará `mcp_supabase_get_advisors` com tipo "security" automaticamente.

### Exemplo 4: Gerar Tipos TypeScript Atualizados

**Comando:**
"Gere os tipos TypeScript atualizados do banco de dados"

A IA usará `mcp_supabase_generate_typescript_types` e mostrará os tipos gerados.

## Quando Usar MCP vs Cliente Supabase

### Use MCP (via IA no Cursor) quando:

- ✅ Aplicar mudanças no schema do banco (criar tabelas, adicionar colunas)
- ✅ Debugar queries ou investigar problemas no banco
- ✅ Verificar segurança (RLS policies) ou performance (índices)
- ✅ Gerar tipos TypeScript atualizados
- ✅ Analisar logs ou estrutura do banco
- ✅ Fazer testes rápidos de queries
- ✅ Deploy de Edge Functions

### Use Cliente Supabase (no código) quando:

- ✅ Implementar funcionalidades da aplicação
- ✅ Queries que dependem de autenticação do usuário
- ✅ Operações que devem respeitar RLS policies
- ✅ CRUD normal da aplicação (inserir, atualizar, deletar dados)
- ✅ Realtime subscriptions
- ✅ Upload/download de arquivos (Storage)

## Diferenças: Cliente Supabase vs MCP

### Cliente Supabase (Código da Aplicação)

- **Uso**: No código da aplicação (Next.js)
- **Localização**: `lib/supabase/client.ts` e `lib/supabase/server.ts`
- **Propósito**: Interação do usuário com o banco
- **Acesso**: Requer autenticação do usuário
- **RLS**: Respeita Row Level Security policies
- **Exemplo**: `supabase.from('vagas_estagio').select('*')`

### MCP do Supabase (Assistente de IA)

- **Uso**: Pela IA durante desenvolvimento
- **Localização**: Configurado no Cursor/Claude Code
- **Propósito**: Desenvolvimento, migrações, análise
- **Acesso**: Direto ao banco (com permissões do projeto)
- **RLS**: Pode contornar RLS para operações administrativas
- **Exemplo**: "Execute esta query: SELECT * FROM vagas_estagio"

## Boas Práticas

### ✅ Fazer

- Use `apply_migration` para mudanças de schema
- Use `execute_sql` apenas para queries de leitura/teste
- Verifique advisors regularmente
- Gere tipos TypeScript após mudanças no schema
- Use branches para testar mudanças grandes

### ❌ Evitar

- Não execute `execute_sql` para DDL (use `apply_migration`)
- Não ignore warnings dos advisors
- Não faça mudanças diretas em produção sem testar
- Não esqueça de gerar tipos após mudanças

## Fluxo de Trabalho Recomendado

### 1. Desenvolvimento de Nova Funcionalidade

**Comandos para a IA:**

1. "Crie um branch chamado 'feature/nova-funcionalidade'"
2. "Aplique uma migração para adicionar a coluna X na tabela Y"
3. "Verifique se há problemas de segurança no banco"
4. "Gere os tipos TypeScript atualizados"
5. Testar localmente no código da aplicação
6. "Mescle o branch 'feature/nova-funcionalidade' para produção"

### 2. Debugging e Investigação

**Para investigar erros:**

- "Mostre os logs da API das últimas 24h"
- "Mostre os logs do PostgreSQL"
- "Liste todas as tabelas do banco"
- "Mostre a estrutura da tabela vagas_estagio"
- "Execute esta query para verificar os dados: SELECT ..."

### 3. Manutenção e Otimização

**Verificações periódicas:**

- "Verifique otimizações de performance no banco"
- "Verifique se há problemas de segurança"
- "Mostre as queries mais lentas"
- "Liste os índices da tabela X"

## Comandos Úteis para a IA

### Ver estrutura do banco

**Comando:** "Liste todas as tabelas do schema public"

### Contar registros por tabela

**Comando:** "Execute esta query:"

```sql
SELECT
  'vagas_estagio' as tabela, COUNT(*) as total FROM vagas_estagio
UNION ALL
SELECT
  'metas_diarias', COUNT(*) FROM metas_diarias
UNION ALL
SELECT
  'configuracoes', COUNT(*) FROM configuracoes;
```

### Ver estrutura de uma tabela específica

**Comando:** "Mostre a estrutura da tabela vagas_estagio"

Ou execute esta query:

```sql
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vagas_estagio'
ORDER BY ordinal_position;
```

## Troubleshooting

### Problema: "Permission denied"

**Solução:**

- Verifique se o MCP está configurado corretamente no Cursor
- Confirme que as credenciais do projeto estão corretas
- Peça à IA: "Verifique a conexão com o Supabase"

### Problema: "Table does not exist"

**Solução:**

- Peça à IA: "Liste todas as tabelas do banco"
- Verifique se está usando o schema correto (geralmente `public`)

### Problema: "RLS policy violation"

**Solução:**

- Peça à IA: "Verifique se há problemas de segurança no banco"
- Considere ajustar as políticas RLS via migração

## Recursos Adicionais

- [Documentação do Supabase](https://supabase.com/docs)
- [MCP Documentation](https://modelcontextprotocol.io)
- [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)

---

## Como Usar Este Guia

**O MCP funciona com linguagem natural!** Você não precisa memorizar sintaxe - simplesmente peça à IA o que você quer:

### Exemplos de comandos que funcionam:

- ✅ "Liste todas as tabelas do banco"
- ✅ "Execute uma query para ver as vagas pendentes"
- ✅ "Verifique se há problemas de segurança no banco"
- ✅ "Gere os tipos TypeScript atualizados"
- ✅ "Aplique uma migração para adicionar a coluna 'prioridade' na tabela vagas_estagio"
- ✅ "Mostre os logs da API das últimas 24h"
- ✅ "Quantas vagas estão com status 'Pendente'?"

**Dica**: Seja específico no que você quer, mas use linguagem natural. A IA entenderá e usará as ferramentas MCP apropriadas automaticamente.
