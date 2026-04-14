-- Add permissive RLS policies to relatorios_servico table for MVP
DROP POLICY IF EXISTS "Enable read access for all users" ON public.relatorios_servico;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.relatorios_servico;

CREATE POLICY "Allow all for authenticated" ON public.relatorios_servico FOR ALL TO authenticated USING (true) WITH CHECK (true);
