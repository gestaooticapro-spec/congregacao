-- Coordenador has the same access as ADMIN.

DROP POLICY IF EXISTS "Enable insert for admin users" ON public.membro_perfis;
DROP POLICY IF EXISTS "Enable update for admin users" ON public.membro_perfis;
DROP POLICY IF EXISTS "Enable delete for admin users" ON public.membro_perfis;

CREATE POLICY "Enable insert for admin users"
ON public.membro_perfis FOR INSERT
WITH CHECK (public.has_role('ADMIN') OR public.has_role('COORDENADOR'));

CREATE POLICY "Enable update for admin users"
ON public.membro_perfis FOR UPDATE
USING (public.has_role('ADMIN') OR public.has_role('COORDENADOR'));

CREATE POLICY "Enable delete for admin users"
ON public.membro_perfis FOR DELETE
USING (public.has_role('ADMIN') OR public.has_role('COORDENADOR'));

DROP POLICY IF EXISTS "horarios_campo_insert_policy" ON public.horarios_campo;
DROP POLICY IF EXISTS "horarios_campo_update_policy" ON public.horarios_campo;
DROP POLICY IF EXISTS "horarios_campo_delete_policy" ON public.horarios_campo;

CREATE POLICY "horarios_campo_insert_policy"
ON public.horarios_campo FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.membro_perfis mp
        JOIN public.membros m ON m.id = mp.membro_id
        WHERE m.user_id = auth.uid()
        AND mp.perfil IN ('ADMIN', 'COORDENADOR', 'SUPERINTENDENTE_SERVICO')
    )
);

CREATE POLICY "horarios_campo_update_policy"
ON public.horarios_campo FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM public.membro_perfis mp
        JOIN public.membros m ON m.id = mp.membro_id
        WHERE m.user_id = auth.uid()
        AND mp.perfil IN ('ADMIN', 'COORDENADOR', 'SUPERINTENDENTE_SERVICO')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.membro_perfis mp
        JOIN public.membros m ON m.id = mp.membro_id
        WHERE m.user_id = auth.uid()
        AND mp.perfil IN ('ADMIN', 'COORDENADOR', 'SUPERINTENDENTE_SERVICO')
    )
);

CREATE POLICY "horarios_campo_delete_policy"
ON public.horarios_campo FOR DELETE
USING (
    EXISTS (
        SELECT 1
        FROM public.membro_perfis mp
        JOIN public.membros m ON m.id = mp.membro_id
        WHERE m.user_id = auth.uid()
        AND mp.perfil IN ('ADMIN', 'COORDENADOR', 'SUPERINTENDENTE_SERVICO')
    )
);

DROP POLICY IF EXISTS "Enable insert for authenticated users with role" ON public.visita_config;
DROP POLICY IF EXISTS "Enable update for authenticated users with role" ON public.visita_config;
DROP POLICY IF EXISTS "Enable delete for authenticated users with role" ON public.visita_config;

CREATE POLICY "Enable insert for authenticated users with role" ON public.visita_config FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.membro_perfis
        WHERE membro_id = (SELECT id FROM public.membros WHERE user_id = auth.uid() LIMIT 1)
        AND perfil IN ('ADMIN', 'COORDENADOR', 'RQA', 'SUPERINTENDENTE_SERVICO', 'SECRETARIO', 'RESP_QUINTA')
    )
);

CREATE POLICY "Enable update for authenticated users with role" ON public.visita_config FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.membro_perfis
        WHERE membro_id = (SELECT id FROM public.membros WHERE user_id = auth.uid() LIMIT 1)
        AND perfil IN ('ADMIN', 'COORDENADOR', 'RQA', 'SUPERINTENDENTE_SERVICO', 'SECRETARIO', 'RESP_QUINTA')
    )
);

CREATE POLICY "Enable delete for authenticated users with role" ON public.visita_config FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.membro_perfis
        WHERE membro_id = (SELECT id FROM public.membros WHERE user_id = auth.uid() LIMIT 1)
        AND perfil IN ('ADMIN', 'COORDENADOR', 'RQA', 'SUPERINTENDENTE_SERVICO', 'SECRETARIO', 'RESP_QUINTA')
    )
);

DROP POLICY IF EXISTS "Enable insert for authenticated users with role" ON public.eventos;
DROP POLICY IF EXISTS "Enable update for authenticated users with role" ON public.eventos;
DROP POLICY IF EXISTS "Enable delete for authenticated users with role" ON public.eventos;

CREATE POLICY "Enable insert for authenticated users with role" ON public.eventos FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.membro_perfis mp
        JOIN public.membros m ON m.id = mp.membro_id
        WHERE m.user_id = auth.uid()
        AND mp.perfil IN ('ADMIN', 'COORDENADOR', 'RQA', 'SUPERINTENDENTE_SERVICO')
    )
);

CREATE POLICY "Enable update for authenticated users with role" ON public.eventos FOR UPDATE USING (
    EXISTS (
        SELECT 1
        FROM public.membro_perfis mp
        JOIN public.membros m ON m.id = mp.membro_id
        WHERE m.user_id = auth.uid()
        AND mp.perfil IN ('ADMIN', 'COORDENADOR', 'RQA', 'SUPERINTENDENTE_SERVICO')
    )
);

CREATE POLICY "Enable delete for authenticated users with role" ON public.eventos FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM public.membro_perfis mp
        JOIN public.membros m ON m.id = mp.membro_id
        WHERE m.user_id = auth.uid()
        AND mp.perfil IN ('ADMIN', 'COORDENADOR', 'RQA', 'SUPERINTENDENTE_SERVICO')
    )
);

DROP POLICY IF EXISTS "Enable insert for authenticated users with role" ON public.designacoes_suporte;
DROP POLICY IF EXISTS "Enable update for authenticated users with role" ON public.designacoes_suporte;
DROP POLICY IF EXISTS "Enable delete for authenticated users with role" ON public.designacoes_suporte;

CREATE POLICY "Enable insert for authenticated users with role"
ON public.designacoes_suporte FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.membro_perfis mp
        JOIN public.membros m ON m.id = mp.membro_id
        WHERE m.user_id = auth.uid()
        AND mp.perfil IN ('ADMIN', 'COORDENADOR', 'RQA', 'SUPERINTENDENTE_SERVICO')
    )
);

CREATE POLICY "Enable update for authenticated users with role"
ON public.designacoes_suporte FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM public.membro_perfis mp
        JOIN public.membros m ON m.id = mp.membro_id
        WHERE m.user_id = auth.uid()
        AND mp.perfil IN ('ADMIN', 'COORDENADOR', 'RQA', 'SUPERINTENDENTE_SERVICO')
    )
);

CREATE POLICY "Enable delete for authenticated users with role"
ON public.designacoes_suporte FOR DELETE
USING (
    EXISTS (
        SELECT 1
        FROM public.membro_perfis mp
        JOIN public.membros m ON m.id = mp.membro_id
        WHERE m.user_id = auth.uid()
        AND mp.perfil IN ('ADMIN', 'COORDENADOR', 'RQA', 'SUPERINTENDENTE_SERVICO')
    )
);
