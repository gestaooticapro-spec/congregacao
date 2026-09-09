-- Conflitos entre designacoes passam a ser avisos na interface, nao bloqueios.
-- Ausencias informadas continuam sendo bloqueadas no banco, e os motores de
-- sugestao continuam excluindo membros ja ocupados automaticamente.

CREATE OR REPLACE FUNCTION public.validar_designacao_suporte()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.membro_id IS NOT NULL
       AND public.membro_em_ausencia(NEW.data, NEW.membro_id) THEN
        RAISE EXCEPTION 'Este membro informou ausencia para esta data.'
            USING ERRCODE = '23514';
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
DECLARE
    membro_id UUID;
BEGIN
    IF TG_TABLE_NAME = 'agenda_discursos_locais' THEN
        membro_id := NEW.orador_local_id;
    ELSE
        membro_id := NEW.orador_id;
    END IF;

    IF membro_id IS NOT NULL
       AND public.membro_em_ausencia(NEW.data, membro_id) THEN
        RAISE EXCEPTION 'Este membro informou ausencia para esta data.'
            USING ERRCODE = '23514';
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
DECLARE
    designado RECORD;
BEGIN
    FOR designado IN
        SELECT NEW.presidente_id AS membro_id
        UNION ALL SELECT NEW.oracao_inicial_id
        UNION ALL SELECT NEW.oracao_final_id
        UNION ALL
        SELECT NULLIF(parte->>'membro_id', '')::UUID
        FROM jsonb_array_elements(COALESCE(NEW.partes, '[]'::jsonb)) parte
        UNION ALL
        SELECT NULLIF(parte->>'ajudante_id', '')::UUID
        FROM jsonb_array_elements(COALESCE(NEW.partes, '[]'::jsonb)) parte
    LOOP
        IF designado.membro_id IS NOT NULL
           AND public.membro_em_ausencia(NEW.data_reuniao, designado.membro_id) THEN
            RAISE EXCEPTION 'Este membro informou ausencia para esta data.'
                USING ERRCODE = '23514';
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$;
