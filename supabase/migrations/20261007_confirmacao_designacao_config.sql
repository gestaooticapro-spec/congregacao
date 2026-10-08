-- Liga ou desliga os botões de aceitar/recusar na tela pública de confirmação.
-- TRUE mantém o comportamento atual. A tela continua mostrando a designação.
BEGIN;

ALTER TABLE public.dados_congregacao
    ADD COLUMN IF NOT EXISTS confirmacao_designacao_habilitada BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.dados_congregacao.confirmacao_designacao_habilitada
    IS 'Quando false, o link de confirmação só informa a designação e não aceita resposta.';

CREATE OR REPLACE FUNCTION public.confirmacao_designacao_habilitada()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT confirmacao_designacao_habilitada FROM public.dados_congregacao WHERE id IS TRUE),
        TRUE
    );
$$;

REVOKE ALL ON FUNCTION public.confirmacao_designacao_habilitada() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.salvar_confirmacao_designacao_habilitada(p_habilitada BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT (public.has_role('ADMIN') OR public.has_role('COORDENADOR')) THEN
        RAISE EXCEPTION 'Sem permissao para alterar esta configuracao.' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.dados_congregacao (id, confirmacao_designacao_habilitada)
    VALUES (TRUE, COALESCE(p_habilitada, TRUE))
    ON CONFLICT (id) DO UPDATE
    SET confirmacao_designacao_habilitada = EXCLUDED.confirmacao_designacao_habilitada;

    RETURN COALESCE(p_habilitada, TRUE);
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_confirmacao_designacao_habilitada(BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salvar_confirmacao_designacao_habilitada(BOOLEAN) TO authenticated;

-- Impede que o salvamento dos dados da congregação, aberto a mais perfis,
-- altere este interruptor.
CREATE OR REPLACE FUNCTION public.proteger_confirmacao_designacao_habilitada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'UPDATE'
       AND NEW.confirmacao_designacao_habilitada IS DISTINCT FROM OLD.confirmacao_designacao_habilitada
       AND NOT (public.has_role('ADMIN') OR public.has_role('COORDENADOR')) THEN
        RAISE EXCEPTION 'Apenas o administrador pode alterar a confirmacao de designacao.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proteger_confirmacao_designacao_habilitada ON public.dados_congregacao;
CREATE TRIGGER proteger_confirmacao_designacao_habilitada
BEFORE UPDATE ON public.dados_congregacao
FOR EACH ROW
EXECUTE FUNCTION public.proteger_confirmacao_designacao_habilitada();

CREATE OR REPLACE FUNCTION public.obter_confirmacao_designacao(
    p_id UUID,
    p_membro_id UUID,
    p_role TEXT DEFAULT NULL,
    p_tipo TEXT DEFAULT 'programacao'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ps public.programacao_semanal%ROWTYPE;
    adl public.agenda_discursos_locais%ROWTYPE;
    parte JSONB;
    indice INTEGER;
    membro_nome TEXT;
    ajudante_nome TEXT;
    orador_nome TEXT;
    resultado JSONB;
    aceite_habilitado BOOLEAN;
BEGIN
    aceite_habilitado := public.confirmacao_designacao_habilitada();

    SELECT nome_completo INTO membro_nome FROM public.membros WHERE id = p_membro_id AND ativo = TRUE;
    IF membro_nome IS NULL THEN RETURN NULL; END IF;

    IF p_tipo = 'hospitalidade' THEN
        SELECT * INTO adl FROM public.agenda_discursos_locais
        WHERE id = p_id AND hospitalidade_id = p_membro_id;
        IF NOT FOUND THEN RETURN NULL; END IF;
        SELECT nome INTO orador_nome FROM public.oradores_visitantes WHERE id = adl.orador_visitante_id;

        RETURN jsonb_build_object(
            'membro_nome', membro_nome,
            'data', adl.data,
            'status', COALESCE(adl.hospitalidade_status, 'pending'),
            'parte_nome', 'Hospedagem/Lanche - Orador: ' || COALESCE(orador_nome, 'visitante'),
            'ajudante_nome', NULL,
            'aceite_habilitado', aceite_habilitado
        );
    END IF;

    SELECT * INTO ps FROM public.programacao_semanal WHERE id = p_id;
    IF NOT FOUND OR p_role IS NULL THEN RETURN NULL; END IF;

    IF p_role = 'presidente' AND ps.presidente_id = p_membro_id THEN
        resultado := jsonb_build_object('status', COALESCE(ps.presidente_status, 'pending'), 'parte_nome', 'Presidente');
    ELSIF p_role = 'oracao_inicial' AND ps.oracao_inicial_id = p_membro_id THEN
        resultado := jsonb_build_object('status', COALESCE(ps.oracao_inicial_status, 'pending'), 'parte_nome', 'Oração Inicial');
    ELSIF p_role = 'oracao_final' AND ps.oracao_final_id = p_membro_id THEN
        resultado := jsonb_build_object('status', COALESCE(ps.oracao_final_status, 'pending'), 'parte_nome', 'Oração Final');
    ELSIF p_role ~ '^[0-9]+$' THEN
        indice := p_role::INTEGER;
        parte := COALESCE(ps.partes, '[]'::jsonb)->indice;
        IF parte IS NULL THEN RETURN NULL; END IF;

        IF parte->>'membro_id' = p_membro_id::TEXT THEN
            IF NULLIF(parte->>'ajudante_id', '') IS NOT NULL THEN
                SELECT nome_completo INTO ajudante_nome
                FROM public.membros WHERE id = (parte->>'ajudante_id')::UUID;
            END IF;
            resultado := jsonb_build_object(
                'status', COALESCE(parte->>'status', 'pending'),
                'parte_nome', parte->>'nome'
            );
        ELSIF parte->>'ajudante_id' = p_membro_id::TEXT THEN
            resultado := jsonb_build_object(
                'status', COALESCE(parte->>'ajudante_status', 'pending'),
                'parte_nome', COALESCE(parte->>'nome', '') || ' (Ajudante)'
            );
        ELSE
            RETURN NULL;
        END IF;
    ELSE
        RETURN NULL;
    END IF;

    RETURN resultado || jsonb_build_object(
        'membro_nome', membro_nome,
        'data', ps.data_reuniao,
        'ajudante_nome', ajudante_nome,
        'aceite_habilitado', aceite_habilitado
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.responder_confirmacao_designacao(
    p_id UUID,
    p_membro_id UUID,
    p_status TEXT,
    p_role TEXT DEFAULT NULL,
    p_tipo TEXT DEFAULT 'programacao'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ps public.programacao_semanal%ROWTYPE;
    parte JSONB;
    indice INTEGER;
BEGIN
    IF NOT public.confirmacao_designacao_habilitada() THEN
        RAISE EXCEPTION 'A confirmacao de designacao esta desabilitada.' USING ERRCODE = '42501';
    END IF;

    IF p_status NOT IN ('accepted', 'declined') THEN
        RAISE EXCEPTION 'Status de confirmacao invalido.' USING ERRCODE = '23514';
    END IF;

    IF p_tipo = 'hospitalidade' THEN
        UPDATE public.agenda_discursos_locais
        SET hospitalidade_status = p_status
        WHERE id = p_id AND hospitalidade_id = p_membro_id;
        RETURN FOUND;
    END IF;

    SELECT * INTO ps FROM public.programacao_semanal WHERE id = p_id FOR UPDATE;
    IF NOT FOUND OR p_role IS NULL THEN RETURN FALSE; END IF;

    IF p_role = 'presidente' AND ps.presidente_id = p_membro_id THEN
        UPDATE public.programacao_semanal SET presidente_status = p_status WHERE id = p_id;
    ELSIF p_role = 'oracao_inicial' AND ps.oracao_inicial_id = p_membro_id THEN
        UPDATE public.programacao_semanal SET oracao_inicial_status = p_status WHERE id = p_id;
    ELSIF p_role = 'oracao_final' AND ps.oracao_final_id = p_membro_id THEN
        UPDATE public.programacao_semanal SET oracao_final_status = p_status WHERE id = p_id;
    ELSIF p_role ~ '^[0-9]+$' THEN
        indice := p_role::INTEGER;
        parte := COALESCE(ps.partes, '[]'::jsonb)->indice;
        IF parte IS NULL THEN RETURN FALSE; END IF;

        IF parte->>'membro_id' = p_membro_id::TEXT THEN
            ps.partes := jsonb_set(ps.partes, ARRAY[p_role, 'status'], to_jsonb(p_status), TRUE);
        ELSIF parte->>'ajudante_id' = p_membro_id::TEXT THEN
            ps.partes := jsonb_set(ps.partes, ARRAY[p_role, 'ajudante_status'], to_jsonb(p_status), TRUE);
        ELSE
            RETURN FALSE;
        END IF;
        UPDATE public.programacao_semanal SET partes = ps.partes WHERE id = p_id;
    ELSE
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.obter_confirmacao_designacao(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.responder_confirmacao_designacao(UUID, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obter_confirmacao_designacao(UUID, UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.responder_confirmacao_designacao(UUID, UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

COMMIT;
