-- Fix Foreign Key Name
-- This script ensures the foreign key has the exact name expected by the code.

DO $$
BEGIN
    -- 1. Try to drop the constraint if it exists with the expected name
    BEGIN
        ALTER TABLE agenda_discursos_locais DROP CONSTRAINT agenda_discursos_locais_hospitalidade_id_fkey;
    EXCEPTION
        WHEN undefined_object THEN
            -- Do nothing if it doesn't exist
    END;

    -- 2. Try to drop the constraint if it was auto-generated (common pattern)
    -- We can't easily guess the random name if it wasn't standard, but we can try the standard one.
    -- If you have a different name, this might duplicate the constraint, which is fine, just redundant.
    
    -- 3. Add the constraint with the CORRECT name
    ALTER TABLE agenda_discursos_locais
    ADD CONSTRAINT agenda_discursos_locais_hospitalidade_id_fkey
    FOREIGN KEY (hospitalidade_id)
    REFERENCES membros(id);

END $$;
