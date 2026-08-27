-- Rename data to data_inicio
alter table public.eventos rename column data to data_inicio;

-- Add data_fim column
alter table public.eventos add column data_fim date;

-- Update data_fim to match data_inicio for existing records
update public.eventos set data_fim = data_inicio;

-- Make data_fim not null
alter table public.eventos alter column data_fim set not null;

-- Update check constraint for tipo
alter table public.eventos drop constraint if exists eventos_tipo_check;
alter table public.eventos add constraint eventos_tipo_check 
check (tipo in ('assembleia', 'congresso', 'especial', 'limpeza', 'visita'));
