-- Registra a quantidade de presentes em cada reunião.
CREATE TABLE IF NOT EXISTS public.assistencias_reunioes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_reuniao DATE NOT NULL,
    tipo_reuniao TEXT NOT NULL CHECK (tipo_reuniao IN ('MEIO_SEMANA', 'FIM_SEMANA')),
    quantidade INTEGER NOT NULL CHECK (quantidade >= 0),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT assistencias_reunioes_data_tipo_key UNIQUE (data_reuniao, tipo_reuniao)
);

CREATE INDEX IF NOT EXISTS assistencias_reunioes_data_idx
    ON public.assistencias_reunioes (data_reuniao);

ALTER TABLE public.assistencias_reunioes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Assistencias podem ser consultadas por todos" ON public.assistencias_reunioes;
CREATE POLICY "Assistencias podem ser consultadas por todos"
    ON public.assistencias_reunioes FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Assistencias podem ser informadas por todos" ON public.assistencias_reunioes;
CREATE POLICY "Assistencias podem ser informadas por todos"
    ON public.assistencias_reunioes FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Assistencias podem ser atualizadas por todos" ON public.assistencias_reunioes;
CREATE POLICY "Assistencias podem ser atualizadas por todos"
    ON public.assistencias_reunioes FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.assistencias_reunioes TO anon, authenticated;
