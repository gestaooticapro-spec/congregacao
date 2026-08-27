-- Add columns if they don't exist
ALTER TABLE grupos_servico 
ADD COLUMN IF NOT EXISTS superintendente_id UUID REFERENCES membros(id),
ADD COLUMN IF NOT EXISTS ajudante_id UUID REFERENCES membros(id);

-- Enable RLS
ALTER TABLE grupos_servico ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable all access for all users" ON grupos_servico;

-- Create permissive policy
CREATE POLICY "Enable all access for all users"
ON grupos_servico
FOR ALL
USING (true)
WITH CHECK (true);
