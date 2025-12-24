'use server'

import { createServerClient } from '@/lib/supabaseServer'

export async function restoreAssignments() {
    const supabase = createServerClient()
    const results = []

    // 1. Get all schedules
    const { data: schedules, error: schedError } = await supabase
        .from('programacao_semanal')
        .select('*')

    if (schedError) return { error: schedError.message }

    for (const schedule of schedules) {
        // 2. Get history for this schedule
        const { data: history, error: histError } = await supabase
            .from('historico_designacoes')
            .select('*')
            .eq('programacao_id', schedule.id)

        if (histError || !history || history.length === 0) continue

        let updated = false
        const updates: any = {}
        const currentParts = [...(schedule.partes as any[])]

        // Restore Roles
        const presidente = history.find(h => h.parte_descricao === 'Presidente')
        if (presidente && !schedule.presidente_id) {
            updates.presidente_id = presidente.membro_id
            updated = true
        }

        const oracaoInicial = history.find(h => h.parte_descricao === 'Oração Inicial')
        if (oracaoInicial && !schedule.oracao_inicial_id) {
            updates.oracao_inicial_id = oracaoInicial.membro_id
            updated = true
        }

        const oracaoFinal = history.find(h => h.parte_descricao === 'Oração Final')
        if (oracaoFinal && !schedule.oracao_final_id) {
            updates.oracao_final_id = oracaoFinal.membro_id
            updated = true
        }

        // Restore Parts
        let partsUpdated = false
        const newParts = currentParts.map(part => {
            const assignment = history.find(h => h.parte_descricao === part.nome)
            const assistant = history.find(h => h.parte_descricao === `${part.nome} (Ajudante)`)

            let p = { ...part }

            if (assignment && !p.membro_id) {
                p.membro_id = assignment.membro_id
                partsUpdated = true
            }

            if (assistant && !p.ajudante_id) {
                p.ajudante_id = assistant.membro_id
                partsUpdated = true
            }

            return p
        })

        if (partsUpdated) {
            updates.partes = newParts
            updated = true
        }

        if (updated) {
            await supabase
                .from('programacao_semanal')
                .update(updates)
                .eq('id', schedule.id)

            results.push(`Restored schedule ${schedule.data_reuniao}`)
        }
    }

    return { success: true, results }
}
