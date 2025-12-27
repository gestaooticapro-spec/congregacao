-- Add nome_civil column
ALTER TABLE membros ADD COLUMN nome_civil text;

-- Backfill nome_civil with current nome_completo values
UPDATE membros SET nome_civil = nome_completo;
