'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import PioneerDashboard from '@/components/pioneer/PioneerDashboard'

interface SessaoMembro {
    id: string
    nome: string
    is_pioneiro: boolean
    pin: string
}

export default function AtividadesPioneiroPage() {
    const router = useRouter()
    const [sessao, setSessao] = useState<SessaoMembro | null>(null)

    useEffect(() => {
        const stored = localStorage.getItem('membro_sessao')
        if (!stored) return router.replace('/')

        try {
            const parsed: SessaoMembro = JSON.parse(stored)
            if (!parsed.is_pioneiro || !parsed.pin) return router.replace('/')

            const timeout = window.setTimeout(() => setSessao(parsed), 0)
            return () => window.clearTimeout(timeout)
        } catch {
            router.replace('/')
        }
    }, [router])

    if (!sessao) return null

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            <div className="max-w-5xl mx-auto px-4 py-2">
                <button
                    onClick={() => router.push('/painel-pioneiro')}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-900 dark:hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" /> Painel do Pioneiro
                </button>
                <PioneerDashboard
                    membroId={sessao.id}
                    pin={sessao.pin}
                    onOnboardingCompleted={() => router.replace('/painel-pioneiro')}
                />
            </div>
        </div>
    )
}
