-- Registra exceções e histórico de estudos semanais sem duplicar o estudo base.
CREATE TABLE IF NOT EXISTS public.pioneiro_ocorrencias_estudo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id UUID NOT NULL REFERENCES public.pioneiro_atividades(id) ON DELETE CASCADE,
  data_original DATE NOT NULL,
  data_agendada DATE,
  status TEXT NOT NULL CHECK (status IN ('REALIZADO', 'PULADO', 'REMARCADO')),
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(atividade_id, data_original)
);

CREATE INDEX IF NOT EXISTS pioneiro_ocorrencias_estudo_atividade_data_idx
  ON public.pioneiro_ocorrencias_estudo(atividade_id, data_original);

ALTER TABLE public.pioneiro_ocorrencias_estudo ENABLE ROW LEVEL SECURITY;

-- Estados necessários para pausar ou encerrar um estudo sem apagar seu histórico.
ALTER TABLE public.pioneiro_atividades
  DROP CONSTRAINT IF EXISTS pioneiro_atividades_status_check;

ALTER TABLE public.pioneiro_atividades
  ADD CONSTRAINT pioneiro_atividades_status_check
  CHECK (status IN ('ATIVA', 'PAUSADA', 'CONCLUIDA', 'CANCELADA', 'AGUARDANDO_TRANSFERENCIA'));

-- Permite avisar o remetente uma única vez quando uma transferência é recusada.
ALTER TABLE public.pioneiro_transferencias
  ADD COLUMN IF NOT EXISTS visto_remetente_em TIMESTAMPTZ;

-- Acesso exclusivo pelas rotas do servidor, após validação do PIN do pioneiro.
