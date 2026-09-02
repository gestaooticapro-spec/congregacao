-- `membro_perfis.perfil` é um enum. A comparação com o parâmetro TEXT da
-- função precisa converter o enum explicitamente para evitar erro nas RLS.
CREATE OR REPLACE FUNCTION public.has_role(p_perfil TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.membro_perfis mp
        JOIN public.membros m ON m.id = mp.membro_id
        WHERE m.user_id = auth.uid()
          AND mp.perfil::TEXT = p_perfil
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;
