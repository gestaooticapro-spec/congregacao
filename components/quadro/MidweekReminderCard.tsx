'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MessageCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'
import {
    buildMidweekReminderText,
    isLogadoPresidenteMeioSemana,
    shareMidweekReminderToWhatsApp,
} from '@/lib/midweekReminder'

type Programacao = Database['public']['Tables']['programacao_semanal']['Row']
type Membro = Database['public']['Tables']['membros']['Row']

interface Parte {
    tipo: 'TESOUROS' | 'MINISTERIO' | 'VIDA_CRISTA' | 'PRESIDENTE' | 'ORACAO'
    nome: string
    tempo: number
    membro_id?: string | null
    ajudante_id?: string | null
}

/**
 * Card de meio de semana do Quadro de Anúncios.
 *
 * Mantém o visual original (link para o relatório completo) e, quando o
 * presidente da próxima semana for o próprio usuário logado via Supabase,
 * exibe um botão extra para gerar o lembrete da reunião em texto e abrir o
 * WhatsApp sem contato pré-definido (o usuário escolhe o grupo/contato).
 */
export default function MidweekReminderCard() {
    const [programacao, setProgramacao] = useState<Programacao | null>(null)
    const [membros, setMembros] = useState<Membro[]>([])
    const [presidenteNome, setPresidenteNome] = useState<string | null>(null)
    const [dataFormatada, setDataFormatada] = useState<string | null>(null)
    const [nomesExternos, setNomesExternos] = useState<Record<string, string>>({})
    const [isPresidenteLogado, setIsPresidenteLogado] = useState(false)
    const [enviando, setEnviando] = useState(false)

    useEffect(() => {
        void carregarProximaSemana()
    }, [])

    const carregarProximaSemana = async () => {
        try {
            const { data: progRows, error: progError } = await supabase
                .from('programacao_semanal')
                .select('*')
                .order('data_reuniao', { ascending: true })

            if (progError) throw progError
            if (!progRows || progRows.length === 0) return

            const today = format(new Date(), 'yyyy-MM-dd')
            const proxima = progRows.find(p => p.data_reuniao >= today) || progRows[progRows.length - 1]
            setProgramacao(proxima)

            try {
                setDataFormatada(format(parseISO(proxima.data_reuniao), "dd/MM/yyyy", { locale: ptBR }))
            } catch {
                setDataFormatada(proxima.data_reuniao)
            }

            // Coleta todos os IDs de membros designados para buscar os nomes
            const ids = new Set<string>()
            if (proxima.presidente_id) ids.add(proxima.presidente_id)
            if (proxima.oracao_inicial_id) ids.add(proxima.oracao_inicial_id)
            if (proxima.oracao_final_id) ids.add(proxima.oracao_final_id)
            const partes = (proxima.partes as unknown as Parte[] | null) || []
            partes.forEach(p => {
                if (p.membro_id) ids.add(p.membro_id)
                if (p.ajudante_id) ids.add(p.ajudante_id)
            })

            if (ids.size > 0) {
                const { data: membrosData, error: membrosError } = await supabase
                    .from('membros')
                    .select('*')
                    .in('id', Array.from(ids))

                if (membrosError) throw membrosError
                setMembros(membrosData || [])

                const presidente = (membrosData || []).find(m => m.id === proxima.presidente_id)
                if (presidente) setPresidenteNome(presidente.nome_completo)
            }

            if (proxima.evento_tipo === 'visita spte') {
                const { data: colaboradores } = await supabase
                    .from('colaboradores_externos')
                    .select('id, nome, funcao')
                const superintendente = colaboradores?.find(
                    colaborador => colaborador.funcao?.toLowerCase().includes('superintendente')
                        || colaborador.funcao?.toLowerCase().includes('circuito')
                )
                if (superintendente) {
                    setNomesExternos({ [superintendente.id]: superintendente.nome || 'Superintendente de Circuito' })
                }
            }

            // Só mostra o botão se o logado via Supabase for o presidente desta semana
            const souPresidente = await isLogadoPresidenteMeioSemana(proxima.presidente_id)
            setIsPresidenteLogado(souPresidente)
        } catch (err) {
            console.error('[MidweekReminderCard] Erro ao carregar próxima semana:', err)
        }
    }

    const handleEnviarLembrete = async () => {
        if (!programacao) return
        setEnviando(true)
        try {
            const texto = buildMidweekReminderText({
                programacao,
                membros: membros.map(m => ({ id: m.id, nome_completo: m.nome_completo })),
                nomesExternos,
            })
            shareMidweekReminderToWhatsApp(texto)
        } catch (err) {
            console.error('[MidweekReminderCard] Erro ao gerar lembrete:', err)
            alert('Não foi possível gerar o lembrete. Tente novamente.')
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:border-primary group flex flex-col">
            <Link href="/relatorios/reuniao-meio-semana" className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                        <span className="text-2xl">📖</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                            Reunião de Meio de Semana
                        </h3>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            Programação
                        </span>
                    </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Visualize a programação completa da reunião de meio de semana, com todas as partes e designados.
                </p>

                {dataFormatada && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Próxima semana:
                        </p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {dataFormatada}
                        </p>
                        {presidenteNome && (
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                Presidente: <span className="font-medium">{presidenteNome}</span>
                            </p>
                        )}
                    </div>
                )}
            </Link>

            {isPresidenteLogado && (
                <button
                    onClick={handleEnviarLembrete}
                    disabled={enviando}
                    className="mt-4 w-full min-h-11 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-center leading-tight shadow-sm disabled:opacity-60 disabled:cursor-not-allowed sm:whitespace-nowrap"
                    title="Abrir WhatsApp com lembrete dos designados (você escolhe o contato/grupo)"
                >
                    {enviando ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <MessageCircle className="w-4 h-4" />
                    )}
                    Lembrete no WhatsApp
                </button>
            )}
        </div>
    )
}
