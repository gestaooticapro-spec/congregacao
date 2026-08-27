-- FIX RLS POLICIES FOR SUPABASE
-- Run this script in the Supabase SQL Editor

-- 1. Enable RLS (just in case)
ALTER TABLE public.membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membro_perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public can read events" ON public.eventos;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.eventos;
DROP POLICY IF EXISTS "Users can read own member data" ON public.membros;
DROP POLICY IF EXISTS "Users can read own profiles" ON public.membro_perfis;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.membros;

-- 3. Create correct policies

-- EVENTOS (Allow everyone to read)
CREATE POLICY "Enable read access for all users"
ON public.eventos
FOR SELECT
USING (true);

-- MEMBROS (Allow users to read their own record)
CREATE POLICY "Users can read own member data"
ON public.membros
FOR SELECT
USING (auth.uid() = user_id);

-- MEMBRO_PERFIS (Allow users to read their own roles)
CREATE POLICY "Users can read own profiles"
ON public.membro_perfis
FOR SELECT
USING (
  membro_id IN (
    SELECT id FROM public.membros WHERE user_id = auth.uid()
  )
);

-- GRANT PERMISSIONS (Just in case)
GRANT SELECT ON public.membros TO authenticated;
GRANT SELECT ON public.membro_perfis TO authenticated;
GRANT SELECT ON public.eventos TO anon, authenticated;
