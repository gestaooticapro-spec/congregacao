-- Drop existing policies
drop policy if exists "Enable insert for authenticated users with role" on public.eventos;
drop policy if exists "Enable update for authenticated users with role" on public.eventos;
drop policy if exists "Enable delete for authenticated users with role" on public.eventos;

-- Create corrected policies using the correct join between auth.uid() -> membros -> membro_perfis

-- INSERT
create policy "Enable insert for authenticated users with role" on public.eventos for insert with check (
    exists (
        select 1 
        from public.membro_perfis mp
        join public.membros m on m.id = mp.membro_id
        where m.user_id = auth.uid() 
        and mp.perfil in ('ADMIN', 'RQA', 'SUPERINTENDENTE_SERVICO')
    )
);

-- UPDATE
create policy "Enable update for authenticated users with role" on public.eventos for update using (
    exists (
        select 1 
        from public.membro_perfis mp
        join public.membros m on m.id = mp.membro_id
        where m.user_id = auth.uid() 
        and mp.perfil in ('ADMIN', 'RQA', 'SUPERINTENDENTE_SERVICO')
    )
);

-- DELETE
create policy "Enable delete for authenticated users with role" on public.eventos for delete using (
    exists (
        select 1 
        from public.membro_perfis mp
        join public.membros m on m.id = mp.membro_id
        where m.user_id = auth.uid() 
        and mp.perfil in ('ADMIN', 'RQA', 'SUPERINTENDENTE_SERVICO')
    )
);
