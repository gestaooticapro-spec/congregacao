-- Create relatorios_servico table
CREATE TABLE relatorios_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membro_id UUID NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
  mes DATE NOT NULL,
  horas INTEGER,
  estudos INTEGER,
  trabalhou BOOLEAN,
  is_pioneiro_auxiliar BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_membro_mes_relatorio UNIQUE (membro_id, mes)
);

-- RLS policies
ALTER TABLE relatorios_servico ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all reports (we'll restrict UI for group leaders)
CREATE POLICY "Enable read access for all users"
ON public.relatorios_servico FOR SELECT
USING (true);

-- Allow inserting if PIN is valid (this is tricky from the client, so we rely on RPC or allow insert and secure via RPC)
-- Actually, a better approach is to allow anyone to insert a report if they know the PIN, but we do this through a SECURITY DEFINER function
-- Or simply allow insert for anonymous/authenticated, but require an RPC for submission that validates the PIN.

-- Let's use RPC for submission to ensure PIN is validated.
-- So we only allow read access via RLS.
-- Wait, if the frontend uses RLS directly, it needs standard policies.

-- Simple RPC to verify PIN
CREATE OR REPLACE FUNCTION verificar_pin(p_pin TEXT)
RETURNS TABLE (
  id UUID,
  nome_completo TEXT,
  grupo_id UUID,
  is_pioneiro BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.nome_completo,
    m.grupo_id,
    m.is_pioneiro
  FROM membros m
  WHERE m.pin = p_pin AND m.ativo = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants
GRANT SELECT ON public.relatorios_servico TO anon, authenticated;
GRANT ALL ON public.relatorios_servico TO authenticated;
GRANT EXECUTE ON FUNCTION verificar_pin(TEXT) TO anon, authenticated;

-- Function to submit report securely via PIN
CREATE OR REPLACE FUNCTION enviar_relatorio_viapin(
  p_pin TEXT,
  p_mes DATE,
  p_horas INTEGER,
  p_estudos INTEGER,
  p_trabalhou BOOLEAN,
  p_is_pioneiro_auxiliar BOOLEAN
) RETURNS UUID AS $$
DECLARE
  v_membro_id UUID;
  v_relatorio_id UUID;
BEGIN
  -- Verify PIN
  SELECT id INTO v_membro_id FROM membros WHERE pin = p_pin AND ativo = true LIMIT 1;
  
  IF v_membro_id IS NULL THEN
    RAISE EXCEPTION 'PIN inválido ou membro inativo.';
  END IF;

  -- Upsert report
  INSERT INTO relatorios_servico (
    membro_id, 
    mes, 
    horas, 
    estudos, 
    trabalhou, 
    is_pioneiro_auxiliar
  )
  VALUES (
    v_membro_id,
    p_mes,
    p_horas,
    p_estudos,
    p_trabalhou,
    p_is_pioneiro_auxiliar
  )
  ON CONFLICT (membro_id, mes) 
  DO UPDATE SET 
    horas = EXCLUDED.horas,
    estudos = EXCLUDED.estudos,
    trabalhou = EXCLUDED.trabalhou,
    is_pioneiro_auxiliar = EXCLUDED.is_pioneiro_auxiliar;

  SELECT id INTO v_relatorio_id FROM relatorios_servico WHERE membro_id = v_membro_id AND mes = p_mes;
  
  RETURN v_relatorio_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION enviar_relatorio_viapin(TEXT, DATE, INTEGER, INTEGER, BOOLEAN, BOOLEAN) TO anon, authenticated;
