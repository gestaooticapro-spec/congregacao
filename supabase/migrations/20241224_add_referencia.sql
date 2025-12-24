-- Add referencia column to territorios table
alter table public.territorios
add column if not exists referencia text;
