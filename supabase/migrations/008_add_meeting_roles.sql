DO $$
BEGIN
    -- Add presidente_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programacao_semanal' AND column_name = 'presidente_id') THEN
        ALTER TABLE programacao_semanal ADD COLUMN presidente_id UUID REFERENCES membros(id);
    END IF;

    -- Add oracao_inicial_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programacao_semanal' AND column_name = 'oracao_inicial_id') THEN
        ALTER TABLE programacao_semanal ADD COLUMN oracao_inicial_id UUID REFERENCES membros(id);
    END IF;

    -- Add oracao_final_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'programacao_semanal' AND column_name = 'oracao_final_id') THEN
        ALTER TABLE programacao_semanal ADD COLUMN oracao_final_id UUID REFERENCES membros(id);
    END IF;
END $$;
