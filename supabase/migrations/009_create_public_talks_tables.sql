-- Create 'temas' table
CREATE TABLE IF NOT EXISTS temas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero INTEGER UNIQUE NOT NULL,
    titulo TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create 'oradores_visitantes' table
CREATE TABLE IF NOT EXISTS oradores_visitantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    congregacao TEXT NOT NULL,
    cidade TEXT NOT NULL,
    telefone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create 'membros_temas' table (Many-to-Many)
CREATE TABLE IF NOT EXISTS membros_temas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membro_id UUID NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    tema_id UUID NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(membro_id, tema_id)
);

-- Create 'agenda_discursos_locais' table
CREATE TABLE IF NOT EXISTS agenda_discursos_locais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    orador_local_id UUID REFERENCES membros(id) ON DELETE SET NULL,
    orador_visitante_id UUID REFERENCES oradores_visitantes(id) ON DELETE SET NULL,
    tema_id UUID NOT NULL REFERENCES temas(id) ON DELETE RESTRICT,
    cantico INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CHECK (
        (orador_local_id IS NOT NULL AND orador_visitante_id IS NULL) OR
        (orador_local_id IS NULL AND orador_visitante_id IS NOT NULL)
    )
);

-- Create 'agenda_discursos_fora' table
CREATE TABLE IF NOT EXISTS agenda_discursos_fora (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    orador_id UUID NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    destino_cidade TEXT NOT NULL,
    destino_congregacao TEXT NOT NULL,
    horario TIME NOT NULL,
    tema_id UUID NOT NULL REFERENCES temas(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE temas ENABLE ROW LEVEL SECURITY;
ALTER TABLE oradores_visitantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE membros_temas ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_discursos_locais ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_discursos_fora ENABLE ROW LEVEL SECURITY;

-- Create policies (Allow all authenticated users to read/write for now, similar to other tables)
CREATE POLICY "Enable read access for authenticated users" ON temas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON temas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON temas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete access for authenticated users" ON temas FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON oradores_visitantes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON oradores_visitantes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON oradores_visitantes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete access for authenticated users" ON oradores_visitantes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON membros_temas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON membros_temas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON membros_temas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete access for authenticated users" ON membros_temas FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON agenda_discursos_locais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON agenda_discursos_locais FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON agenda_discursos_locais FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete access for authenticated users" ON agenda_discursos_locais FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users" ON agenda_discursos_fora FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON agenda_discursos_fora FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON agenda_discursos_fora FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete access for authenticated users" ON agenda_discursos_fora FOR DELETE TO authenticated USING (true);
