ALTER TABLE public.visita_config
ADD COLUMN IF NOT EXISTS dirigente_sentinela_fim_semana_id UUID REFERENCES public.membros(id),
ADD COLUMN IF NOT EXISTS weekend_discurso_final_tema TEXT;
