create table if not exists escala_limpeza (
  id uuid default gen_random_uuid() primary key,
  data_inicio date not null unique, -- Monday of the week
  grupo_id uuid references grupos_servico(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table escala_limpeza enable row level security;

create policy "Enable read access for all authenticated users"
on escala_limpeza for select
to authenticated
using (true);

create policy "Enable insert access for all authenticated users"
on escala_limpeza for insert
to authenticated
with check (true);

create policy "Enable update access for all authenticated users"
on escala_limpeza for update
to authenticated
using (true);

create policy "Enable delete access for all authenticated users"
on escala_limpeza for delete
to authenticated
using (true);
