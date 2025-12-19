'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { Database } from '@/types/database.types'

type Programacao = Database['public']['Tables']['programacao_semanal']['Row']

export default function DesignacoesDashboard() {
    const [programacoes, setProgramacoes] = useState<Programacao[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchProgramacoes()
    }, [])

    const fetchProgramacoes = async () => {
        try {
            const { data, error } = await supabase
                .from('programacao_semanal')
                .select('*')
                .order('data_reuniao', { ascending: true })

            if (error) throw error
            setProgramacoes(data || [])
        } catch (error) {
            console.error('Erro ao buscar programações:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-8">Carregando...</div>

    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Designações - Vida e Ministério</h1>
                <div className="h-1 w-20 bg-primary mx-auto rounded-full"></div>
            </div>

            <div className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                        <thead className="bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Data</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Semana</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                            {programacoes.map((prog) => (
                                <tr key={prog.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 dark:text-white">
                                        {new Date(prog.data_reuniao + 'T00:00:00').toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                        {prog.semana_descricao}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link
                                            href={`/admin/designacoes/${prog.id}`}
                                            className="inline-flex items-center gap-1 text-primary hover:text-blue-700 font-bold transition-all group-hover:translate-x-1"
                                        >
                                            Gerenciar Designações <span>→</span>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {programacoes.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center">
                                        <div className="text-4xl mb-2">📅</div>
                                        <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhuma programação encontrada.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
