'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Saida {
    id: string
    dia: string
    hora: string
    local: string
    obs: string | null
    ordem: number
}

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
    return perfis.some((p: any) => p.perfil === 'ADMIN' || p.perfil === 'SUPERINTENDENTE_SERVICO')
}

export async function getSaidas() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('horarios_campo' as any)
        .select('*')
        .order('ordem', { ascending: true })
        .order('hora', { ascending: true })

    if (error) {
        console.error('Error fetching saidas:', error)
        return { data: [], error: 'Erro ao buscar horários de campo.' }
    }

    return { data: data as any as Saida[] }
}

export async function createSaida(saida: Omit<Saida, 'id'>) {
    const supabase = await createClient()

    if (!await canEditSaidas()) {
        return { error: 'Sem permissão.' }
    }

    const { error } = await supabase
        .from('horarios_campo' as any)
        .insert(saida)

    if (error) {
        console.error('Error creating saida:', error)
        return { error: 'Erro ao criar horário: ' + error.message }
    }

    revalidatePath('/saidas')
    revalidatePath('/admin/saidas')
    return { success: true }
}

export async function updateSaida(id: string, saida: Omit<Saida, 'id'>) {
    const supabase = await createClient()

    if (!await canEditSaidas()) {
        return { error: 'Sem permissão.' }
    }

    const { error } = await supabase
        .from('horarios_campo' as any)
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
        .from('horarios_campo' as any)
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
