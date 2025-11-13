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

Seu projeto está conectado ao Supabase em:
- **URL**: `https://ncilfydqtcmnjfuclhew.supabase.co`

## Tabelas Disponíveis

O banco de dados possui as seguintes tabelas:

1. **`vagas_estagio`** (34 registros) - Vagas de estágio cadastradas
2. **`metas_diarias`** (2 registros) - Metas diárias de inscrições
3. **`configuracoes`** (1 registro) - Configurações do sistema
4. **`inscricoes`** (1 registro) - Inscrições de candidatos
5. **`admin_users`** (0 registros) - Usuários administradores

## Ferramentas Disponíveis

### 1. Consultas e Execução SQL

#### `mcp_supabase_execute_sql`
Executa queries SQL no banco de dados.

**Exemplo de uso:**
```typescript
// Buscar todas as vagas pendentes
SELECT * FROM vagas_estagio 
WHERE status = 'Pendente' 
ORDER BY created_at DESC;
```

#### `mcp_supabase_list_tables`
Lista todas as tabelas do banco de dados.

**Exemplo:**
- Lista tabelas do schema `public`
- Mostra estrutura, colunas, tipos de dados e constraints

### 2. Migrações

#### `mcp_supabase_apply_migration`
Aplica migrações DDL (Data Definition Language) ao banco.

**Exemplo:**
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

### 3. Geração de Tipos TypeScript

#### `mcp_supabase_generate_typescript_types`
Gera tipos TypeScript baseados no schema do banco.

**Uso recomendado:**
- Atualizar `lib/types.ts` quando o schema mudar
- Garantir type-safety entre banco e aplicação

### 4. Verificação de Segurança e Performance

#### `mcp_supabase_get_advisors`
Verifica problemas de segurança e performance.

**Tipos:**
- `security` - Verifica RLS policies, vulnerabilidades
- `performance` - Sugere otimizações de índices, queries

**Exemplo de uso:**
```typescript
// Verificar problemas de segurança
get_advisors(type: "security")

// Verificar otimizações de performance
get_advisors(type: "performance")
```

### 5. Logs

#### `mcp_supabase_get_logs`
Obtém logs dos serviços do Supabase (últimas 24h).

**Serviços disponíveis:**
- `api` - Logs da API
- `auth` - Logs de autenticação
- `storage` - Logs de storage
- `postgres` - Logs do banco de dados
- `edge-function` - Logs de Edge Functions
- `realtime` - Logs do Realtime

### 6. Edge Functions

#### `mcp_supabase_list_edge_functions`
Lista todas as Edge Functions do projeto.

#### `mcp_supabase_get_edge_function`
Obtém o código de uma Edge Function específica.

#### `mcp_supabase_deploy_edge_function`
Faz deploy de uma nova Edge Function.

### 7. Branches de Desenvolvimento

#### `mcp_supabase_create_branch`
Cria um branch de desenvolvimento para testar mudanças.

#### `mcp_supabase_list_branches`
Lista todos os branches criados.

#### `mcp_supabase_merge_branch`
Mescla mudanças de um branch para produção.

#### `mcp_supabase_rebase_branch`
Rebaseia um branch com as mudanças mais recentes de produção.

#### `mcp_supabase_reset_branch`
Reseta um branch para um estado anterior.

### 8. Documentação

#### `mcp_supabase_search_docs`
Busca na documentação oficial do Supabase usando GraphQL.

**Exemplo:**
```graphql
{
  searchDocs(query: "row level security", limit: 5) {
    nodes {
      title
      href
      content
    }
  }
}
```

## Exemplos Práticos

### Exemplo 1: Consultar Vagas por Status

```typescript
// Buscar vagas pendentes
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

```sql
-- Adicionar coluna de prioridade
ALTER TABLE vagas_estagio
ADD COLUMN IF NOT EXISTS prioridade INTEGER DEFAULT 0;
```

### Exemplo 3: Verificar Políticas RLS

```typescript
// Verificar se há problemas de segurança
get_advisors(type: "security")
```

### Exemplo 4: Gerar Tipos TypeScript Atualizados

```typescript
// Gerar tipos após mudanças no schema
generate_typescript_types()
```

## Diferenças: Cliente Supabase vs MCP

### Cliente Supabase (Código da Aplicação)
- **Uso**: No código da aplicação (Next.js)
- **Localização**: `lib/supabase/client.ts` e `lib/supabase/server.ts`
- **Propósito**: Interação do usuário com o banco
- **Acesso**: Requer autenticação do usuário
- **RLS**: Respeita Row Level Security policies

### MCP do Supabase (Assistente de IA)
- **Uso**: Pela IA durante desenvolvimento
- **Localização**: Configurado no Cursor
- **Propósito**: Desenvolvimento, migrações, análise
- **Acesso**: Direto ao banco (com permissões do projeto)
- **RLS**: Pode contornar RLS para operações administrativas

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

1. **Desenvolvimento Local**
   ```bash
   # 1. Criar branch de desenvolvimento (opcional)
   create_branch(name: "feature/nova-funcionalidade")
   
   # 2. Aplicar migração
   apply_migration(name: "add_nova_coluna", query: "...")
   
   # 3. Verificar advisors
   get_advisors(type: "security")
   
   # 4. Gerar tipos TypeScript
   generate_typescript_types()
   
   # 5. Testar localmente
   # 6. Mesclar branch quando pronto
   merge_branch(branch_id: "...")
   ```

2. **Debugging**
   ```bash
   # Ver logs de erro
   get_logs(service: "api")
   get_logs(service: "postgres")
   
   # Verificar estrutura
   list_tables(schemas: ["public"])
   ```

3. **Manutenção**
   ```bash
   # Verificar performance
   get_advisors(type: "performance")
   
   # Verificar segurança
   get_advisors(type: "security")
   ```

## Comandos Úteis

### Ver todas as tabelas
```typescript
list_tables(schemas: ["public"])
```

### Contar registros por tabela
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
- Verifique se o MCP está configurado corretamente
- Confirme que as credenciais do projeto estão corretas

### Problema: "Table does not exist"
- Use `list_tables()` para ver tabelas disponíveis
- Verifique o schema correto (geralmente `public`)

### Problema: "RLS policy violation"
- Use `get_advisors(type: "security")` para verificar políticas
- Considere usar `apply_migration` para ajustar políticas

## Recursos Adicionais

- [Documentação do Supabase](https://supabase.com/docs)
- [MCP Documentation](https://modelcontextprotocol.io)
- [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)

---

**Dica**: Você pode pedir à IA para executar qualquer uma dessas operações diretamente. Por exemplo:
- "Liste todas as tabelas do banco"
- "Execute uma query para ver as vagas pendentes"
- "Verifique se há problemas de segurança no banco"
- "Gere os tipos TypeScript atualizados"

