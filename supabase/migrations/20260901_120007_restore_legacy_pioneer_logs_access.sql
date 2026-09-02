-- Compatibilidade temporaria para a versao atualmente publicada do painel do
-- pioneiro. Ela acessa ministerio_logs diretamente; a interface que usa as
-- RPCs seguras da 120006 ainda esta somente na branch de desenvolvimento.
--
-- Remover estas permissoes quando a versao com as RPCs for publicada.

DROP POLICY IF EXISTS "ministerio_logs_select" ON public.ministerio_logs;
DROP POLICY IF EXISTS "ministerio_logs_insert" ON public.ministerio_logs;
DROP POLICY IF EXISTS "ministerio_logs_update" ON public.ministerio_logs;
DROP POLICY IF EXISTS "ministerio_logs_delete" ON public.ministerio_logs;

CREATE POLICY "ministerio_logs_select"
ON public.ministerio_logs FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "ministerio_logs_insert"
ON public.ministerio_logs FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "ministerio_logs_update"
ON public.ministerio_logs FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "ministerio_logs_delete"
ON public.ministerio_logs FOR DELETE
TO anon, authenticated
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ministerio_logs
TO anon, authenticated;
