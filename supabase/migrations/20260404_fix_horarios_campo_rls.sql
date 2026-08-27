-- Fix horarios_campo RLS so authenticated admins and service overseers can manage records.

DROP POLICY IF EXISTS "horarios_campo_select_policy" ON public.horarios_campo;
DROP POLICY IF EXISTS "horarios_campo_all_policy" ON public.horarios_campo;
DROP POLICY IF EXISTS "horarios_campo_insert_policy" ON public.horarios_campo;
DROP POLICY IF EXISTS "horarios_campo_update_policy" ON public.horarios_campo;
DROP POLICY IF EXISTS "horarios_campo_delete_policy" ON public.horarios_campo;

CREATE POLICY "horarios_campo_select_policy"
ON public.horarios_campo FOR SELECT
USING (true);

CREATE POLICY "horarios_campo_insert_policy"
ON public.horarios_campo FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.membro_perfis mp
        JOIN public.membros m ON m.id = mp.membro_id
        WHERE m.user_id = auth.uid()
        AND mp.perfil IN ('ADMIN', 'SUPERINTENDENTE_SERVICO')
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
        AND mp.perfil IN ('ADMIN', 'SUPERINTENDENTE_SERVICO')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.membro_perfis mp
        JOIN public.membros m ON m.id = mp.membro_id
        WHERE m.user_id = auth.uid()
        AND mp.perfil IN ('ADMIN', 'SUPERINTENDENTE_SERVICO')
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
        AND mp.perfil IN ('ADMIN', 'SUPERINTENDENTE_SERVICO')
    )
);
