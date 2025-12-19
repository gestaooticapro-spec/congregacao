DO $$
BEGIN
    -- Add is_leitor_estudo_biblico
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membros' AND column_name = 'is_leitor_estudo_biblico') THEN
        ALTER TABLE membros ADD COLUMN is_leitor_estudo_biblico BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add is_parte_vida_ministerio (Life and Ministry Parts)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membros' AND column_name = 'is_parte_vida_ministerio') THEN
        ALTER TABLE membros ADD COLUMN is_parte_vida_ministerio BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add is_ajudante (Assistant)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membros' AND column_name = 'is_ajudante') THEN
        ALTER TABLE membros ADD COLUMN is_ajudante BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
