-- A migration inicial de ausencias chegou a ser aplicada com o argumento
-- p_pin. A identificacao pela Home usa somente o membro selecionado, logo as
-- RPCs atuais recebem apenas p_membro_id. Esta migration atualiza o schema
-- remoto mesmo quando a 120010 ja foi executada.

CREATE OR REPLACE FUNCTION public.listar_minhas_ausencias(
    p_membro_id UUID
)
RETURNS SETOF public.membro_ausencias
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.membro_ausencias
    WHERE membro_id = p_membro_id
    ORDER BY data_inicio;
END;
$$;

CREATE OR REPLACE FUNCTION public.salvar_minhas_ausencias(
    p_membro_id UUID,
    p_data_inicio DATE,
    p_data_fim DATE
)
RETURNS public.membro_ausencias
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    nova public.membro_ausencias;
BEGIN
    IF p_data_inicio IS NULL OR p_data_fim IS NULL OR p_data_inicio > p_data_fim THEN
        RAISE EXCEPTION 'A data inicial deve ser anterior ou igual a data final.' USING ERRCODE = '22007';
    END IF;

    INSERT INTO public.membro_ausencias (membro_id, data_inicio, data_fim)
    VALUES (p_membro_id, p_data_inicio, p_data_fim)
    RETURNING * INTO nova;
    RETURN nova;
END;
$$;

CREATE OR REPLACE FUNCTION public.excluir_minhas_ausencias(
    p_membro_id UUID,
    p_ausencia_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.membro_ausencias
    WHERE id = p_ausencia_id AND membro_id = p_membro_id;
    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.listar_minhas_ausencias(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.salvar_minhas_ausencias(UUID, DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.excluir_minhas_ausencias(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_minhas_ausencias(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_minhas_ausencias(UUID, DATE, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.excluir_minhas_ausencias(UUID, UUID) TO anon, authenticated;
