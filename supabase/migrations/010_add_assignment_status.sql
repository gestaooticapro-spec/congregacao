alter table programacao_semanal
add column if not exists presidente_status text default 'pending',
add column if not exists oracao_inicial_status text default 'pending',
add column if not exists oracao_final_status text default 'pending';
