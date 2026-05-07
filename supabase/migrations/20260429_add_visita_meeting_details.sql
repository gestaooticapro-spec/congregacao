ALTER TABLE public.visita_config 
ADD COLUMN IF NOT EXISTS cantico_inicial_meio_semana TEXT,
ADD COLUMN IF NOT EXISTS cantico_meio_meio_semana TEXT,
ADD COLUMN IF NOT EXISTS cantico_final_meio_semana TEXT,
ADD COLUMN IF NOT EXISTS oracao_final_meio_semana_id UUID REFERENCES public.membros(id),

ADD COLUMN IF NOT EXISTS cantico_inicial_fim_semana TEXT,
ADD COLUMN IF NOT EXISTS cantico_meio_fim_semana TEXT,
ADD COLUMN IF NOT EXISTS cantico_final_fim_semana TEXT,
ADD COLUMN IF NOT EXISTS oracao_inicial_fim_semana_id UUID REFERENCES public.membros(id),
ADD COLUMN IF NOT EXISTS oracao_final_fim_semana_id UUID REFERENCES public.membros(id);
