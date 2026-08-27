-- Add 'responsavel_id' to 'territorios' table
ALTER TABLE territorios ADD COLUMN responsavel_id UUID REFERENCES membros(id);

-- Add 'responsavel_id' to 'historico_conclusao' table
ALTER TABLE historico_conclusao ADD COLUMN responsavel_id UUID REFERENCES membros(id);
