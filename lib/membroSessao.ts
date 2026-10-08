import { supabase } from '@/lib/supabaseClient'

export type MembroSessao = {
    id: string
    nome?: string
    grupo_id?: string | null
    is_pioneiro?: boolean
    is_publicador?: boolean
    pin?: string
    timestamp?: number
}

export function lerMembroSessao(): MembroSessao | null {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem('membro_sessao')
    if (!stored) return null

    try {
        const parsed = JSON.parse(stored) as MembroSessao
        if (!parsed?.id) return null
        return parsed
    } catch {
        return null
    }
}

/** Escolher o nome na Home grava a sessão. Sem isso, ou sem o tic de publicador, o relatório não aparece. */
export async function membroSessaoEhPublicador(): Promise<boolean> {
    const sessao = lerMembroSessao()
    if (!sessao) return false

    const { data, error } = await supabase.rpc('listar_membros_publicos')
    if (error || !data) return false

    return data.some(membro => membro.id === sessao.id && membro.is_publicador === true)
}
