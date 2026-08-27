-- Consulta e envio do relatório usando a sessão criada pela escolha do nome na Home.
CREATE OR REPLACE FUNCTION public.verificar_relatorio_viamembro(
  p_membro_id UUID,
  p_mes DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.relatorios_servico r
    INNER JOIN public.membros m ON m.id = r.membro_id
    WHERE m.id = p_membro_id
      AND m.ativo = true
      AND r.mes = p_mes
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.verificar_relatorio_viamembro(UUID, DATE) TO anon, authenticated;

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
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.membros
    WHERE id = p_membro_id AND ativo = true
  ) THEN
    RAISE EXCEPTION 'Membro inválido ou inativo';
  END IF;

  INSERT INTO public.relatorios_servico (
    membro_id, mes, horas, estudos, trabalhou, is_pioneiro_auxiliar, horas_abono
  )
  VALUES (
    p_membro_id, p_mes::date, p_horas, p_estudos, p_trabalhou,
    p_is_pioneiro_auxiliar, p_horas_abono
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
