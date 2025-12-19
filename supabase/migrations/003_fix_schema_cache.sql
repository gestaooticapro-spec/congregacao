DO $$
BEGIN
    -- Add semana_descricao if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programacao_semanal' AND column_name = 'semana_descricao') THEN
        ALTER TABLE programacao_semanal ADD COLUMN semana_descricao TEXT NOT NULL DEFAULT '';
        ALTER TABLE programacao_semanal ALTER COLUMN semana_descricao DROP DEFAULT;
    END IF;

    -- Add partes if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programacao_semanal' AND column_name = 'partes') THEN
        ALTER TABLE programacao_semanal ADD COLUMN partes JSONB;
    END IF;

    -- Add temas_tesouros if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programacao_semanal' AND column_name = 'temas_tesouros') THEN
        ALTER TABLE programacao_semanal ADD COLUMN temas_tesouros TEXT;
    END IF;

    -- Drop canticos if exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programacao_semanal' AND column_name = 'canticos') THEN
        ALTER TABLE programacao_semanal DROP COLUMN canticos;
    END IF;
END $$;
