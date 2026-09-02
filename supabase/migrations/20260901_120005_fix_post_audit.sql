-- Correcoes posteriores a auditoria da migration 120004.
-- A 120004 ja foi aplicada e deve permanecer imutavel.

-- As policies de limpeza eram ineficazes porque uma migration antiga desabilitou RLS.
ALTER TABLE public.escala_limpeza ENABLE ROW LEVEL SECURITY;

-- Alinha apoio com menu e RPC: somente ADMIN, COORDENADOR e RQA escrevem.
DROP POLICY IF EXISTS "Enable insert for authenticated users with role" ON public.designacoes_suporte;
DROP POLICY IF EXISTS "Enable update for authenticated users with role" ON public.designacoes_suporte;
DROP POLICY IF EXISTS "Enable delete for authenticated users with role" ON public.designacoes_suporte;
DROP POLICY IF EXISTS "designacoes_suporte_insert" ON public.designacoes_suporte;
DROP POLICY IF EXISTS "designacoes_suporte_update" ON public.designacoes_suporte;
DROP POLICY IF EXISTS "designacoes_suporte_delete" ON public.designacoes_suporte;

CREATE POLICY "designacoes_suporte_insert" ON public.designacoes_suporte
FOR INSERT TO authenticated WITH CHECK (
    public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('RQA')
);
CREATE POLICY "designacoes_suporte_update" ON public.designacoes_suporte
FOR UPDATE TO authenticated
USING (public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('RQA'))
WITH CHECK (public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('RQA'));
CREATE POLICY "designacoes_suporte_delete" ON public.designacoes_suporte
FOR DELETE TO authenticated USING (
    public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('RQA')
);

-- RQA sincroniza o Presidente somente pela RPC; nao pode alterar toda a programacao.
DROP POLICY IF EXISTS "programacao_semanal_insert" ON public.programacao_semanal;
DROP POLICY IF EXISTS "programacao_semanal_update" ON public.programacao_semanal;
CREATE POLICY "programacao_semanal_insert" ON public.programacao_semanal
FOR INSERT TO authenticated WITH CHECK (
    public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('RESP_QUINTA')
);
CREATE POLICY "programacao_semanal_update" ON public.programacao_semanal
FOR UPDATE TO authenticated
USING (public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('RESP_QUINTA'))
WITH CHECK (public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('RESP_QUINTA'));

-- O proprio orador pode administrar seus temas; responsaveis mantem acesso global.
DROP POLICY IF EXISTS "membros_temas_insert" ON public.membros_temas;
DROP POLICY IF EXISTS "membros_temas_update" ON public.membros_temas;
DROP POLICY IF EXISTS "membros_temas_delete" ON public.membros_temas;
CREATE POLICY "membros_temas_insert" ON public.membros_temas
FOR INSERT TO authenticated WITH CHECK (
    public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('RESP_SABADO')
    OR EXISTS (
        SELECT 1 FROM public.membros m
        WHERE m.id = membros_temas.membro_id AND m.user_id = auth.uid()
    )
);
CREATE POLICY "membros_temas_update" ON public.membros_temas
FOR UPDATE TO authenticated
USING (
    public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('RESP_SABADO')
    OR EXISTS (
        SELECT 1 FROM public.membros m
        WHERE m.id = membros_temas.membro_id AND m.user_id = auth.uid()
    )
)
WITH CHECK (
    public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('RESP_SABADO')
    OR EXISTS (
        SELECT 1 FROM public.membros m
        WHERE m.id = membros_temas.membro_id AND m.user_id = auth.uid()
    )
);
CREATE POLICY "membros_temas_delete" ON public.membros_temas
FOR DELETE TO authenticated USING (
    public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('RESP_SABADO')
    OR EXISTS (
        SELECT 1 FROM public.membros m
        WHERE m.id = membros_temas.membro_id AND m.user_id = auth.uid()
    )
);

-- Operacao especifica para o Superintendente mover membros entre grupos sem
-- conceder UPDATE irrestrito na tabela membros.
CREATE OR REPLACE FUNCTION public.atualizar_membro_grupo(
    p_membro_id UUID,
    p_grupo_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT (
        public.has_role('ADMIN') OR public.has_role('COORDENADOR')
        OR public.has_role('SUPERINTENDENTE_SERVICO')
    ) THEN
        RAISE EXCEPTION 'Sem permissao para alterar o grupo do membro.' USING ERRCODE = '42501';
    END IF;

    IF p_grupo_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.grupos_servico WHERE id = p_grupo_id
    ) THEN
        RAISE EXCEPTION 'Grupo de servico inexistente.' USING ERRCODE = '23503';
    END IF;

    UPDATE public.membros SET grupo_id = p_grupo_id WHERE id = p_membro_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Membro inexistente.' USING ERRCODE = 'P0002';
    END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.atualizar_membro_grupo(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.atualizar_membro_grupo(UUID, UUID) TO authenticated;

-- Impede duplicidades dentro da mesma programacao e exige que as duas
-- representacoes do Presidente sejam iguais quando ambas existirem.
CREATE OR REPLACE FUNCTION public.validar_programacao_sem_conflito()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    designado RECORD;
    conflito TEXT;
    presidente_apoio UUID;
    membro_duplicado UUID;
BEGIN
    SELECT ocupacao.membro_id
    INTO membro_duplicado
    FROM (
        SELECT NEW.presidente_id AS membro_id
        UNION ALL SELECT NEW.oracao_inicial_id
        UNION ALL SELECT NEW.oracao_final_id
        UNION ALL
        SELECT NULLIF(parte->>'membro_id', '')::UUID
        FROM jsonb_array_elements(COALESCE(NEW.partes, '[]'::jsonb)) parte
        UNION ALL
        SELECT NULLIF(parte->>'ajudante_id', '')::UUID
        FROM jsonb_array_elements(COALESCE(NEW.partes, '[]'::jsonb)) parte
    ) ocupacao
    WHERE ocupacao.membro_id IS NOT NULL
    GROUP BY ocupacao.membro_id
    HAVING COUNT(*) > 1
    LIMIT 1;

    IF membro_duplicado IS NOT NULL THEN
        RAISE EXCEPTION 'O mesmo membro nao pode receber duas designacoes na mesma reuniao.'
            USING ERRCODE = '23514';
    END IF;

    SELECT ds.membro_id INTO presidente_apoio
    FROM public.designacoes_suporte ds
    WHERE ds.data = NEW.data_reuniao AND ds.funcao = 'PRESIDENTE'
    LIMIT 1;

    IF presidente_apoio IS NOT NULL
       AND NEW.presidente_id IS NOT NULL
       AND presidente_apoio <> NEW.presidente_id THEN
        RAISE EXCEPTION 'O Presidente da reuniao deve ser o mesmo da escala de apoio.'
            USING ERRCODE = '23514';
    END IF;

    FOR designado IN
        SELECT NEW.presidente_id AS membro_id, 'PRESIDENTE'::TEXT AS funcao
        UNION ALL SELECT NEW.oracao_inicial_id, NULL::TEXT
        UNION ALL SELECT NEW.oracao_final_id, NULL::TEXT
        UNION ALL
        SELECT NULLIF(parte->>'membro_id', '')::UUID, NULL::TEXT
        FROM jsonb_array_elements(COALESCE(NEW.partes, '[]'::jsonb)) parte
        UNION ALL
        SELECT NULLIF(parte->>'ajudante_id', '')::UUID, NULL::TEXT
        FROM jsonb_array_elements(COALESCE(NEW.partes, '[]'::jsonb)) parte
    LOOP
        IF designado.membro_id IS NULL THEN CONTINUE; END IF;
        conflito := public.encontrar_conflito_designacao(
            NEW.data_reuniao,
            designado.membro_id,
            CASE
                WHEN designado.funcao = 'PRESIDENTE'
                 AND presidente_apoio = designado.membro_id
                THEN 'PRESIDENTE'
                ELSE NULL
            END,
            NEW.id,
            NULL,
            NULL
        );
        IF conflito IS NOT NULL THEN
            RAISE EXCEPTION 'Este membro ja esta escalado como % para este dia.', conflito
                USING ERRCODE = '23514';
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$;

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

    IF NEW.funcao = 'PRESIDENTE' THEN
        SELECT presidente_id INTO presidente_programacao
        FROM public.programacao_semanal
        WHERE data_reuniao = NEW.data;

        IF presidente_programacao IS NOT NULL AND presidente_programacao <> NEW.membro_id THEN
            RAISE EXCEPTION 'O Presidente da escala de apoio deve ser o mesmo da reuniao.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    conflito := public.encontrar_conflito_designacao(
        NEW.data, NEW.membro_id, NEW.funcao, NULL, NULL, NULL
    );

    IF NEW.funcao = 'PRESIDENTE'
       AND conflito = 'Presidente'
       AND presidente_programacao = NEW.membro_id THEN
        conflito := NULL;
    END IF;

    IF conflito IS NOT NULL THEN
        RAISE EXCEPTION 'Este membro ja esta escalado como % para este dia.', conflito
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

-- Salva apoio com privilegio controlado pela propria funcao. Isso permite ao
-- RQA sincronizar somente o Presidente, sem UPDATE geral em programacao.
CREATE OR REPLACE FUNCTION public.salvar_designacoes_suporte(
    p_data DATE,
    p_programacao_id UUID,
    p_designacoes JSONB,
    p_presidente_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    programacao_data DATE;
    programacao_presidente UUID;
BEGIN
    IF NOT (
        public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('RQA')
    ) THEN
        RAISE EXCEPTION 'Sem permissao para salvar designacoes de apoio.' USING ERRCODE = '42501';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(p_data::TEXT, 0));

    IF p_programacao_id IS NOT NULL THEN
        SELECT data_reuniao, presidente_id INTO programacao_data, programacao_presidente
        FROM public.programacao_semanal WHERE id = p_programacao_id;

        IF programacao_data IS NULL OR programacao_data <> p_data THEN
            RAISE EXCEPTION 'A programacao informada nao pertence a data da escala.'
                USING ERRCODE = '23514';
        END IF;

        IF programacao_presidente IS NOT NULL
           AND p_presidente_id IS NOT NULL
           AND programacao_presidente <> p_presidente_id THEN
            RAISE EXCEPTION 'A programacao ja possui outro Presidente para esta data.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    DELETE FROM public.designacoes_suporte WHERE data = p_data;

    IF p_programacao_id IS NOT NULL
       AND p_presidente_id IS NOT NULL
       AND programacao_presidente IS NULL THEN
        UPDATE public.programacao_semanal
        SET presidente_id = p_presidente_id
        WHERE id = p_programacao_id;
    END IF;

    INSERT INTO public.designacoes_suporte (data, programacao_id, funcao, membro_id)
    SELECT
        p_data,
        p_programacao_id,
        item->>'funcao',
        NULLIF(item->>'membro_id', '')::UUID
    FROM jsonb_array_elements(COALESCE(p_designacoes, '[]'::jsonb)) item
    WHERE NULLIF(item->>'membro_id', '') IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.salvar_designacoes_suporte(DATE, UUID, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salvar_designacoes_suporte(DATE, UUID, JSONB, UUID) TO authenticated;

-- Confirmação publica: o par ID da agenda/programacao + membro funciona como
-- token de posse, mas a funcao confirma que o membro realmente ocupa a funcao.
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
BEGIN
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
            'ajudante_nome', NULL
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
        'ajudante_nome', ajudante_nome
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

-- O painel do pioneiro usa PIN, nao uma sessao Auth. Estas RPCs expõem e
-- alteram somente a configuracao do proprio pioneiro validado pelo PIN.
CREATE OR REPLACE FUNCTION public.obter_configuracao_pioneiro(
    p_membro_id UUID,
    p_pin TEXT
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT jsonb_build_object(
        'saldo_inicial_pioneiro', COALESCE(m.saldo_inicial_pioneiro, '{}'::jsonb),
        'pioneiro_onboarding_concluido', m.pioneiro_onboarding_concluido,
        'inicio_pioneiro_ano_servico', COALESCE(m.inicio_pioneiro_ano_servico, '{}'::jsonb)
    )
    FROM public.membros m
    WHERE m.id = p_membro_id
      AND m.pin = p_pin
      AND m.ativo = TRUE
      AND m.is_pioneiro = TRUE
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.salvar_configuracao_pioneiro(
    p_membro_id UUID,
    p_pin TEXT,
    p_ano_servico TEXT,
    p_saldo_inicial NUMERIC DEFAULT NULL,
    p_data_inicio DATE DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_ano_servico IS NULL OR p_ano_servico !~ '^[0-9]{4}$' THEN
        RAISE EXCEPTION 'Ano de servico invalido.' USING ERRCODE = '23514';
    END IF;

    IF p_saldo_inicial IS NOT NULL AND p_saldo_inicial < 0 THEN
        RAISE EXCEPTION 'O saldo inicial nao pode ser negativo.' USING ERRCODE = '23514';
    END IF;

    UPDATE public.membros m
    SET saldo_inicial_pioneiro = CASE
            WHEN p_saldo_inicial IS NULL THEN COALESCE(m.saldo_inicial_pioneiro, '{}'::jsonb)
            ELSE jsonb_set(
                COALESCE(m.saldo_inicial_pioneiro, '{}'::jsonb),
                ARRAY[p_ano_servico],
                to_jsonb(p_saldo_inicial),
                TRUE
            )
        END,
        inicio_pioneiro_ano_servico = CASE
            WHEN p_data_inicio IS NULL THEN COALESCE(m.inicio_pioneiro_ano_servico, '{}'::jsonb)
            ELSE jsonb_set(
                COALESCE(m.inicio_pioneiro_ano_servico, '{}'::jsonb),
                ARRAY[p_ano_servico],
                to_jsonb(p_data_inicio::TEXT),
                TRUE
            )
        END,
        pioneiro_onboarding_concluido = TRUE
    WHERE m.id = p_membro_id
      AND m.pin = p_pin
      AND m.ativo = TRUE
      AND m.is_pioneiro = TRUE;

    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.obter_configuracao_pioneiro(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.salvar_configuracao_pioneiro(UUID, TEXT, TEXT, NUMERIC, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obter_configuracao_pioneiro(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_configuracao_pioneiro(UUID, TEXT, TEXT, NUMERIC, DATE) TO anon, authenticated;

-- Funcoes trigger nao precisam ser chamadas diretamente.
REVOKE ALL ON FUNCTION public.validar_programacao_sem_conflito() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validar_designacao_suporte() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validar_discurso_sem_conflito() FROM PUBLIC;
