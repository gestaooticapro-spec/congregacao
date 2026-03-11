-- Migration to create the horarios_campo table for dynamic field service schedules

CREATE TABLE IF NOT EXISTS public.horarios_campo (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    dia text NOT NULL,
    hora text NOT NULL,
    local text NOT NULL,
    obs text,
    ordem integer NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Setup
ALTER TABLE public.horarios_campo ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "horarios_campo_select_policy" 
    ON public.horarios_campo FOR SELECT 
    USING (true);

-- Allow admins and ss to manage records
CREATE POLICY "horarios_campo_all_policy" 
    ON public.horarios_campo FOR ALL 
    USING (
        auth.uid() IN (
            SELECT membro_id FROM membro_perfis 
            WHERE perfil = 'admin' OR perfil = 'ss'
        )
    );
