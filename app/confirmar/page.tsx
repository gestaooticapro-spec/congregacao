'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type ConfirmationData = {
    membro_nome: string
    data: string
    status: string
    parte_nome: string
    ajudante_nome: string | null
}

function ConfirmarContent() {
    const searchParams = useSearchParams()
    const id = searchParams.get('id')
    const membroId = searchParams.get('membro')
    const role = searchParams.get('role')
    const type = searchParams.get('type')

    const [loading, setLoading] = useState(true)
    const [info, setInfo] = useState<ConfirmationData | null>(null)
    const [status, setStatus] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            if (!id || !membroId) {
                setError('Link inválido.')
                setLoading(false)
                return
            }

            try {
                const { data, error: rpcError } = await supabase.rpc('obter_confirmacao_designacao', {
                    p_id: id,
                    p_membro_id: membroId,
                    p_role: role,
                    p_tipo: type === 'hospitalidade' ? 'hospitalidade' : 'programacao',
                })
                if (rpcError) throw rpcError

                const confirmation = data as ConfirmationData | null
                if (!confirmation) throw new Error('Link inválido ou designação alterada.')

                setInfo(confirmation)
                setStatus(confirmation.status)
            } catch (fetchError) {
                console.error(fetchError)
                setError('Não foi possível carregar esta confirmação.')
            } finally {
                setLoading(false)
            }
        }

        void fetchData()
    }, [id, membroId, role, type])

    const handleResponse = async (newStatus: 'accepted' | 'declined') => {
        if (!id || !membroId) return
        setLoading(true)

        try {
            const { data: updated, error: rpcError } = await supabase.rpc('responder_confirmacao_designacao', {
                p_id: id,
                p_membro_id: membroId,
                p_status: newStatus,
                p_role: role,
                p_tipo: type === 'hospitalidade' ? 'hospitalidade' : 'programacao',
            })
            if (rpcError) throw rpcError
            if (!updated) throw new Error('Designação alterada ou removida.')

            setStatus(newStatus)
            alert(newStatus === 'accepted' ? 'Designação aceita com sucesso!' : 'Designação recusada.')
        } catch (responseError) {
            console.error(responseError)
            alert('Não foi possível atualizar a confirmação.')
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-8 text-center">Carregando...</div>
    if (error || !info) return <div className="p-8 text-center text-red-600">{error || 'Link inválido.'}</div>

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Confirmação de Designação</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Olá, <span className="font-semibold">{info.membro_nome}</span>!
                </p>

                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 mb-8">
                    <p className="text-sm text-blue-600 dark:text-blue-400 uppercase tracking-wide font-semibold mb-1">Data</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        {new Date(`${info.data}T00:00:00`).toLocaleDateString('pt-BR')}
                    </p>

                    <p className="text-sm text-blue-600 dark:text-blue-400 uppercase tracking-wide font-semibold mb-1">Parte</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">{info.parte_nome}</p>
                    {info.ajudante_nome && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                            <span className="font-semibold text-blue-600 dark:text-blue-400 uppercase text-xs tracking-wide">Ajudante: </span>
                            {info.ajudante_nome}
                        </p>
                    )}
                </div>

                {status === 'pending' && (
                    <div className="space-y-3">
                        <button onClick={() => handleResponse('accepted')} className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors">
                            Aceitar Designação
                        </button>
                        <button onClick={() => handleResponse('declined')} className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors">
                            Não posso cuidar
                        </button>
                    </div>
                )}

                {status === 'accepted' && (
                    <div className="text-green-600 dark:text-green-400">
                        <p className="text-lg font-medium">Designação aceita!</p>
                        <p className="text-sm mt-1">Obrigado por confirmar.</p>
                    </div>
                )}

                {status === 'declined' && (
                    <div className="text-red-600 dark:text-red-400">
                        <p className="text-lg font-medium">Designação recusada</p>
                        <p className="text-sm mt-1">O irmão responsável será notificado.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function ConfirmarPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <ConfirmarContent />
        </Suspense>
    )
}
