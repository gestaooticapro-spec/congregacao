'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Clock3, FileText, MapPinned, CalendarDays, ChevronRight, Sparkles } from 'lucide-react'
import PioneerDashboard from '@/components/pioneer/PioneerDashboard'
import { supabase } from '@/lib/supabaseClient'

interface SessaoMembro {
    id: string
    nome: string
    is_pioneiro: boolean
    pin: string
}

type View = 'menu' | 'onboarding'

export default function PainelPioneiroPage() {
    const router = useRouter()
    const [sessao, setSessao] = useState<SessaoMembro | null>(null)
    const [view, setView] = useState<View>('menu')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const loadPioneerPanel = async () => {
            const stored = localStorage.getItem('membro_sessao')
            if (!stored) {
                router.replace('/')
                return
            }

            try {
                const parsed: SessaoMembro = JSON.parse(stored)
                if (!parsed.is_pioneiro) {
                    toast.error('Acesso restrito a pioneiros.')
                    router.replace('/')
                    return
                }

                if (!parsed.pin) {
                    throw new Error('Sessao por PIN invalida.')
                }

                const [{ data: configuracao, error: membroError }, { data: activities, error: activitiesError }] = await Promise.all([
                    supabase.rpc('obter_configuracao_pioneiro', {
                        p_membro_id: parsed.id,
                        p_pin: parsed.pin
                    }),
                    supabase.rpc('listar_logs_pioneiro', {
                        p_membro_id: parsed.id,
                        p_pin: parsed.pin,
                    })
                ])
                if (membroError) throw membroError
                if (activitiesError) throw activitiesError
                if (!configuracao || typeof configuracao !== 'object' || Array.isArray(configuracao)) {
                    throw new Error('PIN invalido para este pioneiro.')
                }

                setSessao(parsed)
                if (!configuracao.pioneiro_onboarding_concluido && (activities?.length || 0) === 0) {
                    setView('onboarding')
                }
            } catch (error) {
                console.error('Error loading pioneer menu:', error)
                toast.error('Não foi possível abrir o Painel do Pioneiro.')
                router.replace('/')
            } finally {
                setIsLoading(false)
            }
        }

        void loadPioneerPanel()
    }, [router])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        )
    }

    if (!sessao) return null

    if (view === 'onboarding') {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
                <div className="max-w-5xl mx-auto px-4 py-2">
                    <PioneerDashboard
                        membroId={sessao.id}
                        pin={sessao.pin}
                        onOnboardingCompleted={() => setView('menu')}
                    />
                </div>
            </div>
        )
    }

    const firstName = sessao.nome.trim().split(' ')[0]
    const options = [
        {
            title: 'Minhas atividades',
            description: 'Marque suas horas e atividades no ministério.',
            href: '/painel-pioneiro/atividades',
            icon: Clock3,
            color: 'bg-blue-600',
            iconColor: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300'
        },
        {
            title: 'Histórico de relatórios',
            description: 'Consulte os relatórios enviados por ano de serviço.',
            href: '/painel-pioneiro/historico',
            icon: FileText,
            color: 'bg-violet-600',
            iconColor: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300'
        },
        {
            title: 'Estudos e revisitas',
            description: 'Organize revisitas, locais e transferências.',
            href: '/painel-pioneiro/estudos-revisitas',
            icon: MapPinned,
            color: 'bg-emerald-600',
            iconColor: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300'
        },
        {
            title: 'Calendário e planejamento',
            description: 'Planeje campo, carrinho, cartas e outras atividades.',
            href: '/painel-pioneiro/calendario',
            icon: CalendarDays,
            color: 'bg-amber-600',
            iconColor: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300'
        }
    ]

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-6">
            <div className="max-w-md mx-auto">
                <div className="mb-8 pt-3">
                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        <Sparkles className="w-4 h-4" /> Painel do Pioneiro
                    </div>
                    <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Olá, {firstName}</h1>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">O que você gostaria de fazer?</p>
                </div>

                <div className="space-y-3">
                    {options.map(({ title, description, href, icon: Icon, color, iconColor }) => (
                        <button
                            key={href}
                            onClick={() => router.push(href)}
                            className="w-full text-left rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconColor}`}>
                                    <Icon className="h-6 w-6" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <h2 className="font-bold text-slate-800 dark:text-white">{title}</h2>
                                    </div>
                                    <p className="mt-1 text-sm leading-snug text-slate-500 dark:text-slate-400">{description}</p>
                                </div>
                                <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </main>
    )
}
