'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { FileText } from 'lucide-react'
import { format, startOfMonth, subMonths } from 'date-fns'
import { supabase } from '@/lib/supabaseClient'

const SESSION_EVENT = 'membro-sessao-atualizada'

export default function ReportNotificationBanner() {
    const pathname = usePathname()
    const router = useRouter()
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        let cancelled = false

        async function checkReportStatus() {
            const stored = localStorage.getItem('membro_sessao')
            if (!stored) {
                setVisible(false)
                return
            }

            try {
                const sessao = JSON.parse(stored) as { id?: string }
                if (!sessao.id) {
                    setVisible(false)
                    return
                }

                const { data, error } = await supabase.rpc('verificar_relatorio_viamembro', {
                    p_membro_id: sessao.id,
                    p_mes: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')
                })

                if (!cancelled && !error) {
                    setVisible(!data)
                }
            } catch (error) {
                console.error('Erro ao verificar aviso de relatório:', error)
                if (!cancelled) setVisible(false)
            }
        }

        void checkReportStatus()
        window.addEventListener(SESSION_EVENT, checkReportStatus)
        return () => {
            cancelled = true
            window.removeEventListener(SESSION_EVENT, checkReportStatus)
        }
    }, [pathname])

    if (!visible) return null

    return (
        <button
            type="button"
            onClick={() => {
                if (!localStorage.getItem('membro_sessao')) {
                    toast('Escolha seu nome na tela inicial pra mandar seu relatório.', { id: 'meu-relatorio-sem-sessao' })
                    router.push('/')
                    return
                }
                router.push('/meu-relatorio')
            }}
            className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-left text-white shadow-lg transition hover:from-violet-700 hover:to-fuchsia-700"
            role="alert"
        >
            <div className="container mx-auto flex items-center gap-3 px-4 py-3 md:px-8">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
                    <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold md:text-base">Relatório de serviço pendente</p>
                    <p className="text-xs text-violet-100 md:text-sm">Relatório mensal pendente. Clique para enviar o relatório do mês anterior.</p>
                </div>
            </div>
        </button>
    )
}
