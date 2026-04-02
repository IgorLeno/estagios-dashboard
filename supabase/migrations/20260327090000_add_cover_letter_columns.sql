-- Persistência de carta de apresentação por idioma na tabela de vagas
ALTER TABLE vagas_estagio
ADD COLUMN IF NOT EXISTS carta_apresentacao_text_pt TEXT,
ADD COLUMN IF NOT EXISTS carta_apresentacao_text_en TEXT;

COMMENT ON COLUMN vagas_estagio.carta_apresentacao_text_pt IS
'Texto da carta de apresentação em português, persistido por vaga.';

COMMENT ON COLUMN vagas_estagio.carta_apresentacao_text_en IS
'Texto da carta de apresentação em inglês, persistido por vaga.';
