-- Add evento_tipo column to programacao_semanal table
ALTER TABLE programacao_semanal
ADD COLUMN evento_tipo TEXT DEFAULT 'normal' NOT NULL CHECK (evento_tipo IN ('normal', 'assembleia', 'congresso', 'celebração', 'visita spte'));
