-- Migration: Create per-user OpenRouter key storage
-- Description: Stores encrypted OpenRouter API keys with user ownership and validation metadata

CREATE TABLE IF NOT EXISTS public.user_openrouter_keys (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_encrypted TEXT NOT NULL,
  key_last_four TEXT,
  validation_status TEXT NOT NULL DEFAULT 'valid' CHECK (validation_status IN ('valid', 'invalid', 'unknown')),
  last_validated_at TIMESTAMPTZ,
  last_validation_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_openrouter_keys_validation_status
  ON public.user_openrouter_keys(validation_status);

CREATE OR REPLACE FUNCTION public.update_user_openrouter_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_openrouter_keys_updated_at ON public.user_openrouter_keys;

CREATE TRIGGER trigger_update_user_openrouter_keys_updated_at
BEFORE UPDATE ON public.user_openrouter_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_user_openrouter_keys_updated_at();

ALTER TABLE public.user_openrouter_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own OpenRouter key metadata" ON public.user_openrouter_keys;
CREATE POLICY "Users can view their own OpenRouter key metadata"
ON public.user_openrouter_keys
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own OpenRouter key" ON public.user_openrouter_keys;
CREATE POLICY "Users can insert their own OpenRouter key"
ON public.user_openrouter_keys
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own OpenRouter key" ON public.user_openrouter_keys;
CREATE POLICY "Users can update their own OpenRouter key"
ON public.user_openrouter_keys
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own OpenRouter key" ON public.user_openrouter_keys;
CREATE POLICY "Users can delete their own OpenRouter key"
ON public.user_openrouter_keys
FOR DELETE
USING (auth.uid() = user_id);

COMMENT ON TABLE public.user_openrouter_keys IS 'Stores encrypted per-user OpenRouter API keys';
COMMENT ON COLUMN public.user_openrouter_keys.api_key_encrypted IS 'AES-GCM encrypted OpenRouter API key ciphertext';
COMMENT ON COLUMN public.user_openrouter_keys.key_last_four IS 'Last four characters of the API key for masked UI display';
