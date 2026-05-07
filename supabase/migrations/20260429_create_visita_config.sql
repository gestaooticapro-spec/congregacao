-- Create visita_config table
CREATE TABLE IF NOT EXISTS public.visita_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    programacao_id UUID NOT NULL REFERENCES public.programacao_semanal(id) ON DELETE CASCADE,
    
    -- General Schedule
    analise_arquivos JSONB, -- { data, hora, local }
    reuniao_terca JSONB, -- { data, hora, local }
    reuniao_ls JSONB, -- { data, hora, local }
    reuniao_pioneiros JSONB, -- { data, hora, local }
    reuniao_anciaos JSONB, -- { data, hora, local }
    
    -- Dynamic Lists
    saidas_campo JSONB DEFAULT '[]'::jsonb, -- [{ id, data, hora, local }]
    pastoreios JSONB DEFAULT '[]'::jsonb, -- [{ id, membro_id, data, hora, local, anciao_id, memo }]
    almocos JSONB DEFAULT '[]'::jsonb, -- [{ id, dia, membro_id }]
    arranjos_estudo JSONB DEFAULT '[]'::jsonb, -- [{ id, nome_tabela, linhas: [{ id, dia, hora, membro_id, estudante, publicacao }] }]
    pauta_anciaos_visita JSONB DEFAULT '[]'::jsonb, -- [{ id, assunto, anciao_id, memo }]
    
    -- Weekend Meeting Extra Info
    weekend_discurso_tema TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(programacao_id)
);

-- RLS
ALTER TABLE public.visita_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.visita_config;
CREATE POLICY "Enable read access for all users" ON public.visita_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users with role" ON public.visita_config;
CREATE POLICY "Enable insert for authenticated users with role" ON public.visita_config FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.membro_perfis
        WHERE membro_id = (SELECT id FROM public.membros WHERE user_id = auth.uid() LIMIT 1)
        AND perfil IN ('ADMIN', 'RQA', 'SUPERINTENDENTE_SERVICO', 'SECRETARIO', 'RESP_QUINTA')
    )
);

DROP POLICY IF EXISTS "Enable update for authenticated users with role" ON public.visita_config;
CREATE POLICY "Enable update for authenticated users with role" ON public.visita_config FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.membro_perfis
        WHERE membro_id = (SELECT id FROM public.membros WHERE user_id = auth.uid() LIMIT 1)
        AND perfil IN ('ADMIN', 'RQA', 'SUPERINTENDENTE_SERVICO', 'SECRETARIO', 'RESP_QUINTA')
    )
);

DROP POLICY IF EXISTS "Enable delete for authenticated users with role" ON public.visita_config;
CREATE POLICY "Enable delete for authenticated users with role" ON public.visita_config FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.membro_perfis
        WHERE membro_id = (SELECT id FROM public.membros WHERE user_id = auth.uid() LIMIT 1)
        AND perfil IN ('ADMIN', 'RQA', 'SUPERINTENDENTE_SERVICO', 'SECRETARIO', 'RESP_QUINTA')
    )
);
