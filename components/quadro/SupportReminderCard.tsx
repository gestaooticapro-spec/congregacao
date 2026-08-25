'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { buildSupportReminderText, isLogadoPresidenteMeioSemana, shareMidweekReminderToWhatsApp } from '@/lib/midweekReminder'

interface Assignment {
    funcao: string
    membro_id: string | null
    membro: { nome_completo: string; nome_civil: string | null } | null
}

export default function SupportReminderCard() {
    const [data, setData] = useState<string | null>(null)
    const [isPresidenteLogado, setIsPresidenteLogado] = useState(false)
    const [assignments, setAssignments] = useState<Assignment[]>([])
    const [enviando, setEnviando] = useState(false)

    useEffect(() => {
        const carregar = async () => {
            const hoje = format(new Date(), 'yyyy-MM-dd')
            const { data: datas } = await supabase.from('designacoes_suporte').select('data').gte('data', hoje).order('data', { ascending: true }).limit(1)
            const proximaData = datas?.[0]?.data
            if (!proximaData) return
            setData(proximaData)
            const [{ data: apoios }, { data: programacao }] = await Promise.all([
                supabase.from('designacoes_suporte').select('funcao, membro_id, membro:membros(nome_completo, nome_civil)').eq('data', proximaData),
                supabase.from('programacao_semanal').select('presidente_id').eq('data_reuniao', proximaData).maybeSingle(),
            ])
            const supportAssignments = (apoios || []) as Assignment[]
            setAssignments(supportAssignments)
            const presidenteId = programacao?.presidente_id
                || supportAssignments.find(assignment => assignment.funcao === 'PRESIDENTE')?.membro_id
            setIsPresidenteLogado(await isLogadoPresidenteMeioSemana(presidenteId))
        }
        void carregar()
    }, [])

    const handleEnviar = () => {
        if (!data) return
        setEnviando(true)
        try {
            shareMidweekReminderToWhatsApp(buildSupportReminderText(data, assignments.map(a => ({ funcao: a.funcao, nome: a.membro?.nome_completo || a.membro?.nome_civil || 'Não designado' }))))
        } catch (error) {
            console.error('[SupportReminderCard] Erro ao gerar lembrete:', error)
            alert('Não foi possível gerar o lembrete. Tente novamente.')
        } finally { setEnviando(false) }
    }

    return (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:border-primary group flex flex-col">
            <Link href="/relatorios/mecanicas" className="flex-1">
                <div className="flex items-center gap-4 mb-4"><div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform"><span className="text-2xl">📋</span></div><div><h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors">Designações de Apoio</h3><span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Reunião</span></div></div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Visualize a escala de indicadores, som, vídeo e microfones para cada reunião.</p>
                {data && <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700"><p className="text-xs text-slate-500 dark:text-slate-400">Próxima reunião:</p><p className="text-sm font-semibold text-slate-900 dark:text-white">{format(parseISO(data), 'dd/MM/yyyy', { locale: ptBR })}</p></div>}
            </Link>
            {isPresidenteLogado && <button onClick={handleEnviar} disabled={enviando} title="Abrir WhatsApp com o lembrete das responsabilidades de apoio" className="mt-4 w-full min-h-11 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-center leading-tight shadow-sm disabled:opacity-60 disabled:cursor-not-allowed sm:whitespace-nowrap">{enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}Lembrete no WhatsApp</button>}
        </div>
    )
}
