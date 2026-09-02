-- Fecha acessos diretos que ainda expunham PINs e registros do painel do pioneiro.
-- As migrations 120004 e 120005 ja foram aplicadas e permanecem imutaveis.

-- A busca da home precisa apenas destes campos. O PIN nunca sai da tabela.
CREATE OR REPLACE FUNCTION public.listar_membros_publicos()
RETURNS TABLE (
    id UUID,
    nome_completo TEXT,
    nome_civil TEXT,
    grupo_id UUID,
    is_anciao BOOLEAN,
    is_pioneiro BOOLEAN
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
        m.is_pioneiro
    FROM public.membros m
    WHERE m.ativo = TRUE
    ORDER BY m.nome_completo;
$$;

REVOKE ALL ON FUNCTION public.listar_membros_publicos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_membros_publicos() TO anon, authenticated;

-- A home publica exibe somente as proximas designacoes do membro escolhido,
-- sem abrir leitura direta das tabelas operacionais para anonimos.
CREATE OR REPLACE FUNCTION public.obter_designacoes_publicas_membro(
    p_membro_id UUID
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    WITH membro AS (
        SELECT id, grupo_id, is_anciao
        FROM public.membros
        WHERE id = p_membro_id AND ativo = TRUE
    ), designacoes AS (
        SELECT ps.data_reuniao AS data, 'REUNIAO'::TEXT AS tipo, 'Presidente da Reuniao'::TEXT AS descricao, NULL::TEXT AS detalhe
        FROM public.programacao_semanal ps, membro m
        WHERE ps.presidente_id = m.id AND ps.data_reuniao BETWEEN CURRENT_DATE AND CURRENT_DATE + 21

        UNION ALL
        SELECT ps.data_reuniao, 'REUNIAO', 'Oracao Inicial', NULL
        FROM public.programacao_semanal ps, membro m
        WHERE ps.oracao_inicial_id = m.id AND ps.data_reuniao BETWEEN CURRENT_DATE AND CURRENT_DATE + 21

        UNION ALL
        SELECT ps.data_reuniao, 'REUNIAO', 'Oracao Final', NULL
        FROM public.programacao_semanal ps, membro m
        WHERE ps.oracao_final_id = m.id AND ps.data_reuniao BETWEEN CURRENT_DATE AND CURRENT_DATE + 21

        UNION ALL
        SELECT
            ps.data_reuniao,
            'REUNIAO',
            CASE
                WHEN parte.item->>'membro_id' = m.id::TEXT THEN 'PARTE - ' || COALESCE(parte.item->>'nome', 'Parte')
                ELSE 'AJUDANTE - ' || COALESCE(parte.item->>'nome', 'Parte')
            END,
            NULL
        FROM public.programacao_semanal ps
        CROSS JOIN membro m
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ps.partes, '[]'::jsonb)) AS parte(item)
        WHERE ps.data_reuniao BETWEEN CURRENT_DATE AND CURRENT_DATE + 21
          AND (parte.item->>'membro_id' = m.id::TEXT OR parte.item->>'ajudante_id' = m.id::TEXT)

        UNION ALL
        SELECT
            ds.data,
            'SUPORTE',
            CASE ds.funcao
                WHEN 'SOM' THEN 'Operador de Som'
                WHEN 'MICROFONE_1' THEN 'Microfone (Volante 1)'
                WHEN 'MICROFONE_2' THEN 'Microfone (Volante 2)'
                WHEN 'INDICADOR_ENTRADA' THEN 'Indicador (Entrada)'
                WHEN 'INDICADOR_AUDITORIO' THEN 'Indicador (Auditorio)'
                WHEN 'VIDEO' THEN 'Operador de Video'
                WHEN 'PRESIDENTE' THEN 'Presidente'
                ELSE ds.funcao
            END,
            NULL
        FROM public.designacoes_suporte ds, membro m
        WHERE ds.membro_id = m.id AND ds.data BETWEEN CURRENT_DATE AND CURRENT_DATE + 21

        UNION ALL
        SELECT el.data_inicio + 2, 'LIMPEZA', 'Limpeza do Salao (Quarta)', gs.nome
        FROM public.escala_limpeza el
        JOIN public.grupos_servico gs ON gs.id = el.grupo_id
        JOIN membro m ON m.grupo_id = el.grupo_id
        WHERE el.data_inicio + 2 BETWEEN CURRENT_DATE AND CURRENT_DATE + 21

        UNION ALL
        SELECT el.data_inicio + 5, 'LIMPEZA', 'Limpeza do Salao (Sabado)', gs.nome
        FROM public.escala_limpeza el
        JOIN public.grupos_servico gs ON gs.id = el.grupo_id
        JOIN membro m ON m.grupo_id = el.grupo_id
        WHERE el.data_inicio + 5 BETWEEN CURRENT_DATE AND CURRENT_DATE + 21

        UNION ALL
        SELECT ec.data, 'CAMPO', 'Dirigente de Campo', NULL
        FROM public.escalas_campo ec, membro m
        WHERE ec.dirigente_id = m.id AND ec.data BETWEEN CURRENT_DATE AND CURRENT_DATE + 21

        UNION ALL
        SELECT adl.data, 'SUPORTE', 'Hospedagem/Lanche', NULL
        FROM public.agenda_discursos_locais adl, membro m
        WHERE adl.hospitalidade_id = m.id AND adl.data BETWEEN CURRENT_DATE AND CURRENT_DATE + 21

        UNION ALL
        SELECT adl.data, 'DISCURSO', 'Discurso Publico: ' || COALESCE(t.titulo, 'Tema a definir'), 'Na Congregacao Local'
        FROM public.agenda_discursos_locais adl
        JOIN public.temas t ON t.id = adl.tema_id
        JOIN membro m ON adl.orador_local_id = m.id
        WHERE adl.data BETWEEN CURRENT_DATE AND CURRENT_DATE + 21

        UNION ALL
        SELECT adf.data, 'DISCURSO', 'Discurso Fora: ' || COALESCE(t.titulo, 'Tema a definir'), 'Na Congregacao ' || adf.destino_congregacao
        FROM public.agenda_discursos_fora adf
        JOIN public.temas t ON t.id = adf.tema_id
        JOIN membro m ON adf.orador_id = m.id
        WHERE adf.data BETWEEN CURRENT_DATE AND CURRENT_DATE + 21

        UNION ALL
        SELECT aa.data_inicio, 'AGENDA', aa.titulo, 'Compromisso do Corpo de Anciaos'
        FROM public.agenda_anciaos aa, membro m
        WHERE m.is_anciao = TRUE AND aa.data_inicio BETWEEN CURRENT_DATE AND CURRENT_DATE + 21
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object('tipo', tipo, 'data', data, 'descricao', descricao, 'detalhe', detalhe)
            ORDER BY data, descricao
        ),
        '[]'::jsonb
    )
    FROM designacoes;
$$;

REVOKE ALL ON FUNCTION public.obter_designacoes_publicas_membro(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obter_designacoes_publicas_membro(UUID) TO anon, authenticated;

-- Registros de ministerio deixam de ser acessiveis diretamente pelo navegador.
DROP POLICY IF EXISTS "ministerio_logs_select" ON public.ministerio_logs;
DROP POLICY IF EXISTS "ministerio_logs_insert" ON public.ministerio_logs;
DROP POLICY IF EXISTS "ministerio_logs_update" ON public.ministerio_logs;
DROP POLICY IF EXISTS "ministerio_logs_delete" ON public.ministerio_logs;
REVOKE ALL ON TABLE public.ministerio_logs FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.listar_logs_pioneiro(
    p_membro_id UUID,
    p_pin TEXT,
    p_data_inicio DATE DEFAULT NULL,
    p_data_fim DATE DEFAULT NULL
)
RETURNS SETOF public.ministerio_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    RETURN QUERY
    SELECT ml.*
    FROM public.ministerio_logs ml
    WHERE ml.membro_id = p_membro_id
      AND (p_data_inicio IS NULL OR ml.data >= p_data_inicio)
      AND (p_data_fim IS NULL OR ml.data <= p_data_fim)
    ORDER BY ml.data DESC, ml.created_at DESC;
END;
$$;

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
            p_membro_id, p_data, p_minutos, p_categoria, p_comentarios, p_start_time, p_end_time
        )
        RETURNING id INTO v_log_id;
    ELSE
        UPDATE public.ministerio_logs
        SET data = p_data,
            minutos = p_minutos,
            categoria = p_categoria,
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

CREATE OR REPLACE FUNCTION public.excluir_log_pioneiro(
    p_membro_id UUID,
    p_pin TEXT,
    p_log_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    DELETE FROM public.ministerio_logs
    WHERE id = p_log_id AND membro_id = p_membro_id;

    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.listar_logs_pioneiro(UUID, TEXT, DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.salvar_log_pioneiro(UUID, TEXT, DATE, INTEGER, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.excluir_log_pioneiro(UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_logs_pioneiro(UUID, TEXT, DATE, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_log_pioneiro(UUID, TEXT, DATE, INTEGER, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.excluir_log_pioneiro(UUID, TEXT, UUID) TO anon, authenticated;
