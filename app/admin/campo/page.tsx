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
            <div className="flex justify-between items-center mb-8 print:hidden">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dirigentes de Campo</h1>

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
                <h1 className="text-2xl font-bold text-black mb-2">Escala de Dirigentes de Campo</h1>
                <h2 className="text-xl text-black">{months[selectedMonth]} de {selectedYear}</h2>
            </div>

            {/* Screen View (All or Filtered? Let's show filtered to match expectation) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
                {filteredEscalas.map((escala) => (
                    <div
                        key={escala.id}
                        onClick={() => router.push(`/admin/campo/${escala.data}`)}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {new Date(escala.data + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">
                                    {new Date(escala.data + 'T00:00:00').getFullYear()}
                                </p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Dirigente:</span>
                            <span className="text-gray-900 dark:text-white font-medium">
                                {escala.dirigente?.nome_completo || 'Não definido'}
                            </span>
                        </div>
                    </div>
                ))}

                {filteredEscalas.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                        Nenhuma escala encontrada para este período.
                    </div>
                )}
            </div>

            {/* Print View */}
            <div className="hidden print:block">
                <table className="min-w-full divide-y divide-gray-300 border border-gray-300">
                    <thead className="bg-gray-100">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-sm font-bold text-black uppercase tracking-wider border-b border-gray-300">
                                Data
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-sm font-bold text-black uppercase tracking-wider border-b border-gray-300">
                                Dia da Semana
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-sm font-bold text-black uppercase tracking-wider border-b border-gray-300">
                                Dirigente
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-300">
                        {filteredEscalas.map((escala) => {
                            const date = new Date(escala.data + 'T00:00:00')
                            return (
                                <tr key={escala.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-base text-black font-medium">
                                        {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-base text-black">
                                        {date.toLocaleDateString('pt-BR', { weekday: 'long' })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-base text-black font-bold">
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
