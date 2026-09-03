-- Permite que o proprio membro informe um periodo em que nao podera receber
-- nenhuma designacao. A identificacao usa a sessao local criada ao selecionar
-- o membro na tela inicial; PIN numerico continua sendo exclusivo de pioneiros.

CREATE TABLE IF NOT EXISTS public.membro_ausencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membro_id UUID NOT NULL REFERENCES public.membros(id) ON DELETE CASCADE,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT membro_ausencias_periodo_valido CHECK (data_inicio <= data_fim)
);

CREATE INDEX IF NOT EXISTS membro_ausencias_membro_periodo_idx
ON public.membro_ausencias (membro_id, data_inicio, data_fim);

ALTER TABLE public.membro_ausencias ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.membro_ausencias FROM PUBLIC, anon, authenticated;

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

CREATE OR REPLACE FUNCTION public.membro_em_ausencia(p_data DATE, p_membro_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.membro_ausencias
        WHERE membro_id = p_membro_id
          AND p_data BETWEEN data_inicio AND data_fim
    );
$$;

REVOKE ALL ON FUNCTION public.membro_em_ausencia(DATE, UUID) FROM PUBLIC;

-- Protecao central: cobre reuniao de meio de semana, apoio e discursos.
CREATE OR REPLACE FUNCTION public.validar_designacao_suporte()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    conflito TEXT;
    presidente_programacao UUID;
BEGIN
    IF NEW.membro_id IS NULL THEN RETURN NEW; END IF;
    IF public.membro_em_ausencia(NEW.data, NEW.membro_id) THEN
        RAISE EXCEPTION 'Este membro informou ausencia para esta data.' USING ERRCODE = '23514';
    END IF;

    conflito := public.encontrar_conflito_designacao(NEW.data, NEW.membro_id, NEW.funcao, NULL, NULL, NULL);
    IF NEW.funcao = 'PRESIDENTE' AND conflito = 'Presidente' THEN
        SELECT presidente_id INTO presidente_programacao
        FROM public.programacao_semanal WHERE data_reuniao = NEW.data;
        IF presidente_programacao = NEW.membro_id THEN conflito := NULL; END IF;
    END IF;
    IF conflito IS NOT NULL THEN
        RAISE EXCEPTION 'Este membro ja esta escalado como % para este dia.', conflito USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_discurso_sem_conflito()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE membro_id UUID; conflito TEXT;
BEGIN
    IF TG_TABLE_NAME = 'agenda_discursos_locais' THEN
        membro_id := NEW.orador_local_id;
        IF membro_id IS NULL THEN RETURN NEW; END IF;
        IF public.membro_em_ausencia(NEW.data, membro_id) THEN
            RAISE EXCEPTION 'Este membro informou ausencia para esta data.' USING ERRCODE = '23514';
        END IF;
        conflito := public.encontrar_conflito_designacao(NEW.data, membro_id, NULL, NULL, NEW.id, NULL);
    ELSE
        membro_id := NEW.orador_id;
        IF membro_id IS NULL THEN RETURN NEW; END IF;
        IF public.membro_em_ausencia(NEW.data, membro_id) THEN
            RAISE EXCEPTION 'Este membro informou ausencia para esta data.' USING ERRCODE = '23514';
        END IF;
        conflito := public.encontrar_conflito_designacao(NEW.data, membro_id, NULL, NULL, NULL, NEW.id);
    END IF;
    IF conflito IS NOT NULL THEN
        RAISE EXCEPTION 'Este membro ja esta escalado como % para este dia.', conflito USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_programacao_sem_conflito()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE designado RECORD; conflito TEXT; presidente_compartilhado BOOLEAN;
BEGIN
    FOR designado IN
        SELECT NEW.presidente_id AS membro_id, 'PRESIDENTE'::TEXT AS funcao
        UNION ALL SELECT NEW.oracao_inicial_id, NULL::TEXT
        UNION ALL SELECT NEW.oracao_final_id, NULL::TEXT
        UNION ALL SELECT NULLIF(parte->>'membro_id', '')::UUID, NULL::TEXT FROM jsonb_array_elements(COALESCE(NEW.partes, '[]'::jsonb)) parte
        UNION ALL SELECT NULLIF(parte->>'ajudante_id', '')::UUID, NULL::TEXT FROM jsonb_array_elements(COALESCE(NEW.partes, '[]'::jsonb)) parte
    LOOP
        IF designado.membro_id IS NULL THEN CONTINUE; END IF;
        IF public.membro_em_ausencia(NEW.data_reuniao, designado.membro_id) THEN
            RAISE EXCEPTION 'Este membro informou ausencia para esta data.' USING ERRCODE = '23514';
        END IF;
        presidente_compartilhado := FALSE;
        IF designado.funcao = 'PRESIDENTE' THEN
            SELECT EXISTS (SELECT 1 FROM public.designacoes_suporte ds WHERE ds.data = NEW.data_reuniao AND ds.funcao = 'PRESIDENTE' AND ds.membro_id = designado.membro_id) INTO presidente_compartilhado;
        END IF;
        conflito := public.encontrar_conflito_designacao(NEW.data_reuniao, designado.membro_id, CASE WHEN presidente_compartilhado THEN 'PRESIDENTE' ELSE NULL END, NEW.id, NULL, NULL);
        IF conflito IS NOT NULL THEN
            RAISE EXCEPTION 'Este membro ja esta escalado como % para este dia.', conflito USING ERRCODE = '23514';
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_escala_campo_sem_ausencia()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF public.membro_em_ausencia(NEW.data, NEW.dirigente_id) THEN
        RAISE EXCEPTION 'Este membro informou ausencia para esta data.' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validar_escala_campo_ausencia_trigger ON public.escalas_campo;
CREATE TRIGGER validar_escala_campo_ausencia_trigger
BEFORE INSERT OR UPDATE ON public.escalas_campo
FOR EACH ROW EXECUTE FUNCTION public.validar_escala_campo_sem_ausencia();
