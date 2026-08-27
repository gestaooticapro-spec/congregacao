-- Enable access for anon and authenticated users for public talks tables

-- Temas
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON temas;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON temas;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON temas;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON temas;

CREATE POLICY "Enable read access for all users" ON temas FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON temas FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON temas FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON temas FOR DELETE USING (true);

-- Oradores Visitantes
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON oradores_visitantes;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON oradores_visitantes;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON oradores_visitantes;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON oradores_visitantes;

CREATE POLICY "Enable read access for all users" ON oradores_visitantes FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON oradores_visitantes FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON oradores_visitantes FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON oradores_visitantes FOR DELETE USING (true);

-- Membros Temas
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON membros_temas;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON membros_temas;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON membros_temas;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON membros_temas;

CREATE POLICY "Enable read access for all users" ON membros_temas FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON membros_temas FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON membros_temas FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON membros_temas FOR DELETE USING (true);

-- Agenda Discursos Locais
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON agenda_discursos_locais;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON agenda_discursos_locais;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON agenda_discursos_locais;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON agenda_discursos_locais;

CREATE POLICY "Enable read access for all users" ON agenda_discursos_locais FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON agenda_discursos_locais FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON agenda_discursos_locais FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON agenda_discursos_locais FOR DELETE USING (true);

-- Agenda Discursos Fora
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON agenda_discursos_fora;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON agenda_discursos_fora;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON agenda_discursos_fora;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON agenda_discursos_fora;

CREATE POLICY "Enable read access for all users" ON agenda_discursos_fora FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON agenda_discursos_fora FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON agenda_discursos_fora FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON agenda_discursos_fora FOR DELETE USING (true);
