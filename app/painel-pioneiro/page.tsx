'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import PioneerDashboard from '@/components/pioneer/PioneerDashboard'
import { ArrowLeft, LayoutDashboard } from 'lucide-react'

interface SessaoMembro {
    id: string
    nome: string
    is_pioneiro: boolean
}

export default function PainelPioneiroPage() {
    const router = useRouter()
    const [sessao, setSessao] = useState<SessaoMembro | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const stored = localStorage.getItem('membro_sessao')
        if (!stored) {
            router.replace('/')
            return
        }

        try {
            const parsed = JSON.parse(stored)
            if (!parsed.is_pioneiro) {
                toast.error('Acesso restrito a pioneiros.')
                router.replace('/')
                return
            }
            setSessao(parsed)
        } catch (e) {
            router.replace('/')
        } finally {
            setIsLoading(false)
        }
    }, [router])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (!sessao) return null

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            <div className="max-w-5xl mx-auto px-4 py-2">
                <PioneerDashboard membroId={sessao.id} nome={sessao.nome} />
            </div>
        </div>
    )
}
