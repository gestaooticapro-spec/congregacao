-- Adicionar colunas de pastoreio na tabela membros
ALTER TABLE membros 
  ADD COLUMN IF NOT EXISTS ultima_visita DATE,
  ADD COLUMN IF NOT EXISTS ultima_visita_obs TEXT,
  ADD COLUMN IF NOT EXISTS proxima_visita DATE;
