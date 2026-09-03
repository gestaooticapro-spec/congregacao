-- Limpeza e atribuida ao grupo, sem selecao individual de substituto. Por
-- isso ela nao deve gerar aviso de substituicao na ausencia de um membro.
CREATE OR REPLACE FUNCTION public.obter_conflitos_ausencia(
    p_membro_id UUID,
    p_data_inicio DATE,
    p_data_fim DATE
)
RETURNS TABLE(data DATE, designacao TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM (
        SELECT ps.data_reuniao, 'Presidente da reuniao' FROM public.programacao_semanal ps WHERE ps.presidente_id = p_membro_id AND ps.data_reuniao BETWEEN p_data_inicio AND p_data_fim
        UNION ALL SELECT ps.data_reuniao, 'Oracao inicial' FROM public.programacao_semanal ps WHERE ps.oracao_inicial_id = p_membro_id AND ps.data_reuniao BETWEEN p_data_inicio AND p_data_fim
        UNION ALL SELECT ps.data_reuniao, 'Oracao final' FROM public.programacao_semanal ps WHERE ps.oracao_final_id = p_membro_id AND ps.data_reuniao BETWEEN p_data_inicio AND p_data_fim
        UNION ALL SELECT ps.data_reuniao, COALESCE(parte.item->>'nome', 'Parte da reuniao') FROM public.programacao_semanal ps CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ps.partes, '[]'::jsonb)) parte(item) WHERE ps.data_reuniao BETWEEN p_data_inicio AND p_data_fim AND (parte.item->>'membro_id' = p_membro_id::TEXT OR parte.item->>'ajudante_id' = p_membro_id::TEXT)
        UNION ALL SELECT ds.data, CASE ds.funcao WHEN 'SOM' THEN 'Operador de som' WHEN 'MICROFONE_1' THEN 'Microfone 1' WHEN 'MICROFONE_2' THEN 'Microfone 2' WHEN 'LEITOR_SENTINELA' THEN 'Leitura da Sentinela' WHEN 'PRESIDENTE' THEN 'Presidente' ELSE ds.funcao END FROM public.designacoes_suporte ds WHERE ds.membro_id = p_membro_id AND ds.data BETWEEN p_data_inicio AND p_data_fim
        UNION ALL SELECT ec.data, 'Dirigir o campo' FROM public.escalas_campo ec WHERE ec.dirigente_id = p_membro_id AND ec.data BETWEEN p_data_inicio AND p_data_fim
        UNION ALL SELECT adl.data, 'Discurso publico' FROM public.agenda_discursos_locais adl WHERE adl.orador_local_id = p_membro_id AND adl.data BETWEEN p_data_inicio AND p_data_fim
        UNION ALL SELECT adf.data, 'Discurso fora' FROM public.agenda_discursos_fora adf WHERE adf.orador_id = p_membro_id AND adf.data BETWEEN p_data_inicio AND p_data_fim
    ) conflitos ORDER BY 1, 2;
$$;
