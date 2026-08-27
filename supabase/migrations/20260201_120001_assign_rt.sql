-- Assign RT role to Luiz
-- Handles the case where 'RT' might not be visible to the parser yet by using text casting for checks.

DO $$
DECLARE
    v_membro_id uuid;
    v_rt_exists boolean;
BEGIN
    -- 1. Verify if 'RT' exists in the enum to avoid hard crash
    SELECT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'perfil_acesso' AND e.enumlabel = 'RT'
    ) INTO v_rt_exists;

    IF NOT v_rt_exists THEN
        RAISE EXCEPTION 'Enum value "RT" does not exist in perfil_acesso. Please run the add_rt_role migration first.';
    END IF;

    -- 2. Find Luiz
    SELECT id INTO v_membro_id 
    FROM membros 
    WHERE nome_completo ILIKE '%Luiz%' 
    LIMIT 1;

    IF v_membro_id IS NOT NULL THEN
        -- 3. Insert if not exists (using cast to avoid parser issues in the check)
        -- We cast everything to text for the comparison to be safe against early parser validation
        IF NOT EXISTS (
            SELECT 1 FROM membro_perfis 
            WHERE membro_id = v_membro_id 
            AND perfil::text = 'RT'
        ) THEN
            INSERT INTO membro_perfis (membro_id, perfil) VALUES (v_membro_id, 'RT');
            RAISE NOTICE 'Role RT assigned to member %', v_membro_id;
        ELSE
            RAISE NOTICE 'Member % already has RT role', v_membro_id;
        END IF;
    ELSE
        RAISE WARNING 'Member Luiz not found in database.';
    END IF;
END $$;
