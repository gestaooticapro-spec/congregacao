-- Add territorio_pessoal column to distinguish personal vs congregation territories
ALTER TABLE public.territorios
ADD COLUMN IF NOT EXISTS territorio_pessoal boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.territorios.territorio_pessoal IS 'Indica se o território foi marcado como pessoal pelo responsável';

GRANT SELECT, INSERT, UPDATE ON public.territorios TO anon, authenticated;
