'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { X, Bell } from 'lucide-react'
import { startOfWeek, endOfWeek, format, getISOWeek, getYear } from 'date-fns'

interface SessaoMembro {
    id: string
    nome: string
    grupo_id: string
    is_pioneiro: boolean
    pin: string
    timestamp: number
}

function getDismissKey(): string {
    const now = new Date()
    const week = getISOWeek(now)
    const year = getYear(now)
    return `notif_dismissed_w${year}_${week}`
}

export default function WeeklyNotificationBanner() {
    const [visible, setVisible] = useState(false)
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        checkNotifications()
    }, [])

    async function checkNotifications() {
        try {
            // 1. Check if there's a PIN session
            if (typeof window === 'undefined') {
                setLoading(false)
                return
            }

            const stored = localStorage.getItem('membro_sessao')
            if (!stored) {
                setLoading(false)
                return
            }

            // 2. Check if already dismissed this week
            const dismissKey = getDismissKey()
            if (localStorage.getItem(dismissKey) === 'true') {
                setLoading(false)
                return
            }

            const sessao: SessaoMembro = JSON.parse(stored)

            // 3. Calculate current week boundaries (Monday to Sunday)
            const now = new Date()
            const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
            const weekEnd = endOfWeek(now, { weekStartsOn: 1 }) // Sunday
            const weekStartStr = format(weekStart, 'yyyy-MM-dd')
            const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

            const collectiveMessages: string[] = []
            let hasIndividual = false

            // 4. Check COLLECTIVE events (eventos table)
            // These are events that affect the whole congregation (congresso, limpeza, visita, etc.)
            const { data: eventos } = await supabase
                .from('eventos')
                .select('titulo, tipo')
                .lte('data_inicio', weekEndStr)
                .gte('data_fim', weekStartStr)

            if (eventos && eventos.length > 0) {
                for (const ev of eventos) {
                    collectiveMessages.push(ev.titulo)
                }
            }

            // 5. Check INDIVIDUAL meeting part assignments via programacao_semanal partes JSON
            // The partes field contains member IDs for assigned parts
            const { data: programacoes } = await supabase
                .from('programacao_semanal')
                .select('id, partes, presidente_id, oracao_inicial_id, oracao_final_id')
                .gte('data_reuniao', weekStartStr)
                .lte('data_reuniao', weekEndStr)

            if (programacoes && programacoes.length > 0) {
                for (const prog of programacoes) {
                    // Check if member is presidente, oracao_inicial, or oracao_final
                    if (
                        prog.presidente_id === sessao.id ||
                        prog.oracao_inicial_id === sessao.id ||
                        prog.oracao_final_id === sessao.id
                    ) {
                        hasIndividual = true
                        break
                    }

                    // Check in the partes JSONB field for member_id references
                    if (prog.partes && typeof prog.partes === 'object') {
                        const partesStr = JSON.stringify(prog.partes)
                        if (partesStr.includes(sessao.id)) {
                            hasIndividual = true
                            break
                        }
                    }
                }
            }

            // 6. Check INDIVIDUAL support roles (designacoes_suporte table - SOM, MICROFONE, etc.)
            if (!hasIndividual) {
                const { data: suporte } = await supabase
                    .from('designacoes_suporte')
                    .select('id')
                    .eq('membro_id', sessao.id)
                    .gte('data', weekStartStr)
                    .lte('data', weekEndStr)
                    .limit(1)

                if (suporte && suporte.length > 0) {
                    hasIndividual = true
                }
            }

            // 7. Check INDIVIDUAL historico_designacoes (past/confirmed assignments for this week)
            if (!hasIndividual) {
                const { data: historico } = await supabase
                    .from('historico_designacoes')
                    .select('id')
                    .eq('membro_id', sessao.id)
                    .gte('data_reuniao', weekStartStr)
                    .lte('data_reuniao', weekEndStr)
                    .limit(1)

                if (historico && historico.length > 0) {
                    hasIndividual = true
                }
            }

            // 8. Check GROUP cleaning schedule (escala_limpeza table)
            if (sessao.grupo_id) {
                const { data: limpeza } = await supabase
                    .from('escala_limpeza')
                    .select('id')
                    .eq('grupo_id', sessao.grupo_id)
                    .eq('data_inicio', weekStartStr)
                    .limit(1)

                if (limpeza && limpeza.length > 0) {
                    collectiveMessages.push('Limpeza do Salão')
                }
            }

            // 9. Build the final message
            if (collectiveMessages.length === 0 && !hasIndividual) {
                setLoading(false)
                return
            }

            const parts: string[] = []

            if (hasIndividual) {
                parts.push('Você tem compromisso designado para esta semana')
            }

            if (collectiveMessages.length > 0) {
                parts.push(collectiveMessages.join(', '))
            }

            setMessage(parts.join(' • '))
            setVisible(true)
        } catch (err) {
            console.error('Erro ao verificar notificações semanais:', err)
        } finally {
            setLoading(false)
        }
    }

    function handleDismiss() {
        const dismissKey = getDismissKey()
        localStorage.setItem(dismissKey, 'true')
        setVisible(false)
    }

    if (loading || !visible) return null

    return (
        <div
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg z-50"
            role="alert"
            style={{
                animation: 'slideDown 0.4s ease-out'
            }}
        >
            <style jsx>{`
                @keyframes slideDown {
                    from {
                        transform: translateY(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `}</style>
            <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <Bell className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-sm md:text-base font-medium truncate">
                        📢 {message}
                    </p>
                </div>
                <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 p-1.5 rounded-full hover:bg-white/20 transition-colors"
                    aria-label="Fechar aviso"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    )
}
