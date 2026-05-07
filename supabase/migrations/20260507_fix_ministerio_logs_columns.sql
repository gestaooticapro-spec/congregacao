-- =============================================
-- Fix: Adicionar colunas faltantes em ministerio_logs
-- A tabela foi criada antes de comentarios/start_time/end_time
-- serem adicionados ao script de criação.
-- =============================================

ALTER TABLE public.ministerio_logs
    ADD COLUMN IF NOT EXISTS comentarios TEXT;

ALTER TABLE public.ministerio_logs
    ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;

ALTER TABLE public.ministerio_logs
    ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
