-- Add tem_midia column to agenda_discursos_locais
ALTER TABLE agenda_discursos_locais
ADD COLUMN tem_midia BOOLEAN DEFAULT false;
