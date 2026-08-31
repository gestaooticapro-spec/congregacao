'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'
import { format, addDays, startOfMonth, endOfMonth, subMonths, addMonths, parseISO, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

type EscalaLimpeza = Database['public']['Tables']['escala_limpeza']['Row'] & {
    grupos_servico: { nome: string } | null
}

export default function RelatorioLimpezaPage() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [schedule, setSchedule] = useState<EscalaLimpeza[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [currentDate])

    const fetchData = async () => {
        setLoading(true)
        try {
            const start = startOfMonth(currentDate).toISOString()
            const end = endOfMonth(currentDate).toISOString()

            const { data, error } = await supabase
                .from('escala_limpeza')
                .select(`
                    *,
                    grupos_servico (
                        nome
                    )
                `)
                .gte('data_inicio', start)
                .lte('data_inicio', end)
                .order('data_inicio')

            if (error) throw error
            setSchedule(data as any)
        } catch (error) {
            console.error('Erro ao carregar escala:', error)
            alert('Erro ao carregar relatório.')
        } finally {
            setLoading(false)
        }
    }

    const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1))
    const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1))
    const handlePrint = () => window.print()

    const getWeekRange = (dateString: string) => {
        const start = parseISO(dateString)
        const end = addDays(start, 6)
        return `${format(start, 'dd/MM', { locale: ptBR })} a ${format(end, 'dd/MM', { locale: ptBR })}`
    }

    return (
        <div className="w-full min-w-0 max-w-[210mm] mx-auto min-h-screen overflow-x-clip py-4 md:p-8 print:p-0 print:overflow-visible" suppressHydrationWarning>
            <div className="print:hidden">
                <PageHeader
                    title="Escala de Limpeza"
                    subtitle={format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    backHref="/quadro-de-anuncios"
                    backLabel=""
                    actions={
                        <>
                            <button type="button" onClick={handlePrevMonth} className="inline-flex items-center gap-1 p-2 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Mês anterior">
                                <ChevronLeft className="w-5 h-5" />
                                <span className="hidden sm:inline">Anterior</span>
                            </button>
                            <button type="button" onClick={handleNextMonth} className="inline-flex items-center gap-1 p-2 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Próximo mês">
                                <span className="hidden sm:inline">Próximo</span>
                                <ChevronRight className="w-5 h-5" />
                            </button>
                            <button type="button" onClick={handlePrint} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors shadow-sm">
                                <Printer className="w-4 h-4" />
                                Imprimir
                            </button>
                        </>
                    }
                />
            </div>

            {/* Report Content */}
            <div className="print-content bg-white text-slate-900">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold uppercase mb-2">Escala de Limpeza</h2>
                    <p className="text-lg font-medium capitalize text-slate-600">
                        {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </p>
                </div>

                <table className="w-full text-sm border-collapse border border-slate-300">
                    <thead>
                        <tr className="bg-slate-100">
                            <th className="border border-slate-300 p-3 text-left w-1/3">Semana</th>
                            <th className="border border-slate-300 p-3 text-left w-2/3">Grupo Designado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {schedule.map((item) => (
                            <tr key={item.id} className="break-inside-avoid">
                                <td className="border border-slate-300 p-3 font-medium">
                                    {getWeekRange(item.data_inicio)}
                                </td>
                                <td className="border border-slate-300 p-3 text-lg">
                                    {item.grupos_servico?.nome || 'Sem Grupo'}
                                </td>
                            </tr>
                        ))}
                        {schedule.length === 0 && (
                            <tr>
                                <td colSpan={2} className="border border-slate-300 p-8 text-center text-slate-500 italic">
                                    Nenhuma designação encontrada para este mês.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <div className="mt-8 text-sm text-slate-500 text-center italic">
                    "Que todas as coisas ocorram com decência e ordem." - 1 Coríntios 14:40
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 20mm;
                    }
                    body {
                        background: white;
                        -webkit-print-color-adjust: exact;
                    }
                    nav, aside, header, footer, .no-print {
                        display: none !important;
                    }
                    .print-content {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    )
}
