-- Mantém a constraint alinhada com as funções usadas pela aplicação.
alter table public.designacoes_suporte
drop constraint if exists designacoes_suporte_funcao_check;

alter table public.designacoes_suporte
add constraint designacoes_suporte_funcao_check
check (funcao in (
    'SOM',
    'MICROFONE_1',
    'MICROFONE_2',
    'INDICADOR_ENTRADA',
    'INDICADOR_AUDITORIO',
    'VIDEO',
    'PRESIDENTE',
    'LEITOR_SENTINELA'
));
