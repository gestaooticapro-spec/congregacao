create table if not exists historico_designacoes (
    id uuid default gen_random_uuid() primary key,
    membro_id uuid references membros(id) not null,
    programacao_id uuid references programacao_semanal(id) not null,
    data_reuniao date not null,
    parte_descricao text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for faster lookups
create index if not exists idx_historico_membro_data on historico_designacoes(membro_id, data_reuniao);
