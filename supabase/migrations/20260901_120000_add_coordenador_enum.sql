-- Add COORDENADOR role to perfil_acesso enum
-- Must live in its own migration: a newly added enum value cannot be used
-- in the same transaction (policies that reference it come next).
ALTER TYPE perfil_acesso ADD VALUE IF NOT EXISTS 'COORDENADOR';
