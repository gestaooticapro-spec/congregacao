-- Update RPC function to accept p_horas_abono
CREATE OR REPLACE FUNCTION public.enviar_relatorio_viapin(
    p_pin text, 
    p_mes text, 
    p_horas integer, 
    p_estudos integer, 
    p_trabalhou boolean, 
    p_is_pioneiro_auxiliar boolean,
    p_horas_abono integer DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_membro_id uuid;
BEGIN
  -- 1. Verifica PIN
  SELECT id INTO v_membro_id
  FROM membros
  WHERE pin = p_pin AND ativo = true;

  IF v_membro_id IS NULL THEN
    RAISE EXCEPTION 'PIN inválido ou membro inativo';
  END IF;

  -- 2. Insere ou Atualiza (Upsert) ignorando rls
  INSERT INTO relatorios_servico (
    membro_id, 
    mes, 
    horas, 
    estudos, 
    trabalhou, 
    is_pioneiro_auxiliar,
    horas_abono
  )
  VALUES (
    v_membro_id, 
    p_mes, 
    p_horas, 
    p_estudos, 
    p_trabalhou, 
    p_is_pioneiro_auxiliar,
    p_horas_abono
  )
  ON CONFLICT (membro_id, mes) 
  DO UPDATE SET
    horas = EXCLUDED.horas,
    estudos = EXCLUDED.estudos,
    trabalhou = EXCLUDED.trabalhou,
    is_pioneiro_auxiliar = EXCLUDED.is_pioneiro_auxiliar,
    horas_abono = EXCLUDED.horas_abono,
    atualizado_em = now();

  RETURN true;
END;
$function$;
