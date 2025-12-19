'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { Database } from '@/types/database.types'

type Programacao = Database['public']['Tables']['programacao_semanal']['Row']

export default function ProgramacaoPage() {
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
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Programação Semanal</h1>
                <Link
                    href="/programacao/nova"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                    Nova Programação
                </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {programacoes.map((prog) => (
                    <div key={prog.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                            {new Date(prog.data_reuniao + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">{prog.semana_descricao}</p>
                        <div className="flex justify-between items-center">
                            <Link
                                href={`/admin/designacoes/${prog.id}`}
                                className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium text-sm"
                            >
                                Ver Designações →
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

            {programacoes.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    Nenhuma programação encontrada. Clique em "Nova Programação" para começar.
                </div>
            )}
        </div>
    )
}
