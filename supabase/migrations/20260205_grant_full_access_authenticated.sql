-- Grants full access to all tables for authenticated users
-- This is a "Hammer" fix requested to resolve connectivity/permission issues.
-- It mimics "Service Role" access for anyone who is logged in.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Iterate over all tables in the public schema
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        
        -- 1. Ensure RLS is enabled (Supabase recommends this even if policies are transparent)
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
        
        -- 2. Drop the specific "Allow all" policy if it already exists (to be idempotent)
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON public.%I', r.tablename);
        
        -- 3. Create the permissive policy
        -- FOR ALL means SELECT, INSERT, UPDATE, DELETE
        -- TO authenticated means only logged-in users (not public/anon)
        -- USING (true) means all rows are visible
        -- WITH CHECK (true) means all rows can be inserted/updated
        EXECUTE format('CREATE POLICY "Allow all for authenticated" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', r.tablename);
        
        -- 4. Grant standard SQL privileges (sometimes needed on top of RLS)
        EXECUTE format('GRANT ALL ON public.%I TO authenticated', r.tablename);
        
    END LOOP;
    
    -- 5. Grant usage on all sequences so ID generation works
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
    
END $$;
