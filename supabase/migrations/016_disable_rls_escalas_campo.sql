-- Disable RLS on the table to immediately resolve permission issues
ALTER TABLE escalas_campo DISABLE ROW LEVEL SECURITY;

-- (Optional) If we wanted to keep RLS but allow everything:
-- DROP POLICY IF EXISTS "Enable full access for all authenticated users" ON escalas_campo;
-- CREATE POLICY "Enable full access for all authenticated users" ON escalas_campo FOR ALL USING (true) WITH CHECK (true);
