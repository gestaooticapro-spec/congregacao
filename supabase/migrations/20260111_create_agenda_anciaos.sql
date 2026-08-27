-- Create agenda_anciaos table
create table if not exists agenda_anciaos (
  id uuid default gen_random_uuid() primary key,
  titulo text not null,
  descricao text,
  data_inicio date not null,
  data_fim date,
  tipo text not null check (tipo in ('reuniao', 'anuncio', 'outro')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table agenda_anciaos enable row level security;

-- Create policies
create policy "Anciãos podem ver agenda"
  on agenda_anciaos for select
  using (auth.role() = 'authenticated');

create policy "Anciãos podem criar agenda"
  on agenda_anciaos for insert
  with check (auth.role() = 'authenticated');

create policy "Anciãos podem atualizar agenda"
  on agenda_anciaos for update
  using (auth.role() = 'authenticated');

create policy "Anciãos podem deletar agenda"
  on agenda_anciaos for delete
  using (auth.role() = 'authenticated');
