-- Script SQL para configurar Storage Buckets no Supabase
-- Execute este script no SQL Editor do Supabase Dashboard
-- URL: https://supabase.com/dashboard/project/_/sql/new

-- ============================================
-- 1. CRIAR BUCKETS
-- ============================================

-- Criar bucket para análises de vagas (.md)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'analises',
  'analises',
  true,
  2097152, -- 2MB em bytes
  ARRAY['text/markdown', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Criar bucket para currículos (PDF/DOCX)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'curriculos',
  'curriculos',
  true,
  5242880, -- 5MB em bytes
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. CONFIGURAR RLS POLICIES
-- ============================================

-- BUCKET: analises
-- Policy para permitir upload público
CREATE POLICY "Public can upload markdown files"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'analises'
  AND (storage.extension(name) = 'md' OR storage.extension(name) = 'txt')
);

-- Policy para permitir leitura pública
CREATE POLICY "Public can read markdown files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'analises');

-- Policy para permitir atualização (substituir arquivo)
CREATE POLICY "Public can update markdown files"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'analises')
WITH CHECK (bucket_id = 'analises');

-- Policy para permitir deleção
CREATE POLICY "Public can delete markdown files"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'analises');

-- BUCKET: curriculos
-- Policy para permitir upload público
CREATE POLICY "Public can upload curriculum files"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'curriculos'
  AND (
    storage.extension(name) = 'pdf'
    OR storage.extension(name) = 'doc'
    OR storage.extension(name) = 'docx'
  )
);

-- Policy para permitir leitura pública
CREATE POLICY "Public can read curriculum files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'curriculos');

-- Policy para permitir atualização
CREATE POLICY "Public can update curriculum files"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'curriculos')
WITH CHECK (bucket_id = 'curriculos');

-- Policy para permitir deleção
CREATE POLICY "Public can delete curriculum files"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'curriculos');

-- ============================================
-- 3. VERIFICAR CONFIGURAÇÃO
-- ============================================

-- Listar buckets criados
SELECT id, name, public, file_size_limit, allowed_mime_types, created_at
FROM storage.buckets
WHERE name IN ('analises', 'curriculos')
ORDER BY name;

-- Verificar policies criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%markdown%' OR policyname LIKE '%curriculum%'
ORDER BY policyname;
