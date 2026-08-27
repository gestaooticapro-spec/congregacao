-- Add LEITOR_SENTINELA to the allowed values for designacoes_suporte.funcao
-- Note: If it's a text column with a check constraint, we need to drop and recreate the constraint.
-- If it's a native enum, we alter the type. Based on previous context, it seems to be a text column with check constraint or just text.
-- Let's safely try to update the check constraint if it exists.

DO $$
BEGIN
    -- Check if a constraint named 'designacoes_suporte_funcao_check' exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'designacoes_suporte_funcao_check') THEN
        ALTER TABLE designacoes_suporte DROP CONSTRAINT designacoes_suporte_funcao_check;
        ALTER TABLE designacoes_suporte ADD CONSTRAINT designacoes_suporte_funcao_check 
        CHECK (funcao IN ('SOM', 'MICROFONE_1', 'MICROFONE_2', 'INDICADOR_ENTRADA', 'INDICADOR_AUDITORIO', 'VIDEO', 'PRESIDENTE', 'LEITOR_SENTINELA'));
    END IF;
END $$;
