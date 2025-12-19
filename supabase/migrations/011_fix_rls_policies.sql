-- Drop existing strict policies
drop policy if exists "Enable read access for all users" on public.designacoes_suporte;
drop policy if exists "Enable insert for authenticated users with role" on public.designacoes_suporte;
drop policy if exists "Enable update for authenticated users with role" on public.designacoes_suporte;
drop policy if exists "Enable delete for authenticated users with role" on public.designacoes_suporte;

-- Create permissive policy for designacoes_suporte
create policy "Enable all access for all users"
on public.designacoes_suporte
for all
using (true)
with check (true);

-- Ensure programacao_semanal is also writable if not already
-- (Assuming 004 handled it, but adding here to be safe since we update it for Presidente)
drop policy if exists "Enable all access for all users" on public.programacao_semanal;
create policy "Enable all access for all users"
on public.programacao_semanal
for all
using (true)
with check (true);
