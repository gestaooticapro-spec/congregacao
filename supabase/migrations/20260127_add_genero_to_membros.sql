-- Add 'genero' column to 'membros' table
ALTER TABLE public.membros
ADD COLUMN genero text CHECK (genero IN ('M', 'F'));

-- Comment on column
COMMENT ON COLUMN public.membros.genero IS 'Gênero do membro: M (Masculino) ou F (Feminino)';
