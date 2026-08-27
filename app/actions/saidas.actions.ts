'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Database } from '@/types/database.types'

export interface Saida {
    id: string
    dia: string
    hora: string
    local: string
    obs: string | null
    ordem: number
}

type SaidaPayload = Omit<Saida, 'id'>
type PerfilRegistro = Pick<Database['public']['Tables']['membro_perfis']['Row'], 'perfil'>

// Ensure the user has permission to modify
export async function canEditSaidas() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    // Find the member record for this auth user
    const { data: member } = await supabase
        .from('membros')
        .select('id')
        .eq('user_id', user.id)
        .single()


    if (!member) return false

    const { data: perfis } = await supabase
        .from('membro_perfis')
        .select('perfil')
        .eq('membro_id', member.id)

    if (!perfis) return false
    return perfis.some((p: PerfilRegistro) => p.perfil === 'ADMIN' || p.perfil === 'SUPERINTENDENTE_SERVICO')
}

export async function getSaidas() {
    const supabase = await createClient()

    // 1. Check if there's a visit week active (e.g. from 3 days ago up to 7 days in future)
    const now = new Date()
    const past = new Date(now)
    past.setDate(past.getDate() - 4)
    const future = new Date(now)
    future.setDate(future.getDate() + 7)

    const { data: visitProg } = await supabase
        .from('programacao_semanal')
        .select('id')
        .eq('evento_tipo', 'visita spte')
        .gte('data_reuniao', past.toISOString().split('T')[0])
        .lte('data_reuniao', future.toISOString().split('T')[0])
        .limit(1)
        .maybeSingle()

    if (visitProg) {
        const { data } = await (supabase as any)
            .from('visita_config')
            .select('saidas_campo')
            .eq('programacao_id', visitProg.id)
            .maybeSingle()
            
        const config = data as any;
        
        if (config?.saidas_campo && config.saidas_campo.length > 0) {
            const saidasVisita = config.saidas_campo.map((s: any, idx: number) => ({
                id: s.id || `visit-${idx}`,
                dia: s.dia,
                hora: s.hora,
                local: s.local,
                obs: 'Semana de Visita do Superintendente',
                ordem: idx
            }));
            return { data: saidasVisita as Saida[], isVisitWeek: true };
        }
    }

    // 2. Fetch standard schedule
    const { data, error } = await supabase
        .from('horarios_campo')
        .select('*')
        .order('ordem', { ascending: true })
        .order('hora', { ascending: true })

    if (error) {
        console.error('Error fetching saidas:', error)
        return { data: [], isVisitWeek: false, error: 'Erro ao buscar horários de campo.' }
    }

    return { data: data as Saida[], isVisitWeek: false }
}

export async function createSaida(saida: SaidaPayload) {
    const supabase = await createClient()

    if (!await canEditSaidas()) {
        return { error: 'Sem permissão.' }
    }

    const { error } = await supabase
        .from('horarios_campo')
        .insert(saida)
    if (error) {
        console.error('Error creating saida:', error)
        return { error: 'Erro ao criar horário: ' + error.message }
    }

    revalidatePath('/saidas')
    revalidatePath('/admin/saidas')
    return { success: true }
}

export async function updateSaida(id: string, saida: SaidaPayload) {
    const supabase = await createClient()

    if (!await canEditSaidas()) {
        return { error: 'Sem permissão.' }
    }

    const { error } = await supabase
        .from('horarios_campo')
        .update(saida)
        .eq('id', id)

    if (error) {
        console.error('Error updating saida:', error)
        return { error: 'Erro ao atualizar horário: ' + error.message }
    }

    revalidatePath('/saidas')
    revalidatePath('/admin/saidas')
    return { success: true }
}

export async function deleteSaida(id: string) {
    const supabase = await createClient()

    if (!await canEditSaidas()) {
        return { error: 'Sem permissão.' }
    }

    const { error } = await supabase
        .from('horarios_campo')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting saida:', error)
        return { error: 'Erro ao excluir horário: ' + error.message }
    }

    revalidatePath('/saidas')
    revalidatePath('/admin/saidas')
    return { success: true }
}
