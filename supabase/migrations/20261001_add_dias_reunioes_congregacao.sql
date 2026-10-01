-- Dias atuais de reuniao: 0 = domingo, 1 = segunda-feira, ..., 6 = sabado.
-- NULL significa que a congregacao ainda nao configurou o dia.
BEGIN;

ALTER TABLE public.dados_congregacao
    ADD COLUMN IF NOT EXISTS dia_reuniao_meio_semana SMALLINT
        CONSTRAINT dados_congregacao_dia_reuniao_meio_semana_check
        CHECK (dia_reuniao_meio_semana BETWEEN 0 AND 6),
    ADD COLUMN IF NOT EXISTS dia_reuniao_fim_semana SMALLINT
        CONSTRAINT dados_congregacao_dia_reuniao_fim_semana_check
        CHECK (dia_reuniao_fim_semana BETWEEN 0 AND 6);

COMMENT ON COLUMN public.dados_congregacao.dia_reuniao_meio_semana
    IS 'Dia atual da reuniao de meio de semana: 0=domingo a 6=sabado. NULL=nao configurado.';
COMMENT ON COLUMN public.dados_congregacao.dia_reuniao_fim_semana
    IS 'Dia atual da reuniao de fim de semana: 0=domingo a 6=sabado. NULL=nao configurado.';

COMMIT;
