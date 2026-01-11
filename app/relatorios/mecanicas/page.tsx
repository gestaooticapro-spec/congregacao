'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'
import { useRouter } from 'next/navigation'
import { format, parseISO, isSaturday, isSunday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type SupportAssignment = Database['public']['Tables']['designacoes_suporte']['Row'] & {
    membro: { nome_completo: string; nome_civil: string | null } | null
}

export default function RelatorioMecanicasPage() {
    const router = useRouter()
    const [dates, setDates] = useState<string[]>([])
    const [currentIndex, setCurrentIndex] = useState<number>(-1)
    const [assignments, setAssignments] = useState<SupportAssignment[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDates()
    }, [])

    useEffect(() => {
        if (currentIndex >= 0 && dates.length > 0) {
            fetchAssignments(dates[currentIndex])
        }
    }, [currentIndex, dates])

    const fetchDates = async () => {
        try {
            const { data, error } = await supabase
                .from('designacoes_suporte')
                .select('data')
                .order('data', { ascending: true })

            if (error) throw error

            // Get unique dates
            const uniqueDates = Array.from(new Set(data.map(d => d.data)))
            setDates(uniqueDates)

            // Find next meeting (first date >= today)
            const today = new Date().toISOString().split('T')[0]
            const nextIndex = uniqueDates.findIndex(d => d >= today)

            if (nextIndex !== -1) {
                setCurrentIndex(nextIndex)
            } else if (uniqueDates.length > 0) {
                // If no future dates, show the last one
                setCurrentIndex(uniqueDates.length - 1)
            }
        } catch (error) {
            console.error('Erro ao carregar datas:', error)
            alert('Erro ao carregar datas.')
        }
    }

    const fetchAssignments = async (date: string) => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('designacoes_suporte')
                .select(`
                    *,
                    membro:membros(nome_completo, nome_civil)
                `)
                .eq('data', date)

            if (error) throw error
            setAssignments(data as any)
        } catch (error) {
            console.error('Erro ao carregar designações:', error)
            alert('Erro ao carregar relatório.')
        } finally {
            setLoading(false)
        }
    }

    const handlePrev = () => {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1)
    }

    const handleNext = () => {
        if (currentIndex < dates.length - 1) setCurrentIndex(prev => prev + 1)
    }

    const handlePrint = () => window.print()

    const getAssignment = (role: string) => {
        return assignments.find(a => a.funcao === role)
    }

    const formatName = (membro: any) => {
        if (!membro) return '______________________'
        return membro.nome_completo || membro.nome_civil
    }

    const currentDate = dates[currentIndex]
    const isWeekend = currentDate ? (isSaturday(parseISO(currentDate)) || isSunday(parseISO(currentDate))) : false

    if (dates.length === 0 && !loading) return <div className="p-8 text-center">Nenhuma designação encontrada.</div>

    return (
        <div className="p-8 max-w-[210mm] mx-auto min-h-screen bg-white text-slate-900" suppressHydrationWarning>
            {/* Header / Controls (Hidden on Print) */}
            <div className="mb-8 print:hidden">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Relatório de Designações de Apoio</h1>
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
                        onClick={handlePrev}
                        disabled={currentIndex <= 0}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-30"
                    >
                        ◀️
                    </button>
                    <h2 className="text-xl font-bold capitalize w-64 text-center">
                        {currentDate ? format(parseISO(currentDate), "eeee, d 'de' MMMM", { locale: ptBR }) : 'Carregando...'}
                    </h2>
                    <button
                        onClick={handleNext}
                        disabled={currentIndex >= dates.length - 1}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-30"
                    >
                        ▶️
                    </button>
                </div>
            </div>

            {/* Report Content */}
            <div className="print-content">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold uppercase mb-2">Designações de Apoio</h2>
                    <p className="text-lg font-medium capitalize text-slate-600">
                        {currentDate && format(parseISO(currentDate), "eeee, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                </div>

                <div className="max-w-lg mx-auto border border-slate-300 rounded-lg overflow-hidden">
                    <table className="w-full text-sm border-collapse">
                        <tbody>
                            {/* Weekend Specific Roles */}
                            {isWeekend && (
                                <>
                                    <tr className="border-b border-slate-300">
                                        <td className="p-4 bg-slate-50 font-bold w-1/3">Presidente</td>
                                        <td className="p-4 text-lg">{formatName(getAssignment('PRESIDENTE')?.membro)}</td>
                                    </tr>
                                    <tr className="border-b border-slate-300">
                                        <td className="p-4 bg-slate-50 font-bold w-1/3">Leitor de A Sentinela</td>
                                        <td className="p-4 text-lg">{formatName(getAssignment('LEITOR_SENTINELA')?.membro)}</td>
                                    </tr>
                                </>
                            )}

                            {/* Standard Roles */}
                            <tr className="border-b border-slate-300">
                                <td className="p-4 bg-slate-50 font-bold w-1/3">Indicador (Auditório)</td>
                                <td className="p-4 text-lg">{formatName(getAssignment('INDICADOR_AUDITORIO')?.membro)}</td>
                            </tr>
                            <tr className="border-b border-slate-300">
                                <td className="p-4 bg-slate-50 font-bold w-1/3">Indicador (Entrada)</td>
                                <td className="p-4 text-lg">{formatName(getAssignment('INDICADOR_ENTRADA')?.membro)}</td>
                            </tr>
                            <tr className="border-b border-slate-300">
                                <td className="p-4 bg-slate-50 font-bold w-1/3">Microfone 1</td>
                                <td className="p-4 text-lg">{formatName(getAssignment('MICROFONE_1')?.membro)}</td>
                            </tr>
                            <tr className="border-b border-slate-300">
                                <td className="p-4 bg-slate-50 font-bold w-1/3">Microfone 2</td>
                                <td className="p-4 text-lg">{formatName(getAssignment('MICROFONE_2')?.membro)}</td>
                            </tr>
                            <tr className="border-b border-slate-300">
                                <td className="p-4 bg-slate-50 font-bold w-1/3">Som</td>
                                <td className="p-4 text-lg">{formatName(getAssignment('SOM')?.membro)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="mt-12 text-sm text-slate-500 text-center italic">
                    "O que for que fizerem, trabalhem nisso de toda a alma, como para Jeová, e não para homens." - Colossenses 3:23
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
