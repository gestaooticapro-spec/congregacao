'use server'

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const roles = [
    { id: 'PRESIDENTE', required: 'is_presidente' },
    { id: 'SOM', required: 'is_som' },
    { id: 'MICROFONE_1', required: 'is_microfone' },
    { id: 'MICROFONE_2', required: 'is_microfone' },
    { id: 'INDICADOR_ENTRADA', required: 'is_indicador' },
    { id: 'INDICADOR_AUDITORIO', required: 'is_indicador' },
    { id: 'LEITOR_SENTINELA', required: 'is_leitor_sentinela' },
] as const

const isWeekend = (date: string) => {
    const [year, month, day] = date.split('-').map(Number)
    const weekday = new Date(year, month - 1, day).getDay()
    return weekday === 0 || weekday === 6
}

export async function generateSupportAssignments(date: string, currentAssignments: Record<string, string>) {
    try {
        const [{ data: membros, error: membrosError }, { data: programacao, error: programacaoError }, { data: support, error: supportError }, { data: talks, error: talksError }, { data: campo, error: campoError }, { data: history, error: historyError }] = await Promise.all([
            supabase.from('membros').select('*').eq('ativo', true),
            supabase.from('programacao_semanal').select('presidente_id, oracao_inicial_id, oracao_final_id, partes').eq('data_reuniao', date).maybeSingle(),
            supabase.from('designacoes_suporte').select('membro_id, data').lt('data', date),
            supabase.from('agenda_discursos_locais').select('orador_local_id').eq('data', date),
            supabase.from('escalas_campo').select('dirigente_id').eq('data', date),
            supabase.from('historico_designacoes').select('membro_id, data_reuniao').lt('data_reuniao', date),
        ])

        if (membrosError || programacaoError || supportError || talksError || campoError || historyError || !membros) {
            throw new Error('Não foi possível carregar os dados para as sugestões.')
        }

        const blocked = new Set<string>()
        if (programacao) {
            ;[programacao.presidente_id, programacao.oracao_inicial_id, programacao.oracao_final_id].forEach(id => id && blocked.add(id))
            ;((programacao.partes as any[]) || []).forEach(part => {
                if (part.membro_id) blocked.add(part.membro_id)
                if (part.ajudante_id) blocked.add(part.ajudante_id)
            })
        }
        talks?.forEach(talk => talk.orador_local_id && blocked.add(talk.orador_local_id))
        campo?.forEach(item => item.dirigente_id && blocked.add(item.dirigente_id))
        Object.values(currentAssignments).forEach(id => id && blocked.add(id))

        const lastAssignment: Record<string, string> = {}
        ;[...(support || []).map(item => ({ membro_id: item.membro_id, data: item.data })), ...(history || []).map(item => ({ membro_id: item.membro_id, data: item.data_reuniao }))]
            .filter(item => item.membro_id)
            .forEach(item => {
                if (!lastAssignment[item.membro_id!] || item.data > lastAssignment[item.membro_id!]) {
                    lastAssignment[item.membro_id!] = item.data
                }
            })

        const suggestions = { ...currentAssignments }
        const validRoles = roles.filter(role => isWeekend(date) || (role.id !== 'PRESIDENTE' && role.id !== 'LEITOR_SENTINELA'))

        validRoles.forEach(role => {
            if (suggestions[role.id]) return
            const candidate = membros
                .filter(member => (member as any)[role.required] && !blocked.has(member.id))
                .sort((a, b) => (lastAssignment[a.id] || '1970-01-01').localeCompare(lastAssignment[b.id] || '1970-01-01'))[0]

            if (candidate) {
                suggestions[role.id] = candidate.id
                blocked.add(candidate.id)
            }
        })

        return { success: true, data: suggestions }
    } catch (error: any) {
        console.error('Erro ao gerar sugestões de apoio:', error)
        return { success: false, error: error.message || 'Erro ao gerar sugestões de apoio.' }
    }
}
