-- Update policies for pauta_anciaos to restrict access to Elders only (independente do role)

-- Drop existing broad policies
DROP POLICY IF EXISTS "Authenticated users can view pauta" ON public.pauta_anciaos;
DROP POLICY IF EXISTS "Authenticated users can insert pauta" ON public.pauta_anciaos;
DROP POLICY IF EXISTS "Authenticated users can update pauta" ON public.pauta_anciaos;
DROP POLICY IF EXISTS "Authenticated users can delete pauta" ON public.pauta_anciaos;

-- Create new policies based on is_anciao check
CREATE POLICY "Elders can view pauta"
    ON public.pauta_anciaos FOR SELECT
    USING (
        exists (
            select 1 from membros
            where membros.user_id = auth.uid()
            and membros.is_anciao = true
        )
    );

CREATE POLICY "Elders can insert pauta"
    ON public.pauta_anciaos FOR INSERT
    WITH CHECK (
        exists (
            select 1 from membros
            where membros.user_id = auth.uid()
            and membros.is_anciao = true
        )
    );

CREATE POLICY "Elders can update pauta"
    ON public.pauta_anciaos FOR UPDATE
    USING (
        exists (
            select 1 from membros
            where membros.user_id = auth.uid()
            and membros.is_anciao = true
        )
    );

CREATE POLICY "Elders can delete pauta"
    ON public.pauta_anciaos FOR DELETE
    USING (
        exists (
            select 1 from membros
            where membros.user_id = auth.uid()
            and membros.is_anciao = true
        )
    );
