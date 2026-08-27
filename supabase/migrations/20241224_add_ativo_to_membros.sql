-- Add 'ativo' column to 'membros' table
ALTER TABLE membros ADD COLUMN ativo BOOLEAN DEFAULT true;

-- Update existing records to be active
UPDATE membros SET ativo = true WHERE ativo IS NULL;
