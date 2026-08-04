-- Agenda privada dos pioneiros: planejamento, revisitas e futuros estudos.
CREATE TABLE IF NOT EXISTS public.pioneiro_atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_por_id UUID NOT NULL REFERENCES public.membros(id) ON DELETE CASCADE,
  responsavel_id UUID NOT NULL REFERENCES public.membros(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('PLANEJAMENTO', 'REVISITA', 'ESTUDO')),
  status TEXT NOT NULL DEFAULT 'ATIVA' CHECK (status IN ('ATIVA', 'CONCLUIDA', 'CANCELADA', 'AGUARDANDO_TRANSFERENCIA')),
  titulo TEXT,
  pessoa_nome TEXT,
  telefone TEXT,
  observacoes TEXT,
  publicacao TEXT,
  textos_biblicos JSONB NOT NULL DEFAULT '[]'::jsonb,
  etiquetas JSONB NOT NULL DEFAULT '[]'::jsonb,
  pergunta_proxima_visita TEXT,
  data_agendada DATE NOT NULL,
  hora_agendada TIME,
  tipo_agendamento TEXT CHECK (tipo_agendamento IN ('COMBINADO', 'PLANEJADO')),
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  referencia TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  recorrencia_semanal BOOLEAN NOT NULL DEFAULT FALSE,
  origem_revisita_id UUID REFERENCES public.pioneiro_atividades(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pioneiro_atividades_responsavel_data_idx
  ON public.pioneiro_atividades(responsavel_id, data_agendada);

CREATE TABLE IF NOT EXISTS public.pioneiro_transferencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id UUID NOT NULL REFERENCES public.pioneiro_atividades(id) ON DELETE CASCADE,
  remetente_id UUID NOT NULL REFERENCES public.membros(id) ON DELETE CASCADE,
  destinatario_id UUID NOT NULL REFERENCES public.membros(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'ACEITA', 'RECUSADA')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  respondido_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS pioneiro_transferencias_destinatario_status_idx
  ON public.pioneiro_transferencias(destinatario_id, status);

CREATE TABLE IF NOT EXISTS public.pioneiro_atividade_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id UUID NOT NULL REFERENCES public.pioneiro_atividades(id) ON DELETE CASCADE,
  membro_id UUID REFERENCES public.membros(id) ON DELETE SET NULL,
  evento TEXT NOT NULL,
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pioneiro_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pioneiro_transferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pioneiro_atividade_historico ENABLE ROW LEVEL SECURITY;

-- O acesso acontece somente pelas rotas do servidor, que validam o PIN do pioneiro.
