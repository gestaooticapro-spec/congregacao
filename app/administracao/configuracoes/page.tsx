'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { useAuth } from '@/contexts/AuthProvider'
import { supabase } from '@/lib/supabaseClient'

export default function ConfiguracoesPage() {
    const { loading: authLoading, hasRole } = useAuth()
    const podeAlterar = hasRole(['ADMIN', 'COORDENADOR'])
    const [habilitada, setHabilitada] = useState(true)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [aviso, setAviso] = useState<string | null>(null)
    const [carregou, setCarregou] = useState(false)

    useEffect(() => {
        if (authLoading || !podeAlterar) {
            if (!authLoading) setLoading(false)
            return
        }

        const load = async () => {
            const { data, error } = await supabase
                .from('dados_congregacao')
                .select('confirmacao_designacao_habilitada')
                .eq('id', true)
                .maybeSingle()

            if (error) {
                console.error('Erro ao carregar configurações:', error)
                setAviso('Não foi possível carregar as configurações. Aplique a migração do banco e tente de novo.')
            } else {
                setHabilitada(data?.confirmacao_designacao_habilitada !== false)
                setCarregou(true)
            }
            setLoading(false)
        }

        void load()
    }, [authLoading, podeAlterar])

    const alterar = async (proxima: boolean) => {
        const anterior = habilitada
        setHabilitada(proxima)
        setSaving(true)
        setAviso(null)

        const { error } = await supabase.rpc('salvar_confirmacao_designacao_habilitada', {
            p_habilitada: proxima,
        })

        setSaving(false)
        if (error) {
            console.error('Erro ao salvar configuração:', error)
            setHabilitada(anterior)
            setAviso('Não foi possível salvar esta configuração.')
            return
        }
    }

    if (authLoading || loading) {
        return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Carregando...</div>
    }

    if (!podeAlterar) {
        return <div className="p-8 text-center text-slate-600 dark:text-slate-300">Você não tem permissão para alterar estas configurações.</div>
    }

    return (
        <div className="w-full min-w-0 pb-24">
            <PageHeader
                className="mb-12"
                title="Configurações"
                subtitle="Opções gerais da congregação."
                backHref="/administracao"
                backLabel="Administração"
            />

            <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-4 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Confirmação de designação</h2>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            Com a opção ligada, o link enviado pelo WhatsApp mostra os botões para aceitar ou recusar.
                            Desligada, a tela só informa a designação.
                        </p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={habilitada}
                        aria-label="Habilitar botões de aceitar ou recusar designação"
                        disabled={saving || !carregou}
                        onClick={() => void alterar(!habilitada)}
                        className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${habilitada ? 'bg-green-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                    >
                        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${habilitada ? 'left-5' : 'left-0.5'}`} />
                    </button>
                </div>

                {carregou && (
                    <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                        {saving ? (
                            <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</span>
                        ) : habilitada ? 'Os botões de aceitar e recusar estão ativos.' : 'A confirmação enviada está somente informativa.'}
                    </p>
                )}
                {aviso && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{aviso}</p>}
            </div>
        </div>
    )
}
