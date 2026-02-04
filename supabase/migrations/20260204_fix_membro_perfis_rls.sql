-- Fix: Enable RLS and add policies for membro_perfis table
-- This table was missing RLS policies, causing permission issues

-- Enable RLS on the table
ALTER TABLE public.membro_perfis ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read membro_perfis
-- (needed for role checks in the application)
CREATE POLICY "Enable read access for all users"
ON public.membro_perfis FOR SELECT
USING (true);

-- Allow authenticated users with ADMIN role to manage membro_perfis
CREATE POLICY "Enable insert for admin users"
ON public.membro_perfis FOR INSERT
WITH CHECK (
    exists (
        select 1 
        from public.membro_perfis mp
        join public.membros m on m.id = mp.membro_id
        where m.user_id = auth.uid() 
        and mp.perfil = 'ADMIN'
    )
);

CREATE POLICY "Enable update for admin users"
ON public.membro_perfis FOR UPDATE
USING (
    exists (
        select 1 
        from public.membro_perfis mp
        join public.membros m on m.id = mp.membro_id
        where m.user_id = auth.uid() 
        and mp.perfil = 'ADMIN'
    )
);

CREATE POLICY "Enable delete for admin users"
ON public.membro_perfis FOR DELETE
USING (
    exists (
        select 1 
        from public.membro_perfis mp
        join public.membros m on m.id = mp.membro_id
        where m.user_id = auth.uid() 
        and mp.perfil = 'ADMIN'
    )
);
