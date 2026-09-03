'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'
import PageHeader from '@/components/PageHeader'
import { getCongregationDate } from '@/lib/dateUtils'

type EscalaCampo = Database['public']['Tables']['escalas_campo']['Row'] & {
    dirigente: {
        nome_completo: string
    } | null
}

export default function CampoPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [escalas, setEscalas] = useState<EscalaCampo[]>([])

    // Filter State
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

    useEffect(() => {
        fetchEscalas()
    }, [])

    const fetchEscalas = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('escalas_campo')
                .select(`
                    *,
                    dirigente:membros(nome_completo)
                `)
                .order('data', { ascending: false })

            if (error) throw error
            setEscalas(data as any || [])

        } catch (error) {
            console.error('Erro ao carregar escalas de campo:', error)
            alert('Erro ao carregar escalas de campo.')
        } finally {
            setLoading(false)
        }
    }

    const handleNew = () => {
        router.push('/admin/campo/nova')
    }

    const handlePrint = () => {
        window.print()
    }

    const handleDelete = async (event: React.MouseEvent, date: string) => {
        event.stopPropagation()
        if (!confirm('Tem certeza que deseja excluir esta escala?')) return

        try {
            const { error } = await supabase
                .from('escalas_campo')
                .delete()
                .eq('data', date)

            if (error) throw error
            setEscalas(prev => prev.filter(escala => escala.data !== date))
        } catch (error) {
            console.error('Erro ao excluir escala de campo:', error)
            alert('Erro ao excluir escala.')
        }
    }

    const filteredEscalas = escalas.filter(escala => {
        const date = new Date(escala.data + 'T00:00:00')
        return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear
    }).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()) // Sort ascending for print

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i)

    const groupedByWeek = filteredEscalas.reduce((acc, escala) => {
        const date = new Date(escala.data + 'T00:00:00')
        const day = date.getDay()
        const diff = date.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(date)
        monday.setDate(diff)
        const mondayStr = getCongregationDate(monday)

        if (!acc[mondayStr]) acc[mondayStr] = []
        acc[mondayStr].push(escala)
        return acc
    }, {} as Record<string, EscalaCampo[]>)

    const groupedWeeks = Object.entries(groupedByWeek).sort((a, b) => a[0].localeCompare(b[0]))

    if (loading) return <div className="p-8">Carregando...</div>

    return (
        <div className="w-full min-w-0 pb-24 print:max-w-none print:p-0">
            <PageHeader
                className="mb-12"
                title="Dirigentes de Campo"
                backHref="/responsabilidades"
                backLabel="Responsabilidades"
                actions={
                <div className="w-full flex flex-wrap justify-center items-center gap-2 sm:w-auto sm:gap-4">
                    <div className="w-full sm:w-auto flex justify-center bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
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
                        className="flex-1 sm:flex-none justify-center px-4 sm:px-6 py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all shadow-lg shadow-slate-200 dark:shadow-none flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Imprimir
                    </button>

                    <button
                        onClick={handleNew}
                        className="flex-1 sm:flex-none justify-center px-4 sm:px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Nova Escala
                    </button>
                </div>
                }
            />

            {/* Print Header */}
            <div className="hidden print:block mb-12 text-center">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Escala de Dirigentes de Campo</h1>
                <p className="text-xl text-slate-600 font-medium">{months[selectedMonth]} de {selectedYear}</p>
                <div className="h-1 w-32 bg-primary mx-auto mt-4 rounded-full"></div>
            </div>

            {/* Screen View */}
            <div className="grid grid-cols-1 gap-8 print:hidden">
                {groupedWeeks.map(([mondayStr, weekEscalas]) => {
                    const monday = new Date(mondayStr + 'T00:00:00')
                    const sunday = new Date(monday)
                    sunday.setDate(monday.getDate() + 6)

                    return (
                        <div key={mondayStr} className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-100 dark:border-slate-700">
                                <h3 className="font-bold text-slate-900 dark:text-white">
                                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-sm">
                                        Semana {monday.getDate().toString().padStart(2, '0')} a {sunday.getDate().toString().padStart(2, '0')} de {sunday.toLocaleDateString('pt-BR', { month: 'long' })}
                                    </span>
                                </h3>
                            </div>

                            <div className="p-3 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                {weekEscalas.sort((a, b) => a.data.localeCompare(b.data)).map(escala => {
                                    const date = new Date(escala.data + 'T00:00:00')
                                    return (
                                        <div
                                            key={escala.id}
                                            onClick={() => router.push(`/admin/campo/${escala.data}`)}
                                            className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 hover:border-primary/50 cursor-pointer transition-all group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="shrink-0">
                                                    <h4 className="font-bold text-slate-900 dark:text-white capitalize">
                                                        {date.toLocaleDateString('pt-BR', { weekday: 'long' })}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 font-medium">
                                                        {date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                                                    </p>
                                                </div>
                                                <p className="min-w-0 flex-1 text-center text-sm text-slate-700 dark:text-slate-300 font-semibold break-words">
                                                    {escala.dirigente?.nome_completo || 'Não definido'}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={event => handleDelete(event, escala.data)}
                                                    className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    title="Excluir escala"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}

                {filteredEscalas.length === 0 && (
                    <div className="col-span-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-20 text-center">
                        <div className="text-4xl mb-4">📅</div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">
                            Nenhuma escala encontrada para este período.
                        </p>
                    </div>
                )}
            </div>

            {/* Print View */}
            <div className="hidden print:block overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Data
                            </th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Dia da Semana
                            </th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Dirigente
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filteredEscalas.map((escala) => {
                            const date = new Date(escala.data + 'T00:00:00')
                            return (
                                <tr key={escala.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-bold">
                                        {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 capitalize">
                                        {date.toLocaleDateString('pt-BR', { weekday: 'long' })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-bold">
                                        {escala.dirigente?.nome_completo || '_______________________'}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        margin: 1.5cm;
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
