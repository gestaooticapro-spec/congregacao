-- A home e o menu precisam saber se o membro escolhido é publicador,
-- sem abrir as demais colunas de membros para visitantes.
DROP FUNCTION IF EXISTS public.listar_membros_publicos();

CREATE FUNCTION public.listar_membros_publicos()
RETURNS TABLE (
    id UUID,
    nome_completo TEXT,
    nome_civil TEXT,
    grupo_id UUID,
    is_anciao BOOLEAN,
    is_pioneiro BOOLEAN,
    is_publicador BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        m.id,
        m.nome_completo,
        m.nome_civil,
        m.grupo_id,
        m.is_anciao,
        m.is_pioneiro,
        COALESCE(m.is_publicador, FALSE)
    FROM public.membros m
    WHERE m.ativo = TRUE
    ORDER BY m.nome_completo;
$$;

REVOKE ALL ON FUNCTION public.listar_membros_publicos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_membros_publicos() TO anon, authenticated;
