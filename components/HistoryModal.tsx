'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface HistoryModalProps {
    membroId: string | null
    membroNome: string
    roleName: string
    isOpen: boolean
    onClose: () => void
}

interface HistoricoItem {
    id: string
    data_reuniao: string
    parte_descricao: string
    membro?: { nome_completo: string }
}

export default function HistoryModal({ membroId, membroNome, roleName, isOpen, onClose }: HistoryModalProps) {
    const [memberHistory, setMemberHistory] = useState<HistoricoItem[]>([])
    const [partHistory, setPartHistory] = useState<HistoricoItem[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            fetchHistory()
        }
    }, [isOpen, membroId, roleName])

    const fetchHistory = async () => {
        setLoading(true)
        try {
            // 1. Fetch Member History (Last 5 assignments for this member)
            if (membroId) {
                const { data: memberData, error: memberError } = await supabase
                    .from('historico_designacoes')
                    .select('*')
                    .eq('membro_id', membroId)
                    .order('data_reuniao', { ascending: false })
                    .limit(5)

                if (memberError) throw memberError
                setMemberHistory(memberData || [])
            }

            // 2. Fetch Part History (Last 5 assignments for this part type)
            if (roleName) {
                const { data: partData, error: partError } = await supabase
                    .from('historico_designacoes')
                    .select('*, membro:membros(nome_completo)')
                    .ilike('parte_descricao', `${roleName}%`)
                    .order('data_reuniao', { ascending: false })
                    .limit(5)

                if (partError) throw partError
                setPartHistory(partData || [])
            }

        } catch (error) {
            console.error('Erro ao buscar histórico:', error)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <h3 className="font-bold text-slate-900 dark:text-white">
                        Histórico
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Column 1: Member History */}
                    <div>
                        <h4 className="font-semibold text-purple-600 mb-4 flex items-center gap-2">
                            👤 Últimas de {membroNome}
                        </h4>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <span className="animate-spin text-2xl">⏳</span>
                            </div>
                        ) : memberHistory.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                Nenhuma designação recente.
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {memberHistory.map((item) => (
                                    <li key={item.id} className="flex flex-col bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                                            {format(parseISO(item.data_reuniao), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                        </span>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {item.parte_descricao}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Column 2: Part History */}
                    <div>
                        <h4 className="font-semibold text-blue-600 mb-4 flex items-center gap-2">
                            📋 Últimos em "{roleName}"
                        </h4>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <span className="animate-spin text-2xl">⏳</span>
                            </div>
                        ) : partHistory.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                Ninguém designado recentemente para esta parte.
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {partHistory.map((item) => (
                                    <li key={item.id} className="flex flex-col bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                                            {format(parseISO(item.data_reuniao), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                        </span>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {item.membro?.nome_completo || 'Desconhecido'}
                                        </span>
                                        <span className="text-xs text-slate-500 truncate mt-1">
                                            {item.parte_descricao}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    )
}
