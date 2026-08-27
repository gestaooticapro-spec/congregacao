-- =============================================
-- Criar tabela ministerio_logs para o Painel do Pioneiro
-- =============================================

CREATE TABLE IF NOT EXISTS public.ministerio_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membro_id UUID NOT NULL REFERENCES public.membros(id) ON DELETE CASCADE,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    minutos INTEGER NOT NULL DEFAULT 0,
    categoria TEXT NOT NULL DEFAULT 'CAMPO',
    comentarios TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index para buscas por membro e data
CREATE INDEX IF NOT EXISTS idx_ministerio_logs_membro_id ON public.ministerio_logs(membro_id);
CREATE INDEX IF NOT EXISTS idx_ministerio_logs_data ON public.ministerio_logs(data);
CREATE INDEX IF NOT EXISTS idx_ministerio_logs_active_timer ON public.ministerio_logs(membro_id, end_time) WHERE end_time IS NULL;

-- RLS
ALTER TABLE public.ministerio_logs ENABLE ROW LEVEL SECURITY;

-- Permitir que qualquer usuário autenticado leia e escreva (o filtro por membro_id é feito pela aplicacao via PIN)
CREATE POLICY "ministerio_logs_select" ON public.ministerio_logs FOR SELECT USING (true);
CREATE POLICY "ministerio_logs_insert" ON public.ministerio_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "ministerio_logs_update" ON public.ministerio_logs FOR UPDATE USING (true);
CREATE POLICY "ministerio_logs_delete" ON public.ministerio_logs FOR DELETE USING (true);

-- Permitir acesso anônimo também (já que o sistema usa PIN, não auth)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ministerio_logs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ministerio_logs TO authenticated;
