import { supabase } from './supabaseClient'

export async function checkConflicts(date: string, membroId: string): Promise<string[]> {
    const conflicts: string[] = []

    try {
        // 1. Check Mechanical Assignments (Escalas)
        const { data: escalasData, error: escalasError } = await supabase
            .from('designacoes_suporte')
            .select('funcao')
            .eq('data', date)
            .eq('membro_id', membroId)

        if (escalasError) throw escalasError

        if (escalasData) {
            escalasData.forEach(escala => {
                conflicts.push(`Suporte: ${formatRoleName(escala.funcao)}`)
            })
        }

        // 2. Check Spiritual Assignments (Programação Semanal)
        const { data: progData, error: progError } = await supabase
            .from('programacao_semanal')
            .select('*')
            .eq('data_reuniao', date)
            .maybeSingle()

        if (progError) throw progError

        if (progData) {
            if (progData.presidente_id === membroId) conflicts.push('Presidente')
            if (progData.oracao_inicial_id === membroId) conflicts.push('Oração Inicial')
            if (progData.oracao_final_id === membroId) conflicts.push('Oração Final')

            const partes = (progData.partes as any[]) || []
            partes.forEach((parte: any) => {
                if (parte.membro_id === membroId) {
                    conflicts.push(`Parte: ${parte.nome}`)
                }
                if (parte.ajudante_id === membroId) {
                    conflicts.push(`Ajudante: ${parte.nome}`)
                }
            })
        }

        // 3. Check Field Service Leaders (Escalas Campo)
        const { data: campoData, error: campoError } = await supabase
            .from('escalas_campo')
            .select('id')
            .eq('data', date)
            .eq('dirigente_id', membroId)

        if (campoError) throw campoError

        if (campoData && campoData.length > 0) {
            conflicts.push('Dirigente de Campo')
        }

    } catch (error) {
        console.error('Error checking conflicts:', error)
    }

    return conflicts
}

function formatRoleName(role: string): string {
    const roles: Record<string, string> = {
        'PRESIDENTE': 'Presidente', // Legacy?
        'SOM': 'Som',
        'MICROFONE_1': 'Microfone 1',
        'MICROFONE_2': 'Microfone 2',
        'INDICADOR_ENTRADA': 'Indicador Entrada',
        'INDICADOR_AUDITORIO': 'Indicador Auditório',
    }
    return roles[role] || role
}
