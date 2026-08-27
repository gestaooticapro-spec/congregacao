-- Create bucket for territory maps
insert into storage.buckets (id, name, public)
values ('mapas-territorios', 'mapas-territorios', true)
on conflict (id) do nothing;

-- Create policy to allow public access to images
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'mapas-territorios' );

-- Create policy to allow authenticated uploads (adjust as needed for your auth model)
create policy "Authenticated Uploads"
  on storage.objects for insert
  with check ( bucket_id = 'mapas-territorios' AND auth.role() = 'authenticated' );

-- Create territorios table
create table if not exists public.territorios (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  imagem_url text not null,
  configuracao jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create visitas_ativas table
create table if not exists public.visitas_ativas (
  id uuid default gen_random_uuid() primary key,
  territorio_id uuid references public.territorios(id) on delete cascade not null,
  quadra_id integer not null,
  data_marcacao timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(territorio_id, quadra_id)
);

-- Create historico_conclusao table
create table if not exists public.historico_conclusao (
  id uuid default gen_random_uuid() primary key,
  territorio_id uuid references public.territorios(id) on delete cascade not null,
  data_inicio timestamp with time zone, -- Optional, logic might need adjustment to track start
  data_fim timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.territorios enable row level security;
alter table public.visitas_ativas enable row level security;
alter table public.historico_conclusao enable row level security;

-- Policies for territorios (Open for read, restricted for write - adjust as needed)
create policy "Enable read access for all users" on public.territorios for select using (true);
create policy "Enable insert for authenticated users only" on public.territorios for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users only" on public.territorios for update using (auth.role() = 'authenticated');

-- Policies for visitas_ativas (Open for read/write for now - refine for specific users later)
create policy "Enable read access for all users" on public.visitas_ativas for select using (true);
create policy "Enable insert for all users" on public.visitas_ativas for insert with check (true);
create policy "Enable delete for all users" on public.visitas_ativas for delete using (true);

-- Policies for historico_conclusao
create policy "Enable read access for all users" on public.historico_conclusao for select using (true);
create policy "Enable insert for all users" on public.historico_conclusao for insert with check (true);
