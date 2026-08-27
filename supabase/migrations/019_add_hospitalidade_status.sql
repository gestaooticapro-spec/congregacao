-- Add hospitalidade_status to agenda_discursos_locais
ALTER TABLE agenda_discursos_locais
ADD COLUMN hospitalidade_status TEXT DEFAULT 'pending';

-- Add comment
COMMENT ON COLUMN agenda_discursos_locais.hospitalidade_status IS 'Status of the hospitality assignment (pending, accepted, declined)';
