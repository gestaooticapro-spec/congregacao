-- Enable RLS on the table (ensure it is enabled)
ALTER TABLE membros ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for everyone (anon and authenticated)
-- WARNING: This is for development only.
CREATE POLICY "Enable access to all users" ON membros
    FOR ALL
    USING (true)
    WITH CHECK (true);
