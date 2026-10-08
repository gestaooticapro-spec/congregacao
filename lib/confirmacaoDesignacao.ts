import { supabase } from '@/lib/supabaseClient'

/** Sem a configuração salva, a confirmação continua pedindo aceite. */
export async function confirmacaoDesignacaoHabilitada(): Promise<boolean> {
    const { data, error } = await supabase
        .from('dados_congregacao')
        .select('confirmacao_designacao_habilitada')
        .eq('id', true)
        .maybeSingle()

    if (error || !data) return true
    return data.confirmacao_designacao_habilitada !== false
}

export function textoLinkDesignacao(habilitada: boolean, link: string): string {
    if (habilitada) {
        return `\n\nClique no link pra confirmar:\n\n${link}`
    }
    return `\n\nVeja a designação neste link:\n\n${link}`
}
