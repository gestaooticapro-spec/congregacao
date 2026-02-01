-- Add RT role to perfil_acesso enum
ALTER TYPE perfil_acesso ADD VALUE IF NOT EXISTS 'RT';
