-- Datas de agenda seguem o fuso da congregacao, nao UTC. Em UTC a virada do
-- dia ocorre aproximadamente as 21h em Sao Paulo, ocultando compromissos da
-- noite antes de ela terminar.

ALTER FUNCTION public.obter_designacoes_publicas_membro(UUID)
SET timezone TO 'America/Sao_Paulo';

-- O registro de ministerio usa uma data civil; seu valor padrao tambem deve
-- ser calculado no mesmo fuso.
ALTER TABLE public.ministerio_logs
ALTER COLUMN data SET DEFAULT ((NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE);
