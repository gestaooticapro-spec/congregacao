'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'

type Grupo = Database['public']['Tables']['grupos_servico']['Row']
type EscalaLimpeza = Database['public']['Tables']['escala_limpeza']['Row']

export default function EscalaLimpezaPage() {
    const [grupos, setGrupos] = useState<Grupo[]>([])
    const [escalas, setEscalas] = useState<Record<string, string>>({}) // date -> grupo_id
    const [loading, setLoading] = useState(true)
    const [weeks, setWeeks] = useState<Date[]>([])

    // Bimester State
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
    const [currentBimester, setCurrentBimester] = useState(Math.ceil((new Date().getMonth() + 1) / 2))

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        generateWeeksForBimester(currentYear, currentBimester)
    }, [currentYear, currentBimester])

    const generateWeeksForBimester = (year: number, bimester: number) => {
        const startMonth = (bimester - 1) * 2 // 0-indexed (0=Jan, 2=Mar, etc.)
        const endMonth = startMonth + 1 // 1=Feb, 3=Apr, etc.

        const dates: Date[] = []

        // Start from the first day of the first month
        const date = new Date(year, startMonth, 1)

        // Find the first Monday on or after the 1st
        while (date.getDay() !== 1) {
            date.setDate(date.getDate() + 1)
        }

        // Add weeks as long as the Monday is within the bimester (or slightly before/after depending on logic, 
        // but usually we want all weeks that "belong" to these months. 
        // Let's include any week where the Monday falls within the two months.)
        while (date.getMonth() <= endMonth && date.getFullYear() === year) {
            // Edge case: if we are in Dec (month 11) and loop goes to next year, month becomes 0.
            // But here we are strictly within the bimester months.
            // Actually, simpler: just check if month is startMonth or endMonth.

            if (date.getMonth() === startMonth || date.getMonth() === endMonth) {
                dates.push(new Date(date))
            }

            date.setDate(date.getDate() + 7)
        }

        setWeeks(dates)
    }

    const handleBimesterChange = (direction: 'next' | 'prev') => {
        let newBimester = currentBimester + (direction === 'next' ? 1 : -1)
        let newYear = currentYear

        if (newBimester > 6) {
            newBimester = 1
            newYear++
        } else if (newBimester < 1) {
            newBimester = 6
            newYear--
        }

        setCurrentBimester(newBimester)
        setCurrentYear(newYear)
    }

    const getBimesterName = (bimester: number) => {
        const names = [
            'Janeiro / Fevereiro',
            'Março / Abril',
            'Maio / Junho',
            'Julho / Agosto',
            'Setembro / Outubro',
            'Novembro / Dezembro'
        ]
        return names[bimester - 1]
    }

    const fetchData = async () => {
        try {
            // Fetch Groups
            const { data: gruposData, error: gruposError } = await supabase
                .from('grupos_servico')
                .select('*')
                .order('nome')

            if (gruposError) throw gruposError
            setGrupos(gruposData || [])

            // Fetch Existing Schedules (fetch all for simplicity, or filter by range if needed optimization)
            const { data: escalasData, error: escalasError } = await supabase
                .from('escala_limpeza')
                .select('*')

            if (escalasError) throw escalasError

            const escalasMap: Record<string, string> = {}
            escalasData?.forEach(e => {
                escalasMap[e.data_inicio] = e.grupo_id || ''
            })
            setEscalas(escalasMap)

        } catch (error) {
            console.error('Erro ao carregar dados:', error)
            alert('Erro ao carregar dados.')
        } finally {
            setLoading(false)
        }
    }

    const handleGroupChange = async (date: Date, grupoId: string) => {
        const dateStr = date.toISOString().split('T')[0]

        // Optimistic update
        setEscalas(prev => ({ ...prev, [dateStr]: grupoId }))

        try {
            if (grupoId) {
                const { error } = await supabase
                    .from('escala_limpeza')
                    .upsert({
                        data_inicio: dateStr,
                        grupo_id: grupoId
                    }, { onConflict: 'data_inicio' })

                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('escala_limpeza')
                    .upsert({
                        data_inicio: dateStr,
                        grupo_id: null
                    }, { onConflict: 'data_inicio' })

                if (error) throw error
            }
        } catch (error: any) {
            console.error('Erro ao salvar:', error)
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            })
            alert(`Erro ao salvar alteração: ${error.message || 'Erro desconhecido'}`)
        }
    }

    const formatDateRange = (monday: Date) => {
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        return `${monday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${sunday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
    }

    const handlePrint = () => {
        window.print()
    }

    if (loading) return <div className="p-8">Carregando...</div>

    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="text-center mb-12 print:hidden">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Escala de Limpeza</h1>
                <div className="h-1 w-20 bg-primary mx-auto rounded-full"></div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10 print:hidden">
                <button
                    onClick={handlePrint}
                    className="w-full md:w-auto px-6 py-2.5 bg-secondary text-white rounded-lg font-semibold hover:bg-slate-700 transition-colors shadow-md flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Imprimir Escala
                </button>

                <div className="flex items-center gap-6 bg-white dark:bg-slate-900 p-3 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => handleBimesterChange('prev')}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-primary font-bold"
                        title="Bimestre Anterior"
                    >
                        ◀
                    </button>
                    <div className="text-center min-w-[180px]">
                        <span className="block font-bold text-xl text-slate-900 dark:text-white">{getBimesterName(currentBimester)}</span>
                        <span className="text-sm font-semibold text-primary uppercase tracking-widest">{currentYear}</span>
                    </div>
                    <button
                        onClick={() => handleBimesterChange('next')}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-primary font-bold"
                        title="Próximo Bimestre"
                    >
                        ▶
                    </button>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-8 text-center">
                <h1 className="text-2xl font-bold text-black mb-2">Escala de Limpeza do Salão do Reino</h1>
                <h2 className="text-xl text-black">{getBimesterName(currentBimester)} de {currentYear}</h2>
            </div>

            <div className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden print:shadow-none print:border print:border-slate-300">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 print:divide-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 print:bg-slate-100">
                        <tr>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider print:text-black print:text-sm print:font-bold">
                                Semana
                            </th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider print:text-black print:text-sm print:font-bold">
                                Grupo Responsável
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 print:divide-slate-300">
                        {weeks.map((week) => {
                            const dateStr = week.toISOString().split('T')[0]
                            const grupoId = escalas[dateStr]
                            const grupo = grupos.find(g => g.id === grupoId)

                            return (
                                <tr key={dateStr} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-white print:text-black print:text-base">
                                        {formatDateRange(week)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 print:text-black print:text-base">
                                        <div className="print:hidden">
                                            <select
                                                value={grupoId || ''}
                                                onChange={(e) => handleGroupChange(week, e.target.value)}
                                                className="block w-full pl-3 pr-10 py-2 text-sm border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent rounded-lg bg-white dark:bg-slate-900 dark:text-white transition-all"
                                            >
                                                <option value="">Selecione um grupo...</option>
                                                {grupos.map((grupo) => (
                                                    <option key={grupo.id} value={grupo.id}>
                                                        {grupo.nome}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="hidden print:block font-semibold">
                                            {grupo ? grupo.nome : '_______________________'}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                        {weeks.length === 0 && (
                            <tr>
                                <td colSpan={2} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 print:text-black">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-4xl">📅</span>
                                        <p>Nenhuma semana encontrada para este período.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
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
                    .print\\:shadow-none {
                        box-shadow: none !important;
                    }
                    .print\\:border {
                        border-width: 1px !important;
                    }
                    .print\\:border-gray-300 {
                        border-color: #d1d5db !important;
                    }
                    .print\\:divide-gray-300 > :not([hidden]) ~ :not([hidden]) {
                        border-color: #d1d5db !important;
                    }
                    .print\\:bg-gray-100 {
                        background-color: #f3f4f6 !important;
                    }
                    .print\\:text-black {
                        color: black !important;
                    }
                    .print\\:text-sm {
                        font-size: 0.875rem !important;
                    }
                    .print\\:text-base {
                        font-size: 1rem !important;
                    }
                    .print\\:font-bold {
                        font-weight: 700 !important;
                    }
                }
            `}</style>
        </div>
    )
}
