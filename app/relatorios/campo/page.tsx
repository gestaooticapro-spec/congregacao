'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'
import { useRouter } from 'next/navigation'
import { format, startOfMonth, endOfMonth, subMonths, addMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type EscalaCampo = Database['public']['Tables']['escalas_campo']['Row'] & {
    membros: { nome_completo: string; nome_civil: string | null } | null
}

export default function RelatorioCampoPage() {
    const router = useRouter()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [schedule, setSchedule] = useState<EscalaCampo[]>([])
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
                .from('escalas_campo')
                .select(`
                    *,
                    membros (
                        nome_completo,
                        nome_civil
                    )
                `)
                .gte('data', start)
                .lte('data', end)
                .order('data')

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

    const formatDate = (dateString: string) => {
        const date = parseISO(dateString)
        return format(date, "dd 'de' MMMM", { locale: ptBR })
    }

    const getDayOfWeek = (dateString: string) => {
        const date = parseISO(dateString)
        return format(date, 'EEEE', { locale: ptBR })
    }

    return (
        <div className="p-8 max-w-[210mm] mx-auto min-h-screen bg-white text-slate-900" suppressHydrationWarning>
            {/* Header / Controls (Hidden on Print) */}
            <div className="mb-8 print:hidden">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Relatório de Dirigente de Campo</h1>
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
                    <h2 className="text-2xl font-bold uppercase mb-2">Escala de Campo</h2>
                    <p className="text-lg font-medium capitalize text-slate-600">
                        {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </p>
                </div>

                <table className="w-full text-sm border-collapse border border-slate-300">
                    <thead>
                        <tr className="bg-slate-100">
                            <th className="border border-slate-300 p-3 text-left w-1/4">Data</th>
                            <th className="border border-slate-300 p-3 text-left w-1/4">Dia da Semana</th>
                            <th className="border border-slate-300 p-3 text-left w-1/2">Dirigente</th>
                        </tr>
                    </thead>
                    <tbody>
                        {schedule.map((item) => (
                            <tr key={item.id} className="break-inside-avoid">
                                <td className="border border-slate-300 p-3 font-medium">
                                    {formatDate(item.data)}
                                </td>
                                <td className="border border-slate-300 p-3 capitalize text-slate-600">
                                    {getDayOfWeek(item.data)}
                                </td>
                                <td className="border border-slate-300 p-3 text-lg font-medium">
                                    {item.membros?.nome_civil || item.membros?.nome_completo || 'Sem Dirigente'}
                                </td>
                            </tr>
                        ))}
                        {schedule.length === 0 && (
                            <tr>
                                <td colSpan={3} className="border border-slate-300 p-8 text-center text-slate-500 italic">
                                    Nenhuma designação encontrada para este mês.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <div className="mt-8 text-sm text-slate-500 text-center italic">
                    "Pregue a palavra; faça isso urgentemente." - 2 Timóteo 4:2
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
