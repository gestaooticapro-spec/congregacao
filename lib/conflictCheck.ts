import { supabase } from './supabaseClient'

type ConflictCheckOptions = {
    ignoreSupportRole?: string
    ignoreProgramacaoId?: string
    ignoreProgramacaoTopLevelRole?: 'PRESIDENTE' | 'ORACAO_INICIAL' | 'ORACAO_FINAL'
    ignoreLocalTalkId?: string | null
    ignoreAwayTalkId?: string | null
}

const supportRoleLabels: Record<string, string> = {
    PRESIDENTE: 'Presidente',
    SOM: 'Som',
    MICROFONE_1: 'Microfone 1',
    MICROFONE_2: 'Microfone 2',
    INDICADOR_ENTRADA: 'Indicador de Entrada',
    INDICADOR_AUDITORIO: 'Indicador de Auditório',
    LEITOR_SENTINELA: 'Leitor da Sentinela',
    VIDEO: 'Vídeo',
}

export async function checkConflicts(date: string, membroId: string, options: ConflictCheckOptions = {}): Promise<string[]> {
    const conflicts: string[] = []

    try {
        const { data: supportData, error: supportError } = await supabase
            .from('designacoes_suporte')
            .select('funcao')
            .eq('data', date)
            .eq('membro_id', membroId)
        if (supportError) throw supportError

        supportData?.forEach(assignment => {
            if (assignment.funcao !== options.ignoreSupportRole) {
                conflicts.push(supportRoleLabels[assignment.funcao] || assignment.funcao)
            }
        })

        const { data: programacao, error: programacaoError } = await supabase
            .from('programacao_semanal')
            .select('id, presidente_id, oracao_inicial_id, oracao_final_id, partes')
            .eq('data_reuniao', date)
            .maybeSingle()
        if (programacaoError) throw programacaoError

        if (programacao && programacao.id !== options.ignoreProgramacaoId) {
            if (programacao.presidente_id === membroId && options.ignoreProgramacaoTopLevelRole !== 'PRESIDENTE') conflicts.push('Presidente')
            if (programacao.oracao_inicial_id === membroId && options.ignoreProgramacaoTopLevelRole !== 'ORACAO_INICIAL') conflicts.push('Oração Inicial')
            if (programacao.oracao_final_id === membroId && options.ignoreProgramacaoTopLevelRole !== 'ORACAO_FINAL') conflicts.push('Oração Final')

            const partes = (programacao.partes as any[]) || []
            partes.forEach((parte: any) => {
                if (parte.membro_id === membroId) conflicts.push(`Parte: ${parte.nome}`)
                if (parte.ajudante_id === membroId) conflicts.push(`Ajudante: ${parte.nome}`)
            })
        }

        let localTalksQuery = supabase
            .from('agenda_discursos_locais')
            .select('id, tema:temas(numero, titulo)')
            .eq('data', date)
            .eq('orador_local_id', membroId)
        if (options.ignoreLocalTalkId) localTalksQuery = localTalksQuery.neq('id', options.ignoreLocalTalkId)

        const { data: localTalks, error: localTalksError } = await localTalksQuery
        if (localTalksError) throw localTalksError
        localTalks?.forEach((talk: any) => {
            const tema = talk.tema?.numero ? ` #${talk.tema.numero}` : ''
            conflicts.push(`Orador de Discurso Público${tema}`)
        })

        let awayTalksQuery = supabase
            .from('agenda_discursos_fora')
            .select('id, destino_congregacao')
            .eq('data', date)
            .eq('orador_id', membroId)
        if (options.ignoreAwayTalkId) awayTalksQuery = awayTalksQuery.neq('id', options.ignoreAwayTalkId)

        const { data: awayTalks, error: awayTalksError } = await awayTalksQuery
        if (awayTalksError) throw awayTalksError
        awayTalks?.forEach(talk => {
            const destination = talk.destino_congregacao ? ` em ${talk.destino_congregacao}` : ''
            conflicts.push(`Orador em outra congregação${destination}`)
        })
    } catch (error) {
        console.error('Erro ao verificar conflitos de designação:', error)
        throw new Error('Não foi possível verificar os conflitos desta data. Tente novamente antes de salvar.')
    }

    return Array.from(new Set(conflicts))
}

export function conflictMessage(memberName: string, conflicts: string[]): string {
    return `${memberName} já está escalado como ${conflicts.join(', ')} para este dia. Se precisar, peça uma substituição para o responsável.`
}
