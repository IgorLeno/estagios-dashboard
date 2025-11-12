# Guia de Configuração - Dashboard de Estágios

Este guia detalha os passos necessários para configurar o projeto completamente.

## 1. Configuração do Supabase

### 1.1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Crie um novo projeto
3. Anote a URL e a chave anônima (anon key) do projeto

### 1.2. Executar Schema SQL

1. Acesse o **SQL Editor** no painel do Supabase
2. Copie todo o conteúdo do arquivo `supabase-schema.sql`
3. Cole no editor SQL e execute
4. Verifique se todas as tabelas foram criadas:
   - `vagas_estagio`
   - `metas_diarias`
   - `configuracoes`

### 1.3. Configurar Storage Buckets

1. Acesse **Storage** no painel do Supabase
2. Crie dois buckets **públicos**:
   - `analises` (para arquivos .md de análise)
   - `curriculos` (para arquivos PDF/DOCX)

3. Para cada bucket, configure as políticas de storage:
   - Vá em **Policies** no bucket
   - Adicione política para **INSERT**: `Allow public uploads`
   - Adicione política para **SELECT**: `Allow public reads`
   - Adicione política para **DELETE**: `Allow public deletes` (opcional)

**SQL de exemplo para políticas de storage:**

```sql
-- Bucket: analises
CREATE POLICY "Allow public uploads" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'analises');

CREATE POLICY "Allow public reads" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'analises');

-- Bucket: curriculos
CREATE POLICY "Allow public uploads" ON storage.objects
  FOR INSERT TO public
  WITH CHECK (bucket_id = 'curriculos');

CREATE POLICY "Allow public reads" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'curriculos');
```

## 2. Variáveis de Ambiente

### 2.1. Criar arquivo `.env.local`

Na raiz do projeto, crie o arquivo `.env.local` com as seguintes variáveis:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
```

Substitua pelos valores reais do seu projeto Supabase.

## 3. Instalação e Execução

### 3.1. Instalar dependências

```bash
pnpm install
```

### 3.2. Executar em desenvolvimento

```bash
pnpm dev
```

O dashboard estará disponível em `http://localhost:3000`

### 3.3. Build para produção

```bash
pnpm build
pnpm start
```

## 4. Funcionalidades

### 4.1. Adição de Vagas

- **Preenchimento Manual**: Preencha todos os campos manualmente
- **Preenchimento Automático**: Faça upload de um arquivo `.md` de análise e os campos serão preenchidos automaticamente

#### Formato do arquivo de análise (.md)

O parser reconhece diversos formatos. Exemplos:

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
Empresa com ótima reputação e benefícios excelentes.
```

Ou formato alternativo:

```markdown
# Análise da Vaga

Empresa: Microsoft

Cargo: Estágio em Engenharia

Local: Remoto

Modalidade: Remoto

Score: 90

Fit: 8
```

### 4.2. Horário Customizável

Por padrão, o "dia" de inscrição vai de **06:00 às 05:59**. Isso significa que:

- Inscrições feitas às 23:00 de segunda-feira = dia de segunda
- Inscrições feitas às 02:00 de terça-feira = dia de segunda (ainda antes das 06:00)

Para alterar esse horário:

1. Acesse a aba **Configurações**
2. Ajuste os horários de início e fim
3. Salve

### 4.3. Status de Vagas

- **Pendente**: Aguardando resposta inicial
- **Avançado**: Processo em andamento, avançou para próximas etapas
- **Melou**: Processo encerrado negativamente (reprovado, não seguiu)
- **Contratado**: Processo encerrado positivamente (aprovado, contratado)

### 4.4. Metas Diárias

- Defina uma meta de inscrições por dia
- Acompanhe o progresso com gradiente visual (vermelho → dourado)
- Clique na meta para editá-la rapidamente

### 4.5. Relatórios

Na aba **Resumo**, você pode:

- Filtrar por período de datas
- Ver histórico de candidaturas por dia
- Visualizar agregações por status
- Visualizar agregações por local
- Expandir cada grupo para ver as vagas individuais

## 5. Dicas de Uso

### 5.1. Workflow Recomendado

1. Crie uma análise em markdown para cada vaga antes de se inscrever
2. Ao adicionar a vaga no dashboard, faça upload do arquivo .md
3. Os campos serão preenchidos automaticamente
4. Ajuste o que for necessário e salve
5. Upload do currículo usado (opcional)
6. Acompanhe o status conforme o processo avança

### 5.2. Organização

- Use o campo **Etapa** para rastrear onde está no processo (Ex: "Inscrição", "Entrevista RH", "Teste Técnico")
- Use **Observações** para notas importantes sobre a vaga ou processo
- Aproveite os filtros da tabela para encontrar vagas rapidamente

### 5.3. Backup

Os dados estão no Supabase. Para backup:

- Acesse **Database** → **Backups** no painel do Supabase
- Configure backups automáticos
- Ou exporte dados via SQL quando necessário

## 6. Troubleshooting

### Problema: Upload não funciona

- Verifique se os buckets `analises` e `curriculos` existem
- Verifique se os buckets são **públicos**
- Verifique se as políticas de storage estão corretas

### Problema: Dados não aparecem

- Verifique as variáveis de ambiente no `.env.local`
- Verifique se o schema SQL foi executado corretamente
- Verifique se as políticas RLS estão ativas (devem permitir acesso público)

### Problema: Erro ao salvar vaga

- Verifique o console do navegador para erros específicos
- Verifique se todos os campos obrigatórios estão preenchidos
- Verifique se os valores numéricos estão nos limites corretos

## 7. Deploy

### Vercel (Recomendado)

Este projeto está pronto para deploy na Vercel:

1. Faça push do código para GitHub
2. Conecte seu repositório na Vercel
3. Configure as variáveis de ambiente (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
4. Deploy!

A Vercel configurará automaticamente tudo para Next.js 16.

## 8. Próximos Passos

- [ ] Adicionar autenticação (se necessário)
- [ ] Implementar edição inline na tabela
- [ ] Adicionar gráficos de estatísticas
- [ ] Exportar relatórios em PDF
- [ ] Notificações de deadlines

---

Para dúvidas ou sugestões, abra uma issue no repositório.
