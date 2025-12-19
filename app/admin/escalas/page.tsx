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

    const isWeekend = (dateString: string) => {
        if (!dateString) return false
        const [year, month, day] = dateString.split('-').map(Number)
        const date = new Date(year, month - 1, day)
        const dayOfWeek = date.getDay()
        return dayOfWeek === 0 || dayOfWeek === 6
    }

    if (loading) return <div className="p-8">Carregando...</div>

    return (
        <div className="max-w-7xl mx-auto p-8 pb-24 print:max-w-none print:p-0">
            <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 print:hidden">
                <div className="text-center md:text-left">
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Designações Mecânicas</h1>
                    <div className="h-1 w-20 bg-primary rounded-full mx-auto md:mx-0"></div>
                </div>

                <div className="flex flex-wrap justify-center items-center gap-4">
                    <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-300 font-medium px-4 py-2"
                        >
                            {months.map((month, index) => (
                                <option key={month} value={index}>{month}</option>
                            ))}
                        </select>
                        <div className="w-px bg-slate-200 dark:bg-slate-700 my-2"></div>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-300 font-medium px-4 py-2"
                        >
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handlePrint}
                        className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all shadow-lg shadow-slate-200 dark:shadow-none flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Imprimir
                    </button>

                    <button
                        onClick={handleNew}
                        className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Nova Escala
                    </button>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-4 text-center">
                <h1 className="text-xl font-bold text-slate-900 mb-1">Designação Mecânica</h1>
                <p className="text-sm text-slate-600 font-medium">{months[selectedMonth]} de {selectedYear}</p>
                <div className="h-0.5 w-16 bg-primary mx-auto mt-2 rounded-full"></div>
            </div>

            {/* Screen View */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 print:hidden">
                {filteredSummaries.map((summary) => (
                    <div
                        key={summary.data}
                        onClick={() => router.push(`/admin/escalas/${summary.data}`)}
                        className="group bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 p-6 cursor-pointer hover:border-primary/50 hover:-translate-y-1 transition-all"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl group-hover:bg-primary/5 transition-colors">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                                    {new Date(summary.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}
                                </h3>
                                <p className="text-primary font-bold">
                                    {new Date(summary.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                                </p>
                            </div>
                            <span className="bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1 rounded-full border border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                                {summary.count} designações
                            </span>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-end">
                            <span className="text-primary text-sm font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                Gerenciar <span>→</span>
                            </span>
                        </div>
                    </div>
                ))}

                {filteredSummaries.length === 0 && (
                    <div className="col-span-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-20 text-center">
                        <div className="text-4xl mb-4">⚙️</div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">
                            Nenhuma escala encontrada para este período.
                        </p>
                    </div>
                )}
            </div>

            {/* Print View */}
            <div className="hidden print:grid print:grid-cols-4 print:gap-2">
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
                        <div key={date} className="break-inside-avoid bg-white border border-slate-200 rounded-xl p-2 shadow-sm print:border-slate-300">
                            <div className="text-center mb-2 pb-1 border-b border-slate-100">
                                <h3 className="font-bold text-slate-900 uppercase text-[10px]">
                                    {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '')}
                                </h3>
                            </div>

                            <div className="space-y-1">
                                {isWeekend(date) && (
                                    <div className="space-y-1 mb-1 border-b border-slate-100 pb-1">
                                        <div className="flex justify-between items-center bg-slate-50 p-1 rounded">
                                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Pres.</span>
                                            <span className="text-[9px] font-bold text-slate-900 truncate max-w-[80px]">{formatName(getAssignment('PRESIDENTE')?.membro?.nome_completo)}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-slate-50 p-1 rounded">
                                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Leitor</span>
                                            <span className="text-[9px] font-bold text-slate-900 truncate max-w-[80px]">{formatName(getAssignment('LEITOR_SENTINELA')?.membro?.nome_completo)}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between items-center bg-slate-50 p-1 rounded">
                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Som</span>
                                    <span className="text-[9px] font-bold text-slate-900 truncate max-w-[80px]">{formatName(som?.membro?.nome_completo)}</span>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block px-1">Mics</span>
                                    <div className="grid grid-cols-2 gap-1">
                                        <div className="bg-slate-50 p-1 rounded text-center">
                                            <span className="text-[9px] font-bold text-slate-900 truncate block">{formatName(mic1?.membro?.nome_completo)}</span>
                                        </div>
                                        <div className="bg-slate-50 p-1 rounded text-center">
                                            <span className="text-[9px] font-bold text-slate-900 truncate block">{formatName(mic2?.membro?.nome_completo)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block px-1">Indic.</span>
                                    <div className="grid grid-cols-2 gap-1">
                                        <div className="bg-slate-50 p-1 rounded">
                                            <span className="text-[7px] text-slate-500 block">Aud.</span>
                                            <span className="text-[9px] font-bold text-slate-900 truncate block">{formatName(indAuditorio?.membro?.nome_completo)}</span>
                                        </div>
                                        <div className="bg-slate-50 p-1 rounded">
                                            <span className="text-[7px] text-slate-500 block">Ent.</span>
                                            <span className="text-[9px] font-bold text-slate-900 truncate block">{formatName(indEntrada?.membro?.nome_completo)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}

                {detailedAssignments.length === 0 && (
                    <div className="col-span-2 text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <p className="text-slate-500 font-medium">Nenhuma designação encontrada para este mês.</p>
                    </div>
                )}
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0.5cm;
                    }
                    body {
                        background: white !important;
                        color: black !important;
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
