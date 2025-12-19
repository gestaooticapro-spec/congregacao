'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'

type AssignmentSummary = {
    data: string
    count: number
}

type SupportAssignment = Database['public']['Tables']['designacoes_suporte']['Row'] & {
    membro: {
        nome_completo: string
    } | null
}

export default function EscalasSuportePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [summaries, setSummaries] = useState<AssignmentSummary[]>([])
    const [detailedAssignments, setDetailedAssignments] = useState<SupportAssignment[]>([])

    // Filter State
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

    useEffect(() => {
        fetchSummaries()
    }, [])

    useEffect(() => {
        fetchDetailedAssignments()
    }, [selectedMonth, selectedYear])

    const fetchSummaries = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('designacoes_suporte')
                .select('data')
                .order('data', { ascending: false })

            if (error) throw error

            const uniqueDates = new Set(data.map(d => d.data))
            const summaryList = Array.from(uniqueDates).map(date => ({
                data: date,
                count: data.filter(d => d.data === date).length
            }))

            setSummaries(summaryList)

        } catch (error) {
            console.error('Erro ao carregar escalas:', error)
            alert('Erro ao carregar escalas.')
        } finally {
            setLoading(false)
        }
    }

    const fetchDetailedAssignments = async () => {
        // Calculate start and end date for the selected month
        const startDate = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0]
        const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0]

        try {
            const { data, error } = await supabase
                .from('designacoes_suporte')
                .select(`
                    *,
                    membro:membros(nome_completo)
                `)
                .gte('data', startDate)
                .lte('data', endDate)
                .order('data', { ascending: true })

            if (error) throw error
            setDetailedAssignments(data as any || [])

        } catch (error) {
            console.error('Erro ao carregar detalhes:', error)
        }
    }

    const handleNew = () => {
        router.push('/admin/escalas/nova')
    }

    const handlePrint = () => {
        window.print()
    }

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i)

    // Group detailed assignments by date
    const groupedAssignments: Record<string, SupportAssignment[]> = {}
    detailedAssignments.forEach(a => {
        if (!groupedAssignments[a.data]) {
            groupedAssignments[a.data] = []
        }
        groupedAssignments[a.data].push(a)
    })

    // Filter summaries for screen view
    const filteredSummaries = summaries.filter(s => {
        const date = new Date(s.data + 'T00:00:00')
        return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear
    })

    const getRoleLabel = (role: string) => {
        const roles: Record<string, string> = {
            'SOM': 'Som',
            'MICROFONE_1': 'Microfone 1',
            'MICROFONE_2': 'Microfone 2',
            'INDICADOR_ENTRADA': 'Indicador (Entrada)',
            'INDICADOR_AUDITORIO': 'Indicador (Auditório)',
            'VIDEO': 'Vídeo',
            'PRESIDENTE': 'Presidente'
        }
        return roles[role] || role
    }

    if (loading) return <div className="p-8">Carregando...</div>

    return (
        <div className="max-w-7xl mx-auto p-8 pb-24">
            <div className="flex justify-between items-center mb-8 print:hidden">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Designações Mecânicas</h1>

                <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            {months.map((month, index) => (
                                <option key={month} value={index}>{month}</option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Imprimir Mês
                    </button>

                    <button
                        onClick={handleNew}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Nova Escala
                    </button>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-8 text-center">
                <h1 className="text-2xl font-bold text-black mb-2">Designação Mecânica</h1>
                <h2 className="text-xl text-black">{months[selectedMonth]} de {selectedYear}</h2>
            </div>

            {/* Screen View */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
                {filteredSummaries.map((summary) => (
                    <div
                        key={summary.data}
                        onClick={() => router.push(`/admin/escalas/${summary.data}`)}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {new Date(summary.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">
                                    {new Date(summary.data + 'T00:00:00').getFullYear()}
                                </p>
                            </div>
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                                {summary.count} designações
                            </span>
                        </div>
                    </div>
                ))}

                {filteredSummaries.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        Nenhuma escala encontrada para este período.
                    </div>
                )}
            </div>

            {/* Print View */}
            <div className="hidden print:grid print:grid-cols-2 print:gap-4">
                {Object.entries(groupedAssignments).map(([date, assignments]) => {
                    const getAssignment = (role: string) => {
                        return assignments.find(a => a.funcao === role)
                    }

                    const formatName = (fullName: string | undefined) => {
                        if (!fullName) return '________________'
                        const names = fullName.split(' ')
                        return names.slice(0, 2).join(' ')
                    }

                    const som = getAssignment('SOM')
                    const mic1 = getAssignment('MICROFONE_1')
                    const mic2 = getAssignment('MICROFONE_2')
                    const indEntrada = getAssignment('INDICADOR_ENTRADA')
                    const indAuditorio = getAssignment('INDICADOR_AUDITORIO')

                    return (
                        <div key={date} className="break-inside-avoid border border-gray-300 rounded p-3 text-sm">
                            <h3 className="font-bold text-black mb-2 uppercase border-b border-gray-200 pb-1 text-center bg-gray-50">
                                {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h3>

                            <div className="space-y-2">
                                {/* Som */}
                                <div className="flex justify-between items-center border-b border-gray-100 pb-1">
                                    <span className="font-bold text-gray-700">Som:</span>
                                    <span className="font-medium">{formatName(som?.membro?.nome_completo)}</span>
                                </div>

                                {/* Microfones */}
                                <div className="border-b border-gray-100 pb-1">
                                    <span className="font-bold text-gray-700 block mb-1">Microfones:</span>
                                    <div className="flex justify-end gap-2 text-xs">
                                        <span>{formatName(mic1?.membro?.nome_completo)}</span>
                                        {mic2?.membro?.nome_completo && <span>/ {formatName(mic2.membro.nome_completo)}</span>}
                                    </div>
                                </div>

                                {/* Indicadores */}
                                <div>
                                    <span className="font-bold text-gray-700 block mb-1">Indicadores:</span>
                                    <div className="flex flex-col items-end text-xs gap-1">
                                        <div className="flex justify-between w-full">
                                            <span className="text-gray-500">Auditório:</span>
                                            <span>{formatName(indAuditorio?.membro?.nome_completo)}</span>
                                        </div>
                                        <div className="flex justify-between w-full">
                                            <span className="text-gray-500">Entrada:</span>
                                            <span>{formatName(indEntrada?.membro?.nome_completo)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}

                {detailedAssignments.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-gray-500">
                        Nenhuma designação encontrada para este mês.
                    </div>
                )}
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        margin: 2cm;
                    }
                    body {
                        background: white;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .print\\:block {
                        display: block !important;
                    }
                }
            `}</style>
        </div>
    )
}
