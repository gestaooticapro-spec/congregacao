-- Create colaboradores_externos table
CREATE TABLE IF NOT EXISTS colaboradores_externos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    contato TEXT,
    funcao TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies (assuming standard admin access)
ALTER TABLE colaboradores_externos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON colaboradores_externos
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for authenticated users" ON colaboradores_externos
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON colaboradores_externos
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON colaboradores_externos
    FOR DELETE
    TO authenticated
    USING (true);
