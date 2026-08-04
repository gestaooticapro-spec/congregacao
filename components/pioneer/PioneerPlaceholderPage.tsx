'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Construction } from 'lucide-react'

interface PioneerPlaceholderPageProps {
    title: string
    description: string
}

export default function PioneerPlaceholderPage({ title, description }: PioneerPlaceholderPageProps) {
    const router = useRouter()
    const [hasAccess, setHasAccess] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem('membro_sessao')
        if (!stored) return router.replace('/')

        try {
            if (!JSON.parse(stored).is_pioneiro) return router.replace('/')
            const timeout = window.setTimeout(() => setHasAccess(true), 0)
            return () => window.clearTimeout(timeout)
        } catch {
            router.replace('/')
        }
    }, [router])

    if (!hasAccess) return null

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-6">
            <div className="max-w-md mx-auto">
                <button
                    onClick={() => router.push('/painel-pioneiro')}
                    className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-900 dark:hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" /> Painel do Pioneiro
                </button>
                <section className="mt-12 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                        <Construction className="h-7 w-7" />
                    </div>
                    <h1 className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
                    <p className="mt-3 leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
                    <span className="mt-6 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">EM DESENVOLVIMENTO</span>
                </section>
            </div>
        </main>
    )
}
