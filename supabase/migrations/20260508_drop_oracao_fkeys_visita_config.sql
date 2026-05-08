ALTER TABLE public.visita_config
  DROP CONSTRAINT IF EXISTS visita_config_oracao_final_meio_semana_id_fkey,
  DROP CONSTRAINT IF EXISTS visita_config_oracao_inicial_fim_semana_id_fkey,
  DROP CONSTRAINT IF EXISTS visita_config_oracao_final_fim_semana_id_fkey;
