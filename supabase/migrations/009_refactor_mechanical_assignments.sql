-- Add data column
alter table public.designacoes_suporte add column if not exists data date;

-- Populate data from programacao_semanal for existing records
update public.designacoes_suporte ds
set data = ps.data_reuniao
from public.programacao_semanal ps
where ds.programacao_id = ps.id;

-- Make data not null (assuming all records were linked, if not we might need to handle it, but for now this is safe as previous schema required programacao_id)
alter table public.designacoes_suporte alter column data set not null;

-- Make programacao_id nullable
alter table public.designacoes_suporte alter column programacao_id drop not null;

-- Update check constraint for funcao
alter table public.designacoes_suporte drop constraint if exists designacoes_suporte_funcao_check;
alter table public.designacoes_suporte add constraint designacoes_suporte_funcao_check 
check (funcao in ('SOM', 'MICROFONE_1', 'MICROFONE_2', 'INDICADOR_ENTRADA', 'INDICADOR_AUDITORIO', 'VIDEO', 'PRESIDENTE'));

-- Update unique constraint
-- Dropping the old constraint. The name is likely designacoes_suporte_programacao_id_funcao_key based on standard naming for unique(programacao_id, funcao)
alter table public.designacoes_suporte drop constraint if exists designacoes_suporte_programacao_id_funcao_key;
alter table public.designacoes_suporte add constraint designacoes_suporte_data_funcao_key unique (data, funcao);
