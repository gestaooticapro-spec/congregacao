-- =============================================================
-- Sincronizar is_sg com base em grupos_servico.superintendente_id
--
-- Problema: is_sg é um boolean na tabela membros, mas quem define
-- o superintendente de cada grupo é o campo superintendente_id na
-- tabela grupos_servico. Os dois podem ficar fora de sincronia.
--
-- Esta migration:
--   1. Faz uma sincronização única do estado atual
--   2. Cria um trigger que mantém is_sg atualizado automaticamente
--      sempre que grupos_servico for alterado
-- =============================================================

-- ---------------------------------------------------------------
-- PASSO 1: Sincronização única do estado atual
-- ---------------------------------------------------------------

-- Seta is_sg = true para quem está como superintendente em algum grupo
UPDATE membros
SET is_sg = true
WHERE id IN (
    SELECT superintendente_id
    FROM grupos_servico
    WHERE superintendente_id IS NOT NULL
);

-- Seta is_sg = false para quem NÃO é superintendente de nenhum grupo
-- (mas só se estiver como true para não tocar quem nunca foi alterado)
UPDATE membros
SET is_sg = false
WHERE is_sg = true
  AND id NOT IN (
      SELECT superintendente_id
      FROM grupos_servico
      WHERE superintendente_id IS NOT NULL
  );

-- ---------------------------------------------------------------
-- PASSO 2: Trigger para manter em sincronia automaticamente
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_is_sg_on_grupo_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando um novo superintendente é definido, marca is_sg = true
    IF NEW.superintendente_id IS NOT NULL THEN
        UPDATE membros SET is_sg = true WHERE id = NEW.superintendente_id;
    END IF;

    -- Quando o superintendente anterior é removido/trocado,
    -- verifica se ainda é SG em algum outro grupo antes de desmarcar
    IF OLD.superintendente_id IS NOT NULL AND OLD.superintendente_id IS DISTINCT FROM NEW.superintendente_id THEN
        IF NOT EXISTS (
            SELECT 1 FROM grupos_servico
            WHERE superintendente_id = OLD.superintendente_id
              AND id != OLD.id  -- exclui o próprio grupo que está sendo alterado
        ) THEN
            UPDATE membros SET is_sg = false WHERE id = OLD.superintendente_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove trigger anterior se existir (idempotente)
DROP TRIGGER IF EXISTS trg_sync_is_sg ON grupos_servico;

CREATE TRIGGER trg_sync_is_sg
AFTER INSERT OR UPDATE OF superintendente_id ON grupos_servico
FOR EACH ROW
EXECUTE FUNCTION sync_is_sg_on_grupo_change();
