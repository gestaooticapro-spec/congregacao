-- Create eventos table
create table if not exists public.eventos (
    id uuid default gen_random_uuid() primary key,
    titulo text not null,
    tipo text not null check (tipo in ('assembleia', 'congresso', 'especial', 'limpeza')),
    data date not null,
    descricao text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.eventos enable row level security;

-- Create policies

-- Allow read access for everyone (public)
create policy "Enable read access for all users"
on public.eventos for select
using (true);

-- Allow write access only for authenticated users with specific roles (Admin, etc.)
-- Assuming we use the same role check as other tables (membro_perfis)
create policy "Enable insert for authenticated users with role"
on public.eventos for insert
with check (
    exists (
        select 1 from public.membro_perfis
        where membro_id = auth.uid()
        and perfil in ('ADMIN', 'RQA', 'SUPERINTENDENTE_SERVICO')
    )
);

create policy "Enable update for authenticated users with role"
on public.eventos for update
using (
    exists (
        select 1 from public.membro_perfis
        where membro_id = auth.uid()
        and perfil in ('ADMIN', 'RQA', 'SUPERINTENDENTE_SERVICO')
    )
);

create policy "Enable delete for authenticated users with role"
on public.eventos for delete
using (
    exists (
        select 1 from public.membro_perfis
        where membro_id = auth.uid()
        and perfil in ('ADMIN', 'RQA', 'SUPERINTENDENTE_SERVICO')
    )
);
