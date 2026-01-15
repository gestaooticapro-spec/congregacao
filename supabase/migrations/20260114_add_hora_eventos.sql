-- Add hora_inicio column to eventos and agenda_anciaos tables

-- Add hora field to eventos table
ALTER TABLE public.eventos ADD COLUMN IF NOT EXISTS hora_inicio TIME;

-- Add hora field to agenda_anciaos table
ALTER TABLE public.agenda_anciaos ADD COLUMN IF NOT EXISTS hora_inicio TIME;
