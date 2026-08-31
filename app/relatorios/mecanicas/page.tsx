'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'
import { useSearchParams } from 'next/navigation'
import { format, parseISO, isSaturday, isSunday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Loader2, MessageCircle, Printer } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { buildSupportReminderText, isLogadoPresidenteMeioSemana, shareMidweekReminderToWhatsApp } from '@/lib/midweekReminder'

type SupportAssignment = Database['public']['Tables']['designacoes_suporte']['Row'] & {
    membro: { nome_completo: string; nome_civil: string | null } | null
}

function RelatorioContent() {
    const searchParams = useSearchParams()
    const targetDate = searchParams.get('data')

    const [dates, setDates] = useState<string[]>([])
    const [currentIndex, setCurrentIndex] = useState<number>(-1)
    const [assignments, setAssignments] = useState<SupportAssignment[]>([])
    const [loading, setLoading] = useState(true)
    const [isPresidenteLogado, setIsPresidenteLogado] = useState(false)
    const [enviandoLembrete, setEnviandoLembrete] = useState(false)

    useEffect(() => {
        fetchDates()
    }, [])

    useEffect(() => {
        if (currentIndex >= 0 && dates.length > 0) {
            fetchAssignments(dates[currentIndex])
        }
    }, [currentIndex, dates])

    useEffect(() => {
        const verificarPresidente = async () => {
            const dataReuniao = currentIndex >= 0 ? dates[currentIndex] : undefined
            if (!dataReuniao) {
                setIsPresidenteLogado(false)
                return
            }
            const [{ data: programacao }, { data: apoioPresidente }] = await Promise.all([
                supabase
                    .from('programacao_semanal')
                    .select('presidente_id')
                    .eq('data_reuniao', dataReuniao)
                    .maybeSingle(),
                supabase
                    .from('designacoes_suporte')
                    .select('membro_id')
                    .eq('data', dataReuniao)
                    .eq('funcao', 'PRESIDENTE')
                    .maybeSingle(),
            ])
            setIsPresidenteLogado(await isLogadoPresidenteMeioSemana(
                programacao?.presidente_id || apoioPresidente?.membro_id
            ))
        }
        void verificarPresidente()
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

            if (targetDate && uniqueDates.includes(targetDate)) {
                const targetIndex = uniqueDates.indexOf(targetDate)
                setCurrentIndex(targetIndex)
            } else {
                // Find next meeting (first date >= today)
                const today = new Date().toISOString().split('T')[0]
                const nextIndex = uniqueDates.findIndex(d => d >= today)

                if (nextIndex !== -1) {
                    setCurrentIndex(nextIndex)
                } else if (uniqueDates.length > 0) {
                    // If no future dates, show the last one
                    setCurrentIndex(uniqueDates.length - 1)
                }
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

    const handleEnviarLembrete = () => {
        if (!currentDate) return
        setEnviandoLembrete(true)
        try {
            const texto = buildSupportReminderText(currentDate, assignments.map(assignment => ({
                funcao: assignment.funcao,
                nome: assignment.membro?.nome_completo || assignment.membro?.nome_civil || 'Não designado',
            })))
            shareMidweekReminderToWhatsApp(texto)
        } finally {
            setEnviandoLembrete(false)
        }
    }

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
        <div className="w-full min-w-0 max-w-[210mm] mx-auto min-h-screen overflow-x-clip py-4 md:p-8 print:p-0 print:overflow-visible" suppressHydrationWarning>
            <div className="print:hidden">
                <PageHeader
                    title="Designações de Apoio"
                    subtitle={currentDate ? format(parseISO(currentDate), "eeee, d 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Carregando...'}
                    backHref="/quadro-de-anuncios"
                    backLabel=""
                    actions={
                        <>
                            <button
                                type="button"
                                onClick={handlePrev}
                                disabled={currentIndex <= 0}
                                className="inline-flex items-center gap-1 p-2 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30"
                                aria-label="Anterior"
                            >
                                <ChevronLeft className="w-5 h-5" />
                                <span className="hidden sm:inline">Anterior</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={currentIndex >= dates.length - 1}
                                className="inline-flex items-center gap-1 p-2 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30"
                                aria-label="Próximo"
                            >
                                <span className="hidden sm:inline">Próximo</span>
                                <ChevronRight className="w-5 h-5" />
                            </button>
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors shadow-sm"
                            >
                                <Printer className="w-4 h-4" />
                                Imprimir
                            </button>
                            {isPresidenteLogado && (
                                <button
                                    type="button"
                                    onClick={handleEnviarLembrete}
                                    disabled={enviandoLembrete}
                                    className="inline-flex items-center justify-center gap-2 min-h-11 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {enviandoLembrete ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                                    Lembrete no WhatsApp
                                </button>
                            )}
                        </>
                    }
                />
            </div>

            {/* Report Content */}
            <div className="print-content bg-white text-slate-900">
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

export default function RelatorioMecanicasPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Carregando visualizador...</div>}>
            <RelatorioContent />
        </Suspense>
    )
}
