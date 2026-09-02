-- Dados únicos da congregação, usados por relatórios e integrações futuras.
CREATE TABLE IF NOT EXISTS public.dados_congregacao (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    nome TEXT NOT NULL DEFAULT '',
    numero TEXT NOT NULL DEFAULT '',
    circuito TEXT NOT NULL DEFAULT '',
    cep TEXT NOT NULL DEFAULT '',
    endereco TEXT NOT NULL DEFAULT '',
    cidade TEXT NOT NULL DEFAULT '',
    estado TEXT NOT NULL DEFAULT '' CHECK (char_length(estado) <= 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.dados_congregacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dados_congregacao_select" ON public.dados_congregacao;
CREATE POLICY "dados_congregacao_select"
ON public.dados_congregacao FOR SELECT
USING (
    public.has_role('ADMIN')
    OR public.has_role('COORDENADOR')
    OR public.has_role('SECRETARIO')
    OR public.has_role('SUPERINTENDENTE_SERVICO')
    OR public.has_role('RESP_QUINTA')
    OR public.has_role('RESP_SABADO')
    OR public.has_role('RQA')
    OR public.has_role('RT')
);

DROP POLICY IF EXISTS "dados_congregacao_insert" ON public.dados_congregacao;
CREATE POLICY "dados_congregacao_insert"
ON public.dados_congregacao FOR INSERT
WITH CHECK (
    public.has_role('ADMIN')
    OR public.has_role('COORDENADOR')
    OR public.has_role('SECRETARIO')
    OR public.has_role('SUPERINTENDENTE_SERVICO')
    OR public.has_role('RESP_QUINTA')
    OR public.has_role('RESP_SABADO')
    OR public.has_role('RQA')
    OR public.has_role('RT')
);

DROP POLICY IF EXISTS "dados_congregacao_update" ON public.dados_congregacao;
CREATE POLICY "dados_congregacao_update"
ON public.dados_congregacao FOR UPDATE
USING (
    public.has_role('ADMIN')
    OR public.has_role('COORDENADOR')
    OR public.has_role('SECRETARIO')
    OR public.has_role('SUPERINTENDENTE_SERVICO')
    OR public.has_role('RESP_QUINTA')
    OR public.has_role('RESP_SABADO')
    OR public.has_role('RQA')
    OR public.has_role('RT')
)
WITH CHECK (
    public.has_role('ADMIN')
    OR public.has_role('COORDENADOR')
    OR public.has_role('SECRETARIO')
    OR public.has_role('SUPERINTENDENTE_SERVICO')
    OR public.has_role('RESP_QUINTA')
    OR public.has_role('RESP_SABADO')
    OR public.has_role('RQA')
    OR public.has_role('RT')
);
