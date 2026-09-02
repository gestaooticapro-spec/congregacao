-- Fecha politicas permissivas antigas e torna as regras de conflito autoritativas no banco.

-- Esta politica foi criada em massa para todas as tabelas existentes em 2026-02-05.
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN (
              'membros', 'membro_perfis', 'programacao_semanal',
              'designacoes_suporte', 'escalas_campo', 'grupos_servico',
              'temas', 'oradores_visitantes', 'membros_temas',
              'agenda_discursos_locais', 'agenda_discursos_fora',
              'eventos', 'visita_config', 'escala_limpeza'
          )
    LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS %I ON %I.%I',
            'Allow all for authenticated',
            table_record.schemaname,
            table_record.tablename
        );
    END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.has_role(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;

-- Perfis: leitura autenticada; somente Admin/Coordenador alteram permissoes.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.membro_perfis;
DROP POLICY IF EXISTS "membro_perfis_select_authenticated" ON public.membro_perfis;
CREATE POLICY "membro_perfis_select_authenticated"
ON public.membro_perfis FOR SELECT TO authenticated USING (true);

-- Cadastro de membros: todos os autenticados podem consultar; gestao somente Admin/Coordenador.
DROP POLICY IF EXISTS "Enable access to all users" ON public.membros;
DROP POLICY IF EXISTS "membros_select" ON public.membros;
DROP POLICY IF EXISTS "membros_insert" ON public.membros;
DROP POLICY IF EXISTS "membros_update" ON public.membros;
DROP POLICY IF EXISTS "membros_delete" ON public.membros;
CREATE POLICY "membros_select" ON public.membros FOR SELECT TO authenticated USING (true);
CREATE POLICY "membros_insert" ON public.membros FOR INSERT TO authenticated
WITH CHECK (public.has_role('ADMIN') OR public.has_role('COORDENADOR'));
CREATE POLICY "membros_update" ON public.membros FOR UPDATE TO authenticated
USING (public.has_role('ADMIN') OR public.has_role('COORDENADOR'))
WITH CHECK (public.has_role('ADMIN') OR public.has_role('COORDENADOR'));
CREATE POLICY "membros_delete" ON public.membros FOR DELETE TO authenticated
USING (public.has_role('ADMIN') OR public.has_role('COORDENADOR'));

-- Remove politicas historicas que anulavam as restricoes dos modulos abaixo.
DROP POLICY IF EXISTS "Enable all access for all users" ON public.designacoes_suporte;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.programacao_semanal;
DROP POLICY IF EXISTS "Enable access to all users" ON public.programacao_semanal;

DROP POLICY IF EXISTS "Enable full access for all authenticated users" ON public.escalas_campo;
DROP POLICY IF EXISTS "Enable write access for all users" ON public.escalas_campo;
ALTER TABLE public.escalas_campo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for all users" ON public.grupos_servico;

-- Reuniao do meio de semana.
DROP POLICY IF EXISTS "programacao_semanal_select" ON public.programacao_semanal;
DROP POLICY IF EXISTS "programacao_semanal_insert" ON public.programacao_semanal;
DROP POLICY IF EXISTS "programacao_semanal_update" ON public.programacao_semanal;
DROP POLICY IF EXISTS "programacao_semanal_delete" ON public.programacao_semanal;
CREATE POLICY "programacao_semanal_select" ON public.programacao_semanal
FOR SELECT TO authenticated USING (true);
CREATE POLICY "programacao_semanal_insert" ON public.programacao_semanal
FOR INSERT TO authenticated WITH CHECK (
    public.has_role('ADMIN') OR public.has_role('COORDENADOR')
    OR public.has_role('RESP_QUINTA') OR public.has_role('RQA')
);
CREATE POLICY "programacao_semanal_update" ON public.programacao_semanal
FOR UPDATE TO authenticated
USING (
    public.has_role('ADMIN') OR public.has_role('COORDENADOR')
    OR public.has_role('RESP_QUINTA') OR public.has_role('RQA')
)
WITH CHECK (
    public.has_role('ADMIN') OR public.has_role('COORDENADOR')
    OR public.has_role('RESP_QUINTA') OR public.has_role('RQA')
);
CREATE POLICY "programacao_semanal_delete" ON public.programacao_semanal
FOR DELETE TO authenticated USING (
    public.has_role('ADMIN') OR public.has_role('COORDENADOR')
    OR public.has_role('RESP_QUINTA')
);

-- Designacoes de apoio.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.designacoes_suporte;
DROP POLICY IF EXISTS "designacoes_suporte_select" ON public.designacoes_suporte;
CREATE POLICY "designacoes_suporte_select" ON public.designacoes_suporte
FOR SELECT TO authenticated USING (true);

-- Dirigentes de campo (nao participam das regras de conflito das reunioes).
DROP POLICY IF EXISTS "Enable read access for all users" ON public.escalas_campo;
DROP POLICY IF EXISTS "escalas_campo_select" ON public.escalas_campo;
DROP POLICY IF EXISTS "escalas_campo_insert" ON public.escalas_campo;
DROP POLICY IF EXISTS "escalas_campo_update" ON public.escalas_campo;
DROP POLICY IF EXISTS "escalas_campo_delete" ON public.escalas_campo;
CREATE POLICY "escalas_campo_select" ON public.escalas_campo
FOR SELECT TO authenticated USING (true);
CREATE POLICY "escalas_campo_insert" ON public.escalas_campo
FOR INSERT TO authenticated WITH CHECK (
    public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('RQA')
);
CREATE POLICY "escalas_campo_update" ON public.escalas_campo
FOR UPDATE TO authenticated
USING (public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('RQA'))
WITH CHECK (public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('RQA'));
CREATE POLICY "escalas_campo_delete" ON public.escalas_campo
FOR DELETE TO authenticated USING (
    public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('RQA')
);

-- Discursos e seus cadastros auxiliares.
DO $$
DECLARE
    target_table TEXT;
BEGIN
    FOREACH target_table IN ARRAY ARRAY[
        'temas', 'oradores_visitantes', 'membros_temas',
        'agenda_discursos_locais', 'agenda_discursos_fora'
    ]
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Enable read access for authenticated users', target_table);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Enable insert access for authenticated users', target_table);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Enable update access for authenticated users', target_table);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Enable delete access for authenticated users', target_table);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Enable read access for all users', target_table);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Enable insert access for all users', target_table);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Enable update access for all users', target_table);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Enable delete access for all users', target_table);

        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
            target_table || '_select', target_table
        );
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_role(''ADMIN'') OR public.has_role(''COORDENADOR'') OR public.has_role(''RESP_SABADO''))',
            target_table || '_insert', target_table
        );
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.has_role(''ADMIN'') OR public.has_role(''COORDENADOR'') OR public.has_role(''RESP_SABADO'')) WITH CHECK (public.has_role(''ADMIN'') OR public.has_role(''COORDENADOR'') OR public.has_role(''RESP_SABADO''))',
            target_table || '_update', target_table
        );
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.has_role(''ADMIN'') OR public.has_role(''COORDENADOR'') OR public.has_role(''RESP_SABADO''))',
            target_table || '_delete', target_table
        );
    END LOOP;
END;
$$;

-- Grupos de servico.
DROP POLICY IF EXISTS "grupos_servico_select" ON public.grupos_servico;
DROP POLICY IF EXISTS "grupos_servico_insert" ON public.grupos_servico;
DROP POLICY IF EXISTS "grupos_servico_update" ON public.grupos_servico;
DROP POLICY IF EXISTS "grupos_servico_delete" ON public.grupos_servico;
CREATE POLICY "grupos_servico_select" ON public.grupos_servico
FOR SELECT TO authenticated USING (true);
CREATE POLICY "grupos_servico_insert" ON public.grupos_servico
FOR INSERT TO authenticated WITH CHECK (
    public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('SUPERINTENDENTE_SERVICO')
);
CREATE POLICY "grupos_servico_update" ON public.grupos_servico
FOR UPDATE TO authenticated
USING (public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('SUPERINTENDENTE_SERVICO'))
WITH CHECK (public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('SUPERINTENDENTE_SERVICO'));
CREATE POLICY "grupos_servico_delete" ON public.grupos_servico
FOR DELETE TO authenticated USING (
    public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('SUPERINTENDENTE_SERVICO')
);

-- Escala de limpeza.
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.escala_limpeza;
DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON public.escala_limpeza;
DROP POLICY IF EXISTS "Enable update access for all authenticated users" ON public.escala_limpeza;
DROP POLICY IF EXISTS "Enable delete access for all authenticated users" ON public.escala_limpeza;
CREATE POLICY "escala_limpeza_select" ON public.escala_limpeza
FOR SELECT TO authenticated USING (true);
CREATE POLICY "escala_limpeza_insert" ON public.escala_limpeza
FOR INSERT TO authenticated WITH CHECK (
    public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('SUPERINTENDENTE_SERVICO')
);
CREATE POLICY "escala_limpeza_update" ON public.escala_limpeza
FOR UPDATE TO authenticated
USING (public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('SUPERINTENDENTE_SERVICO'))
WITH CHECK (public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('SUPERINTENDENTE_SERVICO'));
CREATE POLICY "escala_limpeza_delete" ON public.escala_limpeza
FOR DELETE TO authenticated USING (
    public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('SUPERINTENDENTE_SERVICO')
);

-- Retorna o primeiro compromisso incompatível encontrado para um membro/data.
CREATE OR REPLACE FUNCTION public.encontrar_conflito_designacao(
    p_data DATE,
    p_membro_id UUID,
    p_ignorar_funcao_apoio TEXT DEFAULT NULL,
    p_ignorar_programacao_id UUID DEFAULT NULL,
    p_ignorar_discurso_local_id UUID DEFAULT NULL,
    p_ignorar_discurso_fora_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    conflito TEXT;
BEGIN
    SELECT CASE ds.funcao
        WHEN 'PRESIDENTE' THEN 'Presidente'
        WHEN 'SOM' THEN 'Som'
        WHEN 'MICROFONE_1' THEN 'Microfone 1'
        WHEN 'MICROFONE_2' THEN 'Microfone 2'
        WHEN 'INDICADOR_ENTRADA' THEN 'Indicador de Entrada'
        WHEN 'INDICADOR_AUDITORIO' THEN 'Indicador de Auditório'
        WHEN 'LEITOR_SENTINELA' THEN 'Leitor da Sentinela'
        WHEN 'VIDEO' THEN 'Vídeo'
        ELSE ds.funcao
    END
    INTO conflito
    FROM public.designacoes_suporte ds
    WHERE ds.data = p_data
      AND ds.membro_id = p_membro_id
      AND (p_ignorar_funcao_apoio IS NULL OR ds.funcao <> p_ignorar_funcao_apoio)
    LIMIT 1;
    IF conflito IS NOT NULL THEN RETURN conflito; END IF;

    SELECT CASE
        WHEN ps.presidente_id = p_membro_id THEN 'Presidente'
        WHEN ps.oracao_inicial_id = p_membro_id THEN 'Oração Inicial'
        WHEN ps.oracao_final_id = p_membro_id THEN 'Oração Final'
        ELSE 'Parte da reunião'
    END
    INTO conflito
    FROM public.programacao_semanal ps
    WHERE ps.data_reuniao = p_data
      AND (p_ignorar_programacao_id IS NULL OR ps.id <> p_ignorar_programacao_id)
      AND (
          ps.presidente_id = p_membro_id
          OR ps.oracao_inicial_id = p_membro_id
          OR ps.oracao_final_id = p_membro_id
          OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements(COALESCE(ps.partes, '[]'::jsonb)) parte
              WHERE parte->>'membro_id' = p_membro_id::TEXT
                 OR parte->>'ajudante_id' = p_membro_id::TEXT
          )
      )
    LIMIT 1;
    IF conflito IS NOT NULL THEN RETURN conflito; END IF;

    SELECT 'Orador de Discurso Público'
    INTO conflito
    FROM public.agenda_discursos_locais adl
    WHERE adl.data = p_data
      AND adl.orador_local_id = p_membro_id
      AND (p_ignorar_discurso_local_id IS NULL OR adl.id <> p_ignorar_discurso_local_id)
    LIMIT 1;
    IF conflito IS NOT NULL THEN RETURN conflito; END IF;

    SELECT 'Orador em outra congregação'
    INTO conflito
    FROM public.agenda_discursos_fora adf
    WHERE adf.data = p_data
      AND adf.orador_id = p_membro_id
      AND (p_ignorar_discurso_fora_id IS NULL OR adf.id <> p_ignorar_discurso_fora_id)
    LIMIT 1;

    RETURN conflito;
END;
$$;

REVOKE ALL ON FUNCTION public.encontrar_conflito_designacao(DATE, UUID, TEXT, UUID, UUID, UUID) FROM PUBLIC;

CREATE INDEX IF NOT EXISTS designacoes_suporte_data_membro_idx
ON public.designacoes_suporte (data, membro_id);
CREATE INDEX IF NOT EXISTS agenda_discursos_locais_data_orador_idx
ON public.agenda_discursos_locais (data, orador_local_id);
CREATE INDEX IF NOT EXISTS agenda_discursos_fora_data_orador_idx
ON public.agenda_discursos_fora (data, orador_id);

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

    conflito := public.encontrar_conflito_designacao(
        NEW.data, NEW.membro_id, NEW.funcao, NULL, NULL, NULL
    );

    -- PRESIDENTE representa a mesma designacao nas duas telas, quando os IDs coincidem.
    IF NEW.funcao = 'PRESIDENTE' AND conflito = 'Presidente' THEN
        SELECT presidente_id INTO presidente_programacao
        FROM public.programacao_semanal
        WHERE data_reuniao = NEW.data;
        IF presidente_programacao = NEW.membro_id THEN conflito := NULL; END IF;
    END IF;

    IF conflito IS NOT NULL THEN
        RAISE EXCEPTION 'Este membro já está escalado como % para este dia.', conflito
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validar_designacao_suporte_trigger ON public.designacoes_suporte;
CREATE TRIGGER validar_designacao_suporte_trigger
BEFORE INSERT OR UPDATE ON public.designacoes_suporte
FOR EACH ROW EXECUTE FUNCTION public.validar_designacao_suporte();

CREATE OR REPLACE FUNCTION public.validar_discurso_sem_conflito()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    membro_id UUID;
    conflito TEXT;
BEGIN
    IF TG_TABLE_NAME = 'agenda_discursos_locais' THEN
        membro_id := NEW.orador_local_id;
        IF membro_id IS NULL THEN RETURN NEW; END IF;
        conflito := public.encontrar_conflito_designacao(NEW.data, membro_id, NULL, NULL, NEW.id, NULL);
    ELSE
        membro_id := NEW.orador_id;
        conflito := public.encontrar_conflito_designacao(NEW.data, membro_id, NULL, NULL, NULL, NEW.id);
    END IF;

    IF conflito IS NOT NULL THEN
        RAISE EXCEPTION 'Este membro já está escalado como % para este dia.', conflito
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validar_discurso_local_trigger ON public.agenda_discursos_locais;
CREATE TRIGGER validar_discurso_local_trigger
BEFORE INSERT OR UPDATE ON public.agenda_discursos_locais
FOR EACH ROW EXECUTE FUNCTION public.validar_discurso_sem_conflito();

DROP TRIGGER IF EXISTS validar_discurso_fora_trigger ON public.agenda_discursos_fora;
CREATE TRIGGER validar_discurso_fora_trigger
BEFORE INSERT OR UPDATE ON public.agenda_discursos_fora
FOR EACH ROW EXECUTE FUNCTION public.validar_discurso_sem_conflito();

CREATE OR REPLACE FUNCTION public.validar_programacao_sem_conflito()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    designado RECORD;
    conflito TEXT;
    presidente_compartilhado BOOLEAN;
BEGIN
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
        presidente_compartilhado := FALSE;
        IF designado.funcao = 'PRESIDENTE' THEN
            SELECT EXISTS (
                SELECT 1 FROM public.designacoes_suporte ds
                WHERE ds.data = NEW.data_reuniao
                  AND ds.funcao = 'PRESIDENTE'
                  AND ds.membro_id = designado.membro_id
            ) INTO presidente_compartilhado;
        END IF;
        conflito := public.encontrar_conflito_designacao(
            NEW.data_reuniao,
            designado.membro_id,
            CASE WHEN presidente_compartilhado THEN 'PRESIDENTE' ELSE NULL END,
            NEW.id,
            NULL,
            NULL
        );
        IF conflito IS NOT NULL THEN
            RAISE EXCEPTION 'Este membro já está escalado como % para este dia.', conflito
                USING ERRCODE = '23514';
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validar_programacao_trigger ON public.programacao_semanal;
CREATE TRIGGER validar_programacao_trigger
BEFORE INSERT OR UPDATE ON public.programacao_semanal
FOR EACH ROW EXECUTE FUNCTION public.validar_programacao_sem_conflito();

-- Substitui o delete+insert do cliente por uma unica transacao no banco.
CREATE OR REPLACE FUNCTION public.salvar_designacoes_suporte(
    p_data DATE,
    p_programacao_id UUID,
    p_designacoes JSONB,
    p_presidente_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF NOT (
        public.has_role('ADMIN') OR public.has_role('COORDENADOR') OR public.has_role('RQA')
    ) THEN
        RAISE EXCEPTION 'Sem permissão para salvar designações de apoio.' USING ERRCODE = '42501';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(p_data::TEXT, 0));

    DELETE FROM public.designacoes_suporte WHERE data = p_data;

    IF p_programacao_id IS NOT NULL AND p_presidente_id IS NOT NULL THEN
        UPDATE public.programacao_semanal
        SET presidente_id = p_presidente_id
        WHERE id = p_programacao_id AND data_reuniao = p_data;
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

-- updated_at nao depende mais do relogio nem do codigo do navegador.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dados_congregacao_set_updated_at ON public.dados_congregacao;
CREATE TRIGGER dados_congregacao_set_updated_at
BEFORE UPDATE ON public.dados_congregacao
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
