'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthProvider'
import PageHeader from '@/components/PageHeader'
import TemasTab from './TemasTab'
import DiscursosTab from './DiscursosTab'

type Aba = 'TEMAS' | 'DISCURSOS'

export default function MeusDiscursosPage() {
    const { user, loading: authLoading } = useAuth()

    const [membroId, setMembroId] = useState<string | null>(null)
    const [membroNome, setMembroNome] = useState('')
    const [resolving, setResolving] = useState(true)
    const [notLinked, setNotLinked] = useState(false)
    const [notElder, setNotElder] = useState(false)
    const [activeTab, setActiveTab] = useState<Aba>('DISCURSOS')

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            setResolving(false)
            return
        }

        const resolve = async () => {
            setResolving(true)
            try {
                const { data: membro, error } = await supabase
                    .from('membros')
                    .select('id, nome_completo, is_anciao, is_servo_ministerial')
                    .eq('user_id', user.id)
                    .maybeSingle()

                if (error) throw error

                if (!membro) {
                    setNotLinked(true)
                    setResolving(false)
                    return
                }

                if (!membro.is_anciao && !membro.is_servo_ministerial) {
                    setNotElder(true)
                    setResolving(false)
                    return
                }

                setMembroId(membro.id)
                setMembroNome(membro.nome_completo)
            } catch (err) {
                console.error('Erro ao resolver membro:', err)
                setNotLinked(true)
            } finally {
                setResolving(false)
            }
        }

        resolve()
    }, [user, authLoading])

    if (authLoading || resolving) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <div className="animate-spin inline-block w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Carregando...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
                    <span className="text-5xl">🔒</span>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Acesso Restrito</h2>
                    <p className="text-slate-500 dark:text-slate-400">Você precisa estar logado para acessar esta página.</p>
                </div>
            </div>
        )
    }

    if (notLinked) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
                    <span className="text-5xl">⚠️</span>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Conta Não Vinculada</h2>
                    <p className="text-slate-500 dark:text-slate-400">Seu login não está vinculado a nenhum membro cadastrado. Peça ao administrador para vincular seu e-mail à sua ficha de membro.</p>
                </div>
            </div>
        )
    }

    if (notElder) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
                    <span className="text-5xl">📋</span>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sem Temas</h2>
                    <p className="text-slate-500 dark:text-slate-400">Esta funcionalidade é exclusiva para oradores (anciãos e servos ministeriais).</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8">
            <PageHeader
                title="Meus Discursos"
                subtitle={
                    <>
                        Discursos e temas de <span className="font-semibold text-slate-700 dark:text-slate-300">{membroNome}</span>
                    </>
                }
                backHref="/anciaos"
                backLabel="Anciãos"
            />

            <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
                <button
                    type="button"
                    onClick={() => setActiveTab('DISCURSOS')}
                    className={`px-1.5 sm:px-4 py-2 rounded-lg font-semibold text-[11px] sm:text-sm leading-tight text-center transition-all ${activeTab === 'DISCURSOS'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                >
                    Discursos
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('TEMAS')}
                    className={`px-1.5 sm:px-4 py-2 rounded-lg font-semibold text-[11px] sm:text-sm leading-tight text-center transition-all ${activeTab === 'TEMAS'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                >
                    Temas
                </button>
            </div>

            {membroId && activeTab === 'DISCURSOS' && (
                <DiscursosTab membroId={membroId} membroNome={membroNome} />
            )}
            {membroId && activeTab === 'TEMAS' && (
                <TemasTab membroId={membroId} membroNome={membroNome} />
            )}
        </div>
    )
}
