-- Drop existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Enable read access for all users" ON escalas_campo;
DROP POLICY IF EXISTS "Enable write access for RQA and ADMIN" ON escalas_campo;
DROP POLICY IF EXISTS "Enable write access for all users" ON escalas_campo;

-- Create a comprehensive permissive policy for all operations
CREATE POLICY "Enable full access for all authenticated users"
ON escalas_campo
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
