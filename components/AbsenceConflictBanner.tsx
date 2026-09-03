'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { getCongregationDate } from '@/lib/dateUtils'

export default function AbsenceConflictBanner() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const check = async () => {
            try {
                const session = JSON.parse(localStorage.getItem('membro_sessao') || 'null') as { id?: string }
                if (!session?.id) return setVisible(false)
                const today = getCongregationDate()
                const { data: ausencias } = await supabase.rpc('listar_minhas_ausencias', { p_membro_id: session.id })
                const active = (ausencias || []).filter(item => item.data_fim >= today)
                const checks = await Promise.all(active.map(item => supabase.rpc('obter_conflitos_ausencia', { p_membro_id: session.id!, p_data_inicio: item.data_inicio, p_data_fim: item.data_fim })))
                setVisible(checks.some(result => (result.data || []).length > 0))
            } catch { setVisible(false) }
        }
        void check()
        window.addEventListener('membro-sessao-atualizada', check)
        window.addEventListener('ausencias-atualizadas', check)
        return () => {
            window.removeEventListener('membro-sessao-atualizada', check)
            window.removeEventListener('ausencias-atualizadas', check)
        }
    }, [])

    if (!visible) return null
    return <Link href="/minha-ausencia" className="block bg-red-600 px-4 py-3 text-white shadow-lg hover:bg-red-700"><span className="mx-auto flex max-w-7xl items-center gap-3"><AlertTriangle className="h-5 w-5 shrink-0" /><span><strong>Substitutos necessários.</strong> Você tem designações durante sua ausência. Toque para ver os detalhes.</span></span></Link>
}
