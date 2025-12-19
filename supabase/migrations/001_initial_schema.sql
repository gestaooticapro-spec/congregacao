-- 1. ENUMS
CREATE TYPE perfil_acesso AS ENUM (
  'ADMIN',
  'SECRETARIO',
  'SUPERINTENDENTE_SERVICO',
  'RESP_QUINTA',
  'RESP_SABADO',
  'RQA',
  'IRMAO'
);

CREATE TYPE tipo_reuniao AS ENUM (
  'QUINTA',
  'SABADO'
);

-- 2. TABELAS DE CADASTRO

-- Grupos de Serviço
CREATE TABLE grupos_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL
);

-- Membros
CREATE TABLE membros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id), -- Nullable, pois nem todo membro acessa o sistema
  nome_completo TEXT NOT NULL,
  grupo_id UUID REFERENCES grupos_servico(id),
  
  -- Flags booleanas (Qualifications)
  is_anciao BOOLEAN DEFAULT FALSE,
  is_servo_ministerial BOOLEAN DEFAULT FALSE,
  is_publicador BOOLEAN DEFAULT FALSE,
  is_pioneiro BOOLEAN DEFAULT FALSE,
  is_batizado BOOLEAN DEFAULT FALSE,
  is_presidente BOOLEAN DEFAULT FALSE,
  is_leitor_biblia BOOLEAN DEFAULT FALSE,
  is_leitor_sentinela BOOLEAN DEFAULT FALSE,
  is_som BOOLEAN DEFAULT FALSE,
  is_microfone BOOLEAN DEFAULT FALSE,
  is_indicador BOOLEAN DEFAULT FALSE,
  is_balcao BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE SEGURANÇA (RBAC)

-- Membro Perfis (Many-to-Many for Roles)
CREATE TABLE membro_perfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membro_id UUID NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
  perfil perfil_acesso NOT NULL,
  
  CONSTRAINT unique_membro_perfil UNIQUE (membro_id, perfil)
);

-- 4. TABELAS DE REUNIÃO

-- Programação Semanal
CREATE TABLE programacao_semanal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_reuniao DATE NOT NULL UNIQUE,
  semana_descricao TEXT NOT NULL,
  temas_tesouros TEXT,
  canticos JSONB, -- Ex: {"inicial": 1, "meio": 2, "final": 3}
  partes JSONB, -- Lista de partes (Tesouros, Ministério, Vida Cristã)
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partes da Reunião (Template ou Definição das partes)
CREATE TABLE partes_reuniao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_parte TEXT NOT NULL,
  tipo_reuniao tipo_reuniao NOT NULL,
  requisitos JSONB, -- Ex: {"is_anciao": true}
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Designações (Assignments)
CREATE TABLE designacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programacao_id UUID NOT NULL REFERENCES programacao_semanal(id) ON DELETE CASCADE,
  parte_id UUID NOT NULL REFERENCES partes_reuniao(id),
  membro_id UUID NOT NULL REFERENCES membros(id),
  ajudante_id UUID REFERENCES membros(id), -- Nullable
  data DATE NOT NULL, -- Redundante mas útil para queries rápidas, deve bater com programacao_semanal.data_reuniao
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_membros_user_id ON membros(user_id);
CREATE INDEX idx_membro_perfis_membro_id ON membro_perfis(membro_id);
CREATE INDEX idx_designacoes_programacao_id ON designacoes(programacao_id);
CREATE INDEX idx_designacoes_membro_id ON designacoes(membro_id);
CREATE INDEX idx_designacoes_data ON designacoes(data);
