'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'

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

    const filteredEscalas = escalas.filter(escala => {
        const date = new Date(escala.data + 'T00:00:00')
        return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear
    }).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()) // Sort ascending for print

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i)

    if (loading) return <div className="p-8">Carregando...</div>

    return (
        <div className="max-w-6xl mx-auto p-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 print:hidden">
                <div className="text-center md:text-left">
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Dirigentes de Campo</h1>
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
            <div className="hidden print:block mb-12 text-center">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Escala de Dirigentes de Campo</h1>
                <p className="text-xl text-slate-600 font-medium">{months[selectedMonth]} de {selectedYear}</p>
                <div className="h-1 w-32 bg-primary mx-auto mt-4 rounded-full"></div>
            </div>

            {/* Screen View */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 print:hidden">
                {filteredEscalas.map((escala) => (
                    <div
                        key={escala.id}
                        onClick={() => router.push(`/admin/campo/${escala.data}`)}
                        className="group bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 p-6 cursor-pointer hover:border-primary/50 hover:-translate-y-1 transition-all"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl group-hover:bg-primary/5 transition-colors">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                                    {new Date(escala.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}
                                </h3>
                                <p className="text-primary font-bold">
                                    {new Date(escala.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Dirigente</span>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500">
                                    👤
                                </div>
                                <span className="text-slate-900 dark:text-white font-bold">
                                    {escala.dirigente?.nome_completo || 'Não definido'}
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-end">
                            <span className="text-primary text-sm font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                                Detalhes <span>→</span>
                            </span>
                        </div>
                    </div>
                ))}

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
