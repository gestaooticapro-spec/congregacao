ALTER TABLE grupos_servico 
ADD COLUMN superintendente_id UUID REFERENCES membros(id),
ADD COLUMN ajudante_id UUID REFERENCES membros(id);
