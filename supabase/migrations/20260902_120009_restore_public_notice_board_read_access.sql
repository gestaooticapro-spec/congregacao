-- O Quadro de Anuncios e suas telas de relatorio sao publicos. A migration
-- 120004 restringiu essas fontes a `authenticated`, fazendo o quadro falhar
-- para quem ainda nao entrou com uma conta Supabase.
--
-- Esta correcao devolve somente a leitura dos dados exibidos no quadro. PINs,
-- perfis, ministerio e qualquer alteracao continuam protegidos.

DO $$
DECLARE
    target_table TEXT;
BEGIN
    FOREACH target_table IN ARRAY ARRAY[
        'programacao_semanal',
        'designacoes_suporte',
        'escalas_campo',
        'escala_limpeza',
        'grupos_servico',
        'temas',
        'oradores_visitantes',
        'agenda_discursos_locais',
        'agenda_discursos_fora',
        'visita_config',
        'colaboradores_externos'
    ]
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target_table || '_select_anon_quadro', target_table);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT TO anon USING (true)',
            target_table || '_select_anon_quadro', target_table
        );
        EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon', target_table);
    END LOOP;
END;
$$;

-- Os relatorios mostram apenas nome e nome civil dos membros designados.
-- Conceder acesso por coluna evita expor PIN, contato e demais dados pessoais.
ALTER TABLE public.membros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "membros_select_anon_quadro" ON public.membros;
CREATE POLICY "membros_select_anon_quadro"
ON public.membros FOR SELECT TO anon
USING (ativo = TRUE);

REVOKE ALL ON TABLE public.membros FROM anon;
GRANT SELECT (id, nome_completo, nome_civil) ON TABLE public.membros TO anon;
