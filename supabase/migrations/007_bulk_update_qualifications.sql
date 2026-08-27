-- Update all existing members to have these qualifications
UPDATE membros
SET 
    is_parte_vida_ministerio = TRUE,
    is_ajudante = TRUE;
