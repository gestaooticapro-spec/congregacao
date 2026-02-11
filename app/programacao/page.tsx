'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { Database } from '@/types/database.types'
import { format, startOfWeek, endOfWeek, isSameMonth, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Programacao = Database['public']['Tables']['programacao_semanal']['Row']

export default function ProgramacaoPage() {
    const [programacoes, setProgramacoes] = useState<Programacao[]>([])
    const [loading, setLoading] = useState(true)
    const [filterMode, setFilterMode] = useState<'proximas' | 'tudo'>('proximas')

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

    const formatWeekRange = (dateString: string) => {
        const date = new Date(dateString + 'T00:00:00')
        const start = startOfWeek(date, { weekStartsOn: 1 }) // Monday
        const end = endOfWeek(date, { weekStartsOn: 1 }) // Sunday

        if (isSameMonth(start, end)) {
            return `${format(start, 'd')} - ${format(end, 'd')} de ${format(end, 'MMMM', { locale: ptBR })}`
        } else {
            return `${format(start, "d 'de' MMMM", { locale: ptBR })} - ${format(end, "d 'de' MMMM", { locale: ptBR })}`
        }
    }

    if (loading) return <div className="p-8">Carregando...</div>

    const filteredProgramacoes = programacoes.filter(prog => {
        if (filterMode === 'tudo') return true

        const now = new Date()
        const startOfPrevMonth = startOfMonth(subMonths(now, 1))
        const endOfNextMonth = endOfMonth(addMonths(now, 1))

        const weekStart = startOfWeek(new Date(prog.data_reuniao + 'T00:00:00'), { weekStartsOn: 1 })

        return weekStart >= startOfPrevMonth && weekStart <= endOfNextMonth
    })

    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Programação Semanal</h1>
                    <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
                        <button
                            onClick={() => setFilterMode('proximas')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filterMode === 'proximas'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                        >
                            Mais Próximas
                        </button>
                        <button
                            onClick={() => setFilterMode('tudo')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filterMode === 'tudo'
                                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                        >
                            Mostrar Tudo
                        </button>
                    </div>
                </div>
                <Link
                    href="/programacao/nova"
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5"
                >
                    Nova Programação
                </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredProgramacoes.map((prog) => (
                    <div key={prog.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white capitalize">
                            {formatWeekRange(prog.data_reuniao)}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">{prog.semana_descricao}</p>
                        <div className="flex justify-between items-center">
                            <div className="flex gap-3">
                                <Link
                                    href={`/programacao/editar/${prog.id}`}
                                    className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 font-medium text-sm"
                                >
                                    Editar
                                </Link>
                                <Link
                                    href={`/admin/designacoes/${prog.id}`}
                                    className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium text-sm"
                                >
                                    Ver Designações →
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredProgramacoes.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    {filterMode === 'proximas'
                        ? 'Nenhuma programação encontrada para o período atual (mês anterior, atual e próximo).'
                        : 'Nenhuma programação encontrada. Clique em "Nova Programação" para começar.'}
                </div>
            )}
        </div>
    )
}
