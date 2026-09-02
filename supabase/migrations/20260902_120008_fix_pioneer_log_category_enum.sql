-- A RPC recebe a categoria como texto pela API, mas a coluna usa o enum
-- categoria_ministerio. A conversao explicita evita a falha no salvamento.
CREATE OR REPLACE FUNCTION public.salvar_log_pioneiro(
    p_membro_id UUID,
    p_pin TEXT,
    p_data DATE,
    p_minutos INTEGER,
    p_categoria TEXT,
    p_comentarios TEXT DEFAULT NULL,
    p_start_time TIMESTAMPTZ DEFAULT NULL,
    p_end_time TIMESTAMPTZ DEFAULT NULL,
    p_log_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.membros m
        WHERE m.id = p_membro_id
          AND m.pin = p_pin
          AND m.ativo = TRUE
          AND m.is_pioneiro = TRUE
    ) THEN
        RAISE EXCEPTION 'PIN invalido para este pioneiro.' USING ERRCODE = '42501';
    END IF;

    IF p_data IS NULL OR p_minutos IS NULL OR p_minutos <= 0 THEN
        RAISE EXCEPTION 'Data e duracao da atividade sao obrigatorias.' USING ERRCODE = '23514';
    END IF;

    IF p_categoria IS NULL OR p_categoria NOT IN ('CAMPO', 'ESTUDO', 'CARTA', 'PUBLICO', 'INFORMAL', 'OUTROS', 'LDC') THEN
        RAISE EXCEPTION 'Categoria de ministerio invalida.' USING ERRCODE = '23514';
    END IF;

    IF p_start_time IS NOT NULL AND p_end_time IS NOT NULL AND p_end_time < p_start_time THEN
        RAISE EXCEPTION 'O fim da atividade nao pode ser anterior ao inicio.' USING ERRCODE = '23514';
    END IF;

    IF p_log_id IS NULL THEN
        INSERT INTO public.ministerio_logs (
            membro_id, data, minutos, categoria, comentarios, start_time, end_time
        ) VALUES (
            p_membro_id, p_data, p_minutos, p_categoria::public.categoria_ministerio,
            p_comentarios, p_start_time, p_end_time
        )
        RETURNING id INTO v_log_id;
    ELSE
        UPDATE public.ministerio_logs
        SET data = p_data,
            minutos = p_minutos,
            categoria = p_categoria::public.categoria_ministerio,
            comentarios = p_comentarios,
            start_time = p_start_time,
            end_time = p_end_time,
            updated_at = NOW()
        WHERE id = p_log_id AND membro_id = p_membro_id
        RETURNING id INTO v_log_id;

        IF v_log_id IS NULL THEN
            RAISE EXCEPTION 'Registro de ministerio inexistente.' USING ERRCODE = 'P0002';
        END IF;
    END IF;

    RETURN v_log_id;
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_log_pioneiro(UUID, TEXT, DATE, INTEGER, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salvar_log_pioneiro(UUID, TEXT, DATE, INTEGER, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO anon, authenticated;
