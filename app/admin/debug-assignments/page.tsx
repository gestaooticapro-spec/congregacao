'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

import { restoreAssignments } from '@/app/actions/restore.actions'

export default function DebugAssignmentsPage() {
    const [data, setData] = useState<any[]>([])
    const [history, setHistory] = useState<any[]>([])
    const [membros, setMembros] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [restoring, setRestoring] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        const { data: programacao } = await supabase
            .from('programacao_semanal')
            .select('*')
            .order('data_reuniao', { ascending: false })

        const { data: hist } = await supabase
            .from('historico_designacoes')
            .select('*')
            .order('data_reuniao', { ascending: false })

        const { data: mem } = await supabase
            .from('membros')
            .select('id, nome_completo')

        setData(programacao || [])
        setHistory(hist || [])
        setMembros(mem || [])
        setLoading(false)
    }

    const handleRestore = async () => {
        setRestoring(true)
        const res = await restoreAssignments()
        if (res.error) {
            alert('Erro: ' + res.error)
        } else {
            alert('Restauração concluída: \n' + res.results?.join('\n'))
            loadData()
        }
        setRestoring(false)
    }

    const getMemberName = (id: string) => {
        return membros.find(m => m.id === id)?.nome_completo || id
    }

    if (loading) return <div className="p-8 text-gray-900">Carregando debug...</div>

    return (
        <div className="p-8 bg-white min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Debug Programação & Histórico</h1>
                <button
                    onClick={handleRestore}
                    disabled={restoring}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                >
                    {restoring ? 'Restaurando...' : '🚑 Tentar Restaurar Novamente'}
                </button>
            </div>
            <div className="space-y-8">
                {data.map((item) => {
                    const itemHistory = history.filter(h => h.programacao_id === item.id)

                    return (
                        <div key={item.id} className="border border-gray-300 p-6 rounded-lg bg-gray-50 shadow-sm">
                            <h3 className="font-bold text-xl text-gray-900 mb-4 border-b pb-2 border-gray-200">
                                {new Date(item.data_reuniao).toLocaleDateString('pt-BR')} - {item.semana_descricao}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold text-blue-800 mb-2">Histórico (O que estava salvo)</h4>
                                    {itemHistory.length === 0 ? (
                                        <p className="text-gray-500 italic">Sem histórico encontrado.</p>
                                    ) : (
                                        <ul className="space-y-1 text-sm">
                                            {itemHistory.map((h: any) => (
                                                <li key={h.id} className="flex justify-between border-b border-gray-200 py-1">
                                                    <span className="font-medium text-gray-700">{h.parte_descricao}:</span>
                                                    <span className="text-gray-900">{getMemberName(h.membro_id)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>

                                <div>
                                    <h4 className="font-semibold text-green-800 mb-2">Estrutura Atual (JSON)</h4>
                                    <pre className="text-xs overflow-auto max-h-60 bg-gray-100 p-3 rounded border border-gray-300 text-gray-800">
                                        {JSON.stringify(item.partes, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
