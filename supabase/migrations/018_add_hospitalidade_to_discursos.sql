-- Add hospitalidade_id to agenda_discursos_locais
ALTER TABLE agenda_discursos_locais
ADD COLUMN hospitalidade_id UUID REFERENCES membros(id);

-- Add comment
COMMENT ON COLUMN agenda_discursos_locais.hospitalidade_id IS 'Member responsible for hospitality (Lanche) for the visiting speaker';
