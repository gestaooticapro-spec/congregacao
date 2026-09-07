-- Discursos especiais (início de ano e campanha) sem número oficial, identificados pelo ano.

ALTER TABLE public.temas
    ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'NUMERADO';

ALTER TABLE public.temas
    ADD COLUMN IF NOT EXISTS ano INTEGER;

ALTER TABLE public.temas
    DROP CONSTRAINT IF EXISTS temas_tipo_check;

ALTER TABLE public.temas
    ADD CONSTRAINT temas_tipo_check CHECK (tipo IN ('NUMERADO', 'ESPECIAL', 'CAMPANHA'));

ALTER TABLE public.temas
    ALTER COLUMN numero DROP NOT NULL;

ALTER TABLE public.temas
    DROP CONSTRAINT IF EXISTS temas_numero_key;

DROP INDEX IF EXISTS temas_numero_key;

CREATE UNIQUE INDEX IF NOT EXISTS temas_numero_unico
    ON public.temas (numero)
    WHERE numero IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS temas_especial_tipo_ano_unico
    ON public.temas (tipo, ano)
    WHERE tipo IN ('ESPECIAL', 'CAMPANHA');

ALTER TABLE public.temas
    DROP CONSTRAINT IF EXISTS temas_numero_tipo_consistente;

ALTER TABLE public.temas
    ADD CONSTRAINT temas_numero_tipo_consistente CHECK (
        (tipo = 'NUMERADO' AND numero IS NOT NULL AND ano IS NULL)
        OR (tipo IN ('ESPECIAL', 'CAMPANHA') AND numero IS NULL AND ano IS NOT NULL)
    );

COMMENT ON COLUMN public.temas.tipo IS 'NUMERADO usa o número oficial do esboço; ESPECIAL é o discurso especial do início do ano; CAMPANHA é o discurso especial da campanha de pregação.';
COMMENT ON COLUMN public.temas.ano IS 'Ano do discurso especial. Obrigatório para ESPECIAL e CAMPANHA; nulo nos numerados.';
