-- Tabelas que foram substituídas pela lógica JSON em 'programacao_semanal'
DROP TABLE IF EXISTS public.designacoes;
DROP TABLE IF EXISTS public.partes_reuniao;

-- Tabelas legadas ou substituídas por outras implementações
DROP TABLE IF EXISTS public.designacoes_espirituais;
DROP TABLE IF EXISTS public.designacoes_limpeza; -- Substituída por 'escala_limpeza'
DROP TABLE IF EXISTS public.designacoes_mecanicas; -- Substituída por 'designacoes_suporte'
DROP TABLE IF EXISTS public.designacoes_membros;

-- NOTA: A tabela 'indisponibilidades' foi mantida pois é uma feature futura muito provável
-- (gerenciar férias ou viagens de irmãos para não designá-los).
-- Se quiser apagar também, descomente a linha abaixo:
-- DROP TABLE IF EXISTS public.indisponibilidades;
