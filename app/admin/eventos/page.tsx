'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import EventosCongregacao from '@/components/admin/eventos/EventosCongregacao'
import EventosAnciaos from '@/components/admin/eventos/EventosAnciaos'
import PageHeader from '@/components/PageHeader'
import { useAuth } from '@/contexts/AuthProvider'

type EventosTab = 'congregacao' | 'anciaos'

function parseTab(value: string | null): EventosTab {
    return value === 'anciaos' ? 'anciaos' : 'congregacao'
}

function AdminEventosContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user, session, loading: authLoading } = useAuth()
    const activeTab = parseTab(searchParams.get('aba'))

    useEffect(() => {
        if (!authLoading && (!user || !session)) {
            router.replace('/login')
        }
    }, [authLoading, user, session, router])

    const setActiveTab = (tab: EventosTab) => {
        router.replace(`/admin/eventos?aba=${tab}`)
    }

    const backHref = activeTab === 'anciaos' ? '/admin/agenda' : '/calendario'

    if (authLoading || !user || !session) {
        return <div className="p-8 text-center text-slate-500">Carregando...</div>
    }

    return (
        <div className="w-full min-w-0 max-w-6xl mx-auto px-2 py-4 md:p-8 overflow-x-clip">
            <PageHeader
                title="Gerenciar Eventos"
                backHref={backHref}
                backLabel=""
            />

            <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-8 w-fit">
                <button
                    onClick={() => setActiveTab('congregacao')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'congregacao'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    Congregação
                </button>
                <button
                    onClick={() => setActiveTab('anciaos')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'anciaos'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    Anciãos
                </button>
            </div>

            {activeTab === 'congregacao' ? <EventosCongregacao /> : <EventosAnciaos />}
        </div>
    )
}

export default function AdminEventosPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Carregando...</div>}>
            <AdminEventosContent />
        </Suspense>
    )
}
