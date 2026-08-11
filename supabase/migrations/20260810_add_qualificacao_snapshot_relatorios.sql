-- Mantém no relatório a qualificação existente no momento do lançamento.
-- Registros anteriores permanecem sem classificação para não reescrever o histórico.
ALTER TABLE public.relatorios_servico
  ADD COLUMN IF NOT EXISTS qualificacao_no_relatorio TEXT
  CHECK (qualificacao_no_relatorio IN ('PUBLICADOR', 'PIONEIRO_REGULAR', 'PIONEIRO_AUXILIAR')),
  ADD COLUMN IF NOT EXISTS membro_ativo_no_relatorio BOOLEAN;

COMMENT ON COLUMN public.relatorios_servico.qualificacao_no_relatorio IS
  'Fotografia da qualificação do membro no momento em que o relatório foi criado.';

COMMENT ON COLUMN public.relatorios_servico.membro_ativo_no_relatorio IS
  'Indica que o membro estava ativo quando este relatório foi criado.';

CREATE OR REPLACE FUNCTION public.enviar_relatorio_viamembro(
  p_membro_id UUID,
  p_mes TEXT,
  p_horas INTEGER,
  p_estudos INTEGER,
  p_trabalhou BOOLEAN,
  p_is_pioneiro_auxiliar BOOLEAN,
  p_horas_abono INTEGER DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_membro_encontrado UUID;
  v_is_pioneiro_regular BOOLEAN;
  v_qualificacao TEXT;
BEGIN
  SELECT id, COALESCE(is_pioneiro, false) INTO v_membro_encontrado, v_is_pioneiro_regular
  FROM public.membros
  WHERE id = p_membro_id AND ativo = true;

  IF v_membro_encontrado IS NULL THEN
    RAISE EXCEPTION 'Membro inválido ou inativo';
  END IF;

  v_qualificacao := CASE
    WHEN v_is_pioneiro_regular THEN 'PIONEIRO_REGULAR'
    WHEN p_is_pioneiro_auxiliar THEN 'PIONEIRO_AUXILIAR'
    ELSE 'PUBLICADOR'
  END;

  INSERT INTO public.relatorios_servico (
    membro_id, mes, horas, estudos, trabalhou, is_pioneiro_auxiliar, horas_abono, qualificacao_no_relatorio, membro_ativo_no_relatorio
  )
  VALUES (
    p_membro_id, p_mes::date, p_horas, p_estudos, p_trabalhou,
    p_is_pioneiro_auxiliar, p_horas_abono, v_qualificacao, true
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

CREATE OR REPLACE FUNCTION public.enviar_relatorio_viapin(
  p_pin TEXT,
  p_mes TEXT,
  p_horas INTEGER,
  p_estudos INTEGER,
  p_trabalhou BOOLEAN,
  p_is_pioneiro_auxiliar BOOLEAN,
  p_horas_abono INTEGER DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_membro_id UUID;
  v_is_pioneiro_regular BOOLEAN;
  v_qualificacao TEXT;
BEGIN
  SELECT id, COALESCE(is_pioneiro, false) INTO v_membro_id, v_is_pioneiro_regular
  FROM public.membros
  WHERE pin = p_pin AND ativo = true;

  IF v_membro_id IS NULL THEN
    RAISE EXCEPTION 'PIN inválido ou membro inativo';
  END IF;

  v_qualificacao := CASE
    WHEN v_is_pioneiro_regular THEN 'PIONEIRO_REGULAR'
    WHEN p_is_pioneiro_auxiliar THEN 'PIONEIRO_AUXILIAR'
    ELSE 'PUBLICADOR'
  END;

  INSERT INTO public.relatorios_servico (
    membro_id, mes, horas, estudos, trabalhou, is_pioneiro_auxiliar, horas_abono, qualificacao_no_relatorio, membro_ativo_no_relatorio
  )
  VALUES (
    v_membro_id, p_mes::date, p_horas, p_estudos, p_trabalhou,
    p_is_pioneiro_auxiliar, p_horas_abono, v_qualificacao, true
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

GRANT EXECUTE ON FUNCTION public.enviar_relatorio_viamembro(UUID, TEXT, INTEGER, INTEGER, BOOLEAN, BOOLEAN, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enviar_relatorio_viapin(TEXT, TEXT, INTEGER, INTEGER, BOOLEAN, BOOLEAN, INTEGER) TO anon, authenticated;
