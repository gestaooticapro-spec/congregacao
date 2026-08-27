'use client'

import { useState } from 'react'
import EventosCongregacao from '@/components/admin/eventos/EventosCongregacao'
import EventosAnciaos from '@/components/admin/eventos/EventosAnciaos'

export default function AdminEventosPage() {
    const [activeTab, setActiveTab] = useState<'congregacao' | 'anciaos'>('congregacao')

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Gerenciar Eventos</h1>

            {/* Tabs */}
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

            {/* Content */}
            {activeTab === 'congregacao' ? <EventosCongregacao /> : <EventosAnciaos />}
        </div>
    )
}
