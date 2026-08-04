ALTER TABLE public.membros
  ADD COLUMN IF NOT EXISTS pioneiro_onboarding_concluido BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS inicio_pioneiro_ano_servico JSONB NOT NULL DEFAULT '{}'::jsonb;
