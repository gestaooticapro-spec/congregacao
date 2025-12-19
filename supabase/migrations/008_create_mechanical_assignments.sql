create table if not exists public.designacoes_suporte (
    id uuid default gen_random_uuid() primary key,
    programacao_id uuid references public.programacao_semanal(id) on delete cascade not null,
    membro_id uuid references public.membros(id) on delete set null,
    funcao text not null check (funcao in ('SOM', 'MICROFONE_1', 'MICROFONE_2', 'INDICADOR_ENTRADA', 'INDICADOR_AUDITORIO', 'VIDEO')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(programacao_id, funcao)
);

-- RLS Policies
alter table public.designacoes_suporte enable row level security;

create policy "Enable read access for all users"
on public.designacoes_suporte for select
using (true);

create policy "Enable insert for authenticated users with role"
on public.designacoes_suporte for insert
with check (
    exists (
        select 1 from public.membro_perfis
        where membro_id = auth.uid()
        and perfil in ('ADMIN', 'RQA', 'SUPERINTENDENTE_SERVICO')
    )
);

create policy "Enable update for authenticated users with role"
on public.designacoes_suporte for update
using (
    exists (
        select 1 from public.membro_perfis
        where membro_id = auth.uid()
        and perfil in ('ADMIN', 'RQA', 'SUPERINTENDENTE_SERVICO')
    )
);

create policy "Enable delete for authenticated users with role"
on public.designacoes_suporte for delete
using (
    exists (
        select 1 from public.membro_perfis
        where membro_id = auth.uid()
        and perfil in ('ADMIN', 'RQA', 'SUPERINTENDENTE_SERVICO')
    )
);
