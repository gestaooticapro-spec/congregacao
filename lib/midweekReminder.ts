import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Programacao = Database['public']['Tables']['programacao_semanal']['Row']

/**
 * Resolve o membro da congregação vinculado à sessão atual do Supabase.
 * Retorna { id } do membro cuja coluna `user_id` bate com session.user.id,
 * ou null se não houver sessão ou não houver vínculo (membro não existe
 * ou está inativo).
 *
 * Usa o cliente client-side (createBrowserClient). A política RLS da tabela
 * `membros` controla o acesso; em congregações onde membros podem ler a
 * própria linha, funciona direto. Caso a RLS bloqueie essa leitura para
 * publicadores comuns, será preciso expor uma RPC ou uma rota de server-side
 * que faça essa resolução.
 */
export async function resolveMembroLogadoSupabase(): Promise<{ id: string } | null> {
    try {
        const {
            data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user?.id) return null

        const { data, error } = await supabase
            .from('membros')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('ativo', true)
            .maybeSingle()

        if (error) {
            console.error('[midweekReminder] Erro ao resolver membro logado:', error.message)
            return null
        }

        if (!data) return null
        return { id: data.id }
    } catch (err) {
        console.error('[midweekReminder] Exceção ao resolver membro logado:', err)
        return null
    }
}

/**
 * Verifica se o usuário logado via Supabase é o presidente da semana de meio
 * de semana informada. Retorna true somente quando há sessão, há vínculo com
 * um membro ativo, e esse membro é exatamente o presidente_id da programação.
 */
export async function isLogadoPresidenteMeioSemana(
    presidenteId: string | null | undefined
): Promise<boolean> {
    if (!presidenteId) return false
    const membro = await resolveMembroLogadoSupabase()
    return !!membro && membro.id === presidenteId
}

export interface ReminderParte {
    tipo: 'TESOUROS' | 'MINISTERIO' | 'VIDA_CRISTA' | 'PRESIDENTE' | 'ORACAO'
    nome: string
    tempo: number
    membro_id?: string | null
    ajudante_id?: string | null
}

interface ReminderMembro {
    id: string
    nome_completo: string
}

interface BuildReminderTextParams {
    programacao: Programacao
    membros: ReminderMembro[]
    /**
     * Nomes amigáveis para os irmãos externos (ex.: "Superintendente de
     * Circuito") quando o designado não está na tabela `membros`. Opcional.
     */
    nomesExternos?: Record<string, string>
}

/** Mantém o título até o tempo entre parênteses; sem tempo, preserva o texto. */
function nomeParteParaLembrete(nome: string | null | undefined): string {
    const texto = nome?.trim() || 'Parte'
    const match = texto.match(/\(\s*\d+\s*min(?:uto)?s?\s*\)/i)
    return match ? texto.slice(0, (match.index ?? 0) + match[0].length).trim() : texto
}

function nomeEmNegrito(nome: string): string {
    return `*${nome}*`
}

/**
 * Monta o texto de lembrete da reunião de meio de semana, listando TODOS os
 * designados (independente de status de confirmação — é um lembrete de
 * reconfirmação). Só nomes, sem links.
 *
 * O texto é formatado para caber bem em uma mensagem de WhatsApp.
 */
export function buildMidweekReminderText({
    programacao,
    membros,
    nomesExternos = {},
}: BuildReminderTextParams): string {
    const nomeDo = (id: string | null | undefined): string => {
        if (!id) return 'Não designado'
        const m = membros.find(x => x.id === id)
        if (m) return m.nome_completo
        if (nomesExternos[id]) return nomesExternos[id]
        return 'Membro não encontrado'
    }

    const data = programacao.data_reuniao
        ? format(parseISO(programacao.data_reuniao), "dd/MM/yyyy", { locale: ptBR })
        : ''

    const linhas: string[] = []
    linhas.push('📋 *Reunião de Meio de Semana*')
    if (data) linhas.push(`Data: ${data}`)
    if (programacao.semana_descricao) {
        linhas.push(`Semana: ${programacao.semana_descricao}`)
    }
    linhas.push('')

    linhas.push('🙏 *Designações:*')
    linhas.push(`• Presidente: ${nomeEmNegrito(nomeDo(programacao.presidente_id))}`)
    linhas.push(`• Oração Inicial: ${nomeEmNegrito(nomeDo(programacao.oracao_inicial_id))}`)
    linhas.push(`• Oração Final: ${nomeEmNegrito(nomeDo(programacao.oracao_final_id))}`)
    linhas.push('')

    const partes = (programacao.partes as unknown as ReminderParte[] | null) || []
    const secoes: { titulo: string; tipo: ReminderParte['tipo'] }[] = [
        { titulo: '💎 Tesouros da Palavra de Deus', tipo: 'TESOUROS' },
        { titulo: '📢 Faça Seu Melhor no Ministério', tipo: 'MINISTERIO' },
        { titulo: '❤️ Nossa Vida Cristã', tipo: 'VIDA_CRISTA' },
    ]

    for (const secao of secoes) {
        const itens = partes.filter(p => p.tipo === secao.tipo)
        if (itens.length === 0) continue
        linhas.push(`${secao.titulo}`)
        for (const p of itens) {
            const principal = nomeDo(p.membro_id)
            const ajudante = p.ajudante_id ? nomeDo(p.ajudante_id) : null
            const nomeParte = nomeParteParaLembrete(p.nome)
            const ehLeitor = /estudo bíblico/i.test(nomeParte)
            if (ajudante) {
                const nomeApoio = ehLeitor ? nomeEmNegrito(ajudante) : ajudante
                linhas.push(`• ${nomeParte}: ${nomeEmNegrito(principal)} (${ehLeitor ? 'Leitor' : 'Ajudante'}: ${nomeApoio})`)
            } else {
                linhas.push(`• ${nomeParte}: ${nomeEmNegrito(principal)}`)
            }
        }
        linhas.push('')
    }

    linhas.push('Por favor, confirmem suas partes. Obrigado! 🙌')

    return linhas.join('\n').trim()
}

/**
 * Abre o WhatsApp (sem contato pré-definido) com o texto do lembrete, usando o
 * padrão wa.me/?text=. O usuário escolhe o contato/grupo no WhatsApp.
 */
export function shareMidweekReminderToWhatsApp(text: string): void {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
}
