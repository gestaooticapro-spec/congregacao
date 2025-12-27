'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'
import { useRouter } from 'next/navigation'
import { format, addDays, startOfMonth, endOfMonth, subMonths, addMonths, parseISO, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type EscalaLimpeza = Database['public']['Tables']['escala_limpeza']['Row'] & {
    grupos_servico: { nome: string } | null
}

export default function RelatorioLimpezaPage() {
    const router = useRouter()
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
        <div className="p-8 max-w-[210mm] mx-auto min-h-screen bg-white text-slate-900" suppressHydrationWarning>
            {/* Header / Controls (Hidden on Print) */}
            <div className="mb-8 print:hidden">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Relatório de Limpeza</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Voltar
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-2"
                        >
                            <span>🖨️</span> Imprimir
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <button
                        onClick={handlePrevMonth}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                    >
                        ◀️
                    </button>
                    <h2 className="text-xl font-bold capitalize w-48 text-center">
                        {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </h2>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                    >
                        ▶️
                    </button>
                </div>
            </div>

            {/* Report Content */}
            <div className="print-content">
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
