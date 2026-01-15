-- Create pauta_anciaos table for elders meeting agenda suggestions
CREATE TABLE IF NOT EXISTS public.pauta_anciaos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assunto TEXT NOT NULL,
    detalhes TEXT,
    sugerido_por TEXT NOT NULL,
    na_pauta BOOLEAN DEFAULT FALSE,
    arquivado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.pauta_anciaos ENABLE ROW LEVEL SECURITY;

-- Create policies (authenticated users can do everything)
CREATE POLICY "Authenticated users can view pauta"
    ON public.pauta_anciaos FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert pauta"
    ON public.pauta_anciaos FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update pauta"
    ON public.pauta_anciaos FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete pauta"
    ON public.pauta_anciaos FOR DELETE
    USING (auth.role() = 'authenticated');
