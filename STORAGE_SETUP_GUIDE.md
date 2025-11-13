# Guia de Configuração do Supabase Storage

Este guia explica como configurar os buckets de storage necessários para upload de arquivos no Dashboard de Estágios.

## 🎯 Objetivo

Criar dois buckets públicos no Supabase Storage:
1. **`analises`** - Para arquivos de análise de vagas (.md)
2. **`curriculos`** - Para currículos (PDF/DOCX)

## 📋 Método 1: Via SQL Editor (Recomendado)

### Passo 1: Acessar SQL Editor

1. Acesse o Supabase Dashboard: https://supabase.com/dashboard/project/ncilfydqtcmnjfuclhew/sql/new
2. Ou navegue: Dashboard → SQL Editor → New query

### Passo 2: Executar Script SQL

1. Abra o arquivo `supabase/storage-setup.sql`
2. Copie todo o conteúdo
3. Cole no SQL Editor
4. Clique em "Run" (ou Ctrl/Cmd + Enter)

### Passo 3: Verificar Resultados

O script deve retornar:
```
✅ Buckets criados: analises, curriculos
✅ Policies configuradas: 8 policies (4 por bucket)
```

Se houver erros, verifique a seção de troubleshooting abaixo.

---

## 📋 Método 2: Via Dashboard UI (Alternativo)

### Criar Bucket `analises`

1. Acesse: https://supabase.com/dashboard/project/ncilfydqtcmnjfuclhew/storage/buckets
2. Clique em "New bucket"
3. Configure:
   - **Name:** `analises`
   - **Public bucket:** ✅ Marcado
   - **File size limit:** 2 MB
   - **Allowed MIME types:** `text/markdown, text/plain`
4. Clique em "Create bucket"

### Criar Bucket `curriculos`

1. Clique em "New bucket" novamente
2. Configure:
   - **Name:** `curriculos`
   - **Public bucket:** ✅ Marcado
   - **File size limit:** 5 MB
   - **Allowed MIME types:** `application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document`
3. Clique em "Create bucket"

### Configurar Policies

Para cada bucket criado:

1. Clique no bucket → "Policies" tab
2. Clique em "New policy"
3. Escolha "For full customization"
4. Crie as seguintes policies:

#### Policy: SELECT (Leitura)
```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'analises'); -- ou 'curriculos'
```

#### Policy: INSERT (Upload)
```sql
CREATE POLICY "Public upload access"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'analises'); -- ou 'curriculos'
```

#### Policy: UPDATE (Substituir)
```sql
CREATE POLICY "Public update access"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'analises')
WITH CHECK (bucket_id = 'analises');
```

#### Policy: DELETE (Remover)
```sql
CREATE POLICY "Public delete access"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'analises');
```

**⚠️ Importante:** Repita as policies para ambos os buckets (`analises` e `curriculos`).

---

## ✅ Verificar Configuração

### Via Script Node.js

Execute no terminal do projeto:

```bash
node verify-storage.js
```

Saída esperada:
```
✅ Buckets encontrados:
   - analises (público)
   - curriculos (público)

✅ Todos os buckets necessários estão configurados!
```

### Via SQL Query

Execute no SQL Editor:

```sql
-- Verificar buckets
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE name IN ('analises', 'curriculos');

-- Verificar policies
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects'
AND (policyname LIKE '%markdown%' OR policyname LIKE '%curriculum%');
```

### Via Dashboard

1. Acesse: Storage → Buckets
2. Verifique que os buckets `analises` e `curriculos` aparecem
3. Clique em cada bucket
4. Verifique que o status é "Public"
5. Clique em "Policies" e confirme que há 4 policies (SELECT, INSERT, UPDATE, DELETE)

---

## 🧪 Testar Upload

### Teste Manual via Interface

1. Execute o app: `pnpm dev`
2. Acesse: http://localhost:3000
3. Clique em "Adicionar Vaga"
4. Tente fazer upload de um arquivo .md
5. Verifique se o upload funciona sem erros

### Teste Automatizado via E2E

Execute os testes E2E:

```bash
pnpm test:e2e e2e/upload.spec.ts
```

Testes esperados para passar:
- ✅ Upload de análise .md e preencher campos automaticamente
- ✅ Upload de currículo PDF
- ✅ Mostrar erro para arquivo com extensão inválida
- ✅ Permitir substituir arquivo já enviado
- ✅ Mostrar indicador de progresso durante upload
- ✅ Exibir preview dos campos detectados após upload

---

## 🔧 Troubleshooting

### Erro: "Bucket not found"

**Causa:** Buckets não foram criados ou nome incorreto.

**Solução:**
1. Verifique que os buckets existem: Storage → Buckets
2. Confirme os nomes exatos: `analises` e `curriculos` (sem espaços, acentos, ou caracteres especiais)
3. Execute o script SQL novamente

### Erro: "new row violates row-level security policy"

**Causa:** RLS policies não configuradas ou incorretas.

**Solução:**
1. Verifique que as policies foram criadas
2. Execute a seção de policies do script SQL
3. Confirme que `TO public` está correto (não `TO authenticated`)

### Erro: "Invalid MIME type"

**Causa:** Arquivo com tipo MIME não permitido.

**Solução:**
1. Verifique `allowed_mime_types` no bucket
2. Para .md: deve incluir `text/markdown` ou `text/plain`
3. Para PDF: deve incluir `application/pdf`
4. Para DOCX: deve incluir `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

### Erro: "File size exceeds limit"

**Causa:** Arquivo maior que o limite configurado.

**Solução:**
1. Bucket `analises`: limite de 2MB
2. Bucket `curriculos`: limite de 5MB
3. Ajuste `file_size_limit` se necessário (valor em bytes)

### Buckets criados mas testes ainda falham

**Causa:** Cache ou sessão desatualizada.

**Solução:**
1. Pare o servidor de desenvolvimento (Ctrl+C)
2. Limpe cache: `rm -rf .next`
3. Reinicie: `pnpm dev`
4. Execute testes novamente

---

## 📚 Recursos Adicionais

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Policies](https://supabase.com/docs/guides/storage/security/access-control)

---

## 🎯 Próximos Passos

Após configurar os buckets:

1. ✅ Verificar que buckets foram criados
2. ✅ Executar testes E2E de upload
3. ✅ Testar upload manual na interface
4. ✅ Continuar com testes de CRUD de vagas

---

**Última atualização:** 2025-11-12
