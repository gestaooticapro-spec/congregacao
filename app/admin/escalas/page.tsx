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
                .order('data', { ascending: true })

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
        // Calculate start and end date for the selected month, extending to full weeks
        const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1)
        const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0)

        // Find Monday of the first week
        const startDayOfWeek = firstDayOfMonth.getDay()
        const startDiff = firstDayOfMonth.getDate() - startDayOfWeek + (startDayOfWeek === 0 ? -6 : 1)
        const startDate = new Date(firstDayOfMonth.setDate(startDiff)).toISOString().split('T')[0]

        // Find Sunday of the last week
        const endDayOfWeek = lastDayOfMonth.getDay()
        const endDiff = lastDayOfMonth.getDate() + (endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek)
        const endDate = new Date(lastDayOfMonth.setDate(endDiff)).toISOString().split('T')[0]

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

    // Group detailed assignments by week (Monday)
    const groupedByWeek = detailedAssignments.reduce((acc, curr) => {
        const date = new Date(curr.data + 'T00:00:00')
        const day = date.getDay()
        const diff = date.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(date.setDate(diff))
        const mondayStr = monday.toISOString().split('T')[0]

        if (!acc[mondayStr]) {
            acc[mondayStr] = []
        }
        acc[mondayStr].push(curr)
        return acc
    }, {} as Record<string, SupportAssignment[]>)

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

    // Filter weeks to only show those where the Monday is in the selected month
    const filteredGroupedByWeek = Object.entries(groupedByWeek)
        .filter(([mondayStr]) => {
            const monday = new Date(mondayStr + 'T00:00:00')
            return monday.getMonth() === selectedMonth && monday.getFullYear() === selectedYear
        })
        .sort((a, b) => a[0].localeCompare(b[0]))

    const handleDelete = async (e: React.MouseEvent, date: string) => {
        e.stopPropagation() // Prevent card click
        if (!confirm('Tem certeza que deseja excluir esta escala? Todas as designações desta data serão removidas.')) return

        try {
            const { error } = await supabase
                .from('designacoes_suporte')
                .delete()
                .eq('data', date)

            if (error) throw error

            // Update local state immediately
            setSummaries(prev => prev.filter(s => s.data !== date))
            setDetailedAssignments(prev => prev.filter(a => a.data !== date))

            // Refresh data to be sure
            fetchSummaries()
        } catch (error) {
            console.error('Erro ao excluir:', error)
            alert('Erro ao excluir escala.')
        }
    }

    if (loading) return <div className="p-8">Carregando...</div>

    return (
        <div className="max-w-7xl mx-auto p-8 pb-24 print:max-w-none print:p-0">
            <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 print:hidden">
                <div className="text-center md:text-left">
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Designações de Apoio</h1>
                    <div className="h-1 w-20 bg-primary rounded-full mx-auto md:mx-0"></div>
                </div>

                <div className="flex flex-wrap justify-center items-center gap-4">
                    <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white font-bold px-4 py-2 cursor-pointer"
                        >
                            {months.map((month, index) => (
                                <option key={month} value={index} className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white">
                                    {month}
                                </option>
                            ))}
                        </select>
                        <div className="w-px bg-slate-200 dark:bg-slate-700 my-2"></div>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white font-bold px-4 py-2 cursor-pointer"
                        >
                            {years.map(year => (
                                <option key={year} value={year} className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white">{year}</option>
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
                <h1 className="text-3xl font-bold text-slate-900 mb-1">Designação de Apoio</h1>
                <p className="text-lg text-slate-600 font-medium">{months[selectedMonth]} de {selectedYear}</p>
                <div className="h-0.5 w-16 bg-primary mx-auto mt-2 rounded-full"></div>
            </div>

            {/* Screen View */}
            <div className="grid grid-cols-1 gap-8 print:hidden">
                {filteredGroupedByWeek.map(([mondayStr, weekAssignments]) => {
                    const monday = new Date(mondayStr + 'T00:00:00')
                    const sunday = new Date(monday)
                    sunday.setDate(monday.getDate() + 6)

                    // Group by specific date to show individual days within the week card
                    const daysInWeek = weekAssignments.reduce((acc, curr) => {
                        if (!acc[curr.data]) acc[curr.data] = []
                        acc[curr.data].push(curr)
                        return acc
                    }, {} as Record<string, SupportAssignment[]>)

                    return (
                        <div key={mondayStr} className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-sm">
                                        Semana {monday.getDate().toString().padStart(2, '0')} a {sunday.getDate().toString().padStart(2, '0')} de {sunday.toLocaleDateString('pt-BR', { month: 'long' })}
                                    </span>
                                </h3>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(daysInWeek).sort((a, b) => a[0].localeCompare(b[0])).map(([date, assignments]) => (
                                    <div key={date}
                                        onClick={() => router.push(`/admin/escalas/${date}`)}
                                        className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 hover:border-primary/50 cursor-pointer transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white capitalize">
                                                    {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}
                                                </h4>
                                                <p className="text-xs text-slate-500 font-medium">
                                                    {new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => handleDelete(e, date)}
                                                className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                title="Excluir dia"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {assignments.slice(0, 3).map((assignment, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-xs">
                                                    <span className="text-slate-500 font-medium truncate max-w-[80px]" title={assignment.funcao}>
                                                        {assignment.funcao.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-slate-900 dark:text-slate-300 font-bold truncate max-w-[100px]">
                                                        {assignment.membro?.nome_completo.split(' ')[0]}
                                                    </span>
                                                </div>
                                            ))}
                                            {assignments.length > 3 && (
                                                <div className="text-xs text-center text-primary font-bold pt-1">
                                                    + {assignments.length - 3} designações
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}

                {detailedAssignments.length === 0 && (
                    <div className="col-span-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-20 text-center">
                        <div className="text-4xl mb-4">📅</div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">
                            Nenhuma escala encontrada para este mês.
                        </p>
                    </div>
                )}
            </div>

            {/* Print View */}
            <div className="hidden print:block space-y-4">
                {filteredGroupedByWeek.map(([mondayStr, weekAssignments]) => {
                    const getAssignment = (date: string, role: string) => {
                        return weekAssignments.find(a => a.data === date && a.funcao === role)
                    }

                    const formatName = (fullName: string | undefined) => {
                        if (!fullName) return ''
                        const names = fullName.split(' ')
                        if (names.length === 1) return names[0]
                        return `${names[0]} ${names[names.length - 1]}`
                    }

                    const monday = new Date(mondayStr + 'T00:00:00')
                    const sunday = new Date(monday)
                    sunday.setDate(monday.getDate() + 6)

                    // Find midweek meeting (usually Thursday) and weekend meeting (Saturday or Sunday)
                    const midweekAssignment = weekAssignments.find(a => {
                        const day = new Date(a.data + 'T00:00:00').getDay()
                        return day >= 1 && day <= 5 // Mon-Fri
                    })
                    const weekendAssignment = weekAssignments.find(a => {
                        const day = new Date(a.data + 'T00:00:00').getDay()
                        return day === 0 || day === 6 // Sun or Sat
                    })

                    const midweekDate = midweekAssignment?.data
                    const weekendDate = weekendAssignment?.data

                    const getMidweek = (role: string) => midweekDate ? getAssignment(midweekDate, role) : undefined
                    const getWeekend = (role: string) => weekendDate ? getAssignment(weekendDate, role) : undefined

                    const formatMics = (mic1: SupportAssignment | undefined, mic2: SupportAssignment | undefined) => {
                        const name1 = formatName(mic1?.membro?.nome_completo)
                        const name2 = formatName(mic2?.membro?.nome_completo)
                        if (name1 && name2) return `${name1} - ${name2}`
                        return name1 || name2 || ''
                    }

                    return (
                        <div key={mondayStr} className="break-inside-avoid">
                            <div className="border border-black text-center font-bold text-base uppercase bg-slate-100 py-1">
                                Semana {monday.getDate().toString().padStart(2, '0')} a {sunday.getDate().toString().padStart(2, '0')} de {sunday.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()}
                            </div>
                            <table className="w-full border-collapse border border-black text-sm">
                                <thead>
                                    <tr>
                                        <th className="border border-black w-1/3 p-0.5"></th>
                                        <th className="border border-black w-1/3 p-0.5 uppercase">
                                            {midweekDate ? new Date(midweekDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' }) : 'MEIO DE SEMANA'}
                                        </th>
                                        <th className="border border-black w-1/3 p-0.5 uppercase">
                                            {weekendDate ? new Date(weekendDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' }) : 'FIM DE SEMANA'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Presidente */}
                                    <tr>
                                        <td className="border border-black p-0.5 pl-2">PRESIDENTE</td>
                                        <td className="border border-black p-0.5 text-center font-bold">
                                            {formatName(getMidweek('PRESIDENTE')?.membro?.nome_completo)}
                                        </td>
                                        <td className="border border-black p-0.5 text-center font-bold">
                                            {formatName(getWeekend('PRESIDENTE')?.membro?.nome_completo)}
                                        </td>
                                    </tr>
                                    {/* Leitor */}
                                    <tr>
                                        <td className="border border-black p-0.5 pl-2">LEITOR</td>
                                        <td className="border border-black p-0.5 text-center font-bold">
                                            {formatName(getMidweek('LEITOR_SENTINELA')?.membro?.nome_completo)}
                                        </td>
                                        <td className="border border-black p-0.5 text-center font-bold">
                                            {formatName(getWeekend('LEITOR_SENTINELA')?.membro?.nome_completo)}
                                        </td>
                                    </tr>
                                    {/* Som (Anfitrião) */}
                                    <tr>
                                        <td className="border border-black p-0.5 pl-2">SOM</td>
                                        <td className="border border-black p-0.5 text-center font-bold">
                                            {formatName(getMidweek('SOM')?.membro?.nome_completo)}
                                        </td>
                                        <td className="border border-black p-0.5 text-center font-bold">
                                            {formatName(getWeekend('SOM')?.membro?.nome_completo)}
                                        </td>
                                    </tr>
                                    {/* Microfones */}
                                    <tr>
                                        <td className="border border-black p-0.5 pl-2">MICROFONES</td>
                                        <td className="border border-black p-0.5 text-center font-bold">
                                            {formatMics(getMidweek('MICROFONE_1'), getMidweek('MICROFONE_2'))}
                                        </td>
                                        <td className="border border-black p-0.5 text-center font-bold">
                                            {formatMics(getWeekend('MICROFONE_1'), getWeekend('MICROFONE_2'))}
                                        </td>
                                    </tr>
                                    {/* Indicador Auditório */}
                                    <tr>
                                        <td className="border border-black p-0.5 pl-2">INDICADOR - AUDITÓRIO</td>
                                        <td className="border border-black p-0.5 text-center font-bold">
                                            {formatName(getMidweek('INDICADOR_AUDITORIO')?.membro?.nome_completo)}
                                        </td>
                                        <td className="border border-black p-0.5 text-center font-bold">
                                            {formatName(getWeekend('INDICADOR_AUDITORIO')?.membro?.nome_completo)}
                                        </td>
                                    </tr>
                                    {/* Indicador Entrada */}
                                    <tr>
                                        <td className="border border-black p-0.5 pl-2">INDICADOR - ENTRADA</td>
                                        <td className="border border-black p-0.5 text-center font-bold">
                                            {formatName(getMidweek('INDICADOR_ENTRADA')?.membro?.nome_completo)}
                                        </td>
                                        <td className="border border-black p-0.5 text-center font-bold">
                                            {formatName(getWeekend('INDICADOR_ENTRADA')?.membro?.nome_completo)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )
                })}
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
