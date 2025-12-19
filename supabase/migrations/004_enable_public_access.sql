-- Enable RLS on the table (ensure it is enabled)
ALTER TABLE programacao_semanal ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for everyone (anon and authenticated)
-- WARNING: This is for development only. In production, strict policies should be applied.
CREATE POLICY "Enable access to all users" ON programacao_semanal
    FOR ALL
    USING (true)
    WITH CHECK (true);
