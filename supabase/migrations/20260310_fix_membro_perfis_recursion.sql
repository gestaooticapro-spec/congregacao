-- Create a security definer function to check roles without infinite recursion
CREATE OR REPLACE FUNCTION public.has_role(p_perfil TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.membro_perfis mp
    JOIN public.membros m ON m.id = mp.membro_id
    WHERE m.user_id = auth.uid()
    AND mp.perfil = p_perfil
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing recursive policies on membro_perfis
DROP POLICY IF EXISTS "Enable insert for admin users" ON public.membro_perfis;
DROP POLICY IF EXISTS "Enable update for admin users" ON public.membro_perfis;
DROP POLICY IF EXISTS "Enable delete for admin users" ON public.membro_perfis;

-- Create new non-recursive policies
CREATE POLICY "Enable insert for admin users"
ON public.membro_perfis FOR INSERT
WITH CHECK (public.has_role('ADMIN'));

CREATE POLICY "Enable update for admin users"
ON public.membro_perfis FOR UPDATE
USING (public.has_role('ADMIN'));

CREATE POLICY "Enable delete for admin users"
ON public.membro_perfis FOR DELETE
USING (public.has_role('ADMIN'));

-- Grant execute on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;
