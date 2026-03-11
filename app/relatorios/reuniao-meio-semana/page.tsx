'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { calculatePartTimes } from '@/lib/scheduleUtils'

type Programacao = Database['public']['Tables']['programacao_semanal']['Row']
type Membro = Database['public']['Tables']['membros']['Row']

interface Parte {
    tipo: 'TESOUROS' | 'MINISTERIO' | 'VIDA_CRISTA' | 'PRESIDENTE' | 'ORACAO'
    nome: string
    tempo: number
    membro_id?: string
    ajudante_id?: string
}

function RelatorioContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const targetDate = searchParams.get('data')

    const [dates, setDates] = useState<string[]>([])
    const [currentIndex, setCurrentIndex] = useState<number>(-1)
    const [programacao, setProgramacao] = useState<Programacao | null>(null)
    const [membros, setMembros] = useState<Membro[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDates()
    }, [])

    useEffect(() => {
        if (currentIndex >= 0 && dates.length > 0) {
            fetchProgramacao(dates[currentIndex])
        }
    }, [currentIndex, dates])

    const fetchDates = async () => {
        try {
            const { data, error } = await supabase
                .from('programacao_semanal')
                .select('data_reuniao')
                .order('data_reuniao', { ascending: true })

            if (error) throw error

            const uniqueDates = Array.from(new Set(data.map(d => d.data_reuniao)))
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
                    setCurrentIndex(uniqueDates.length - 1)
                }
            }
        } catch (error) {
            console.error('Erro ao carregar datas:', error)
            alert('Erro ao carregar datas.')
        }
    }

    const fetchProgramacao = async (date: string) => {
        setLoading(true)
        try {
            // 1. Fetch Schedule
            const { data: progData, error: progError } = await supabase
                .from('programacao_semanal')
                .select('*')
                .eq('data_reuniao', date)
                .single()

            if (progError) throw progError
            setProgramacao(progData)

            // 2. Collect all Member IDs
            const memberIds = new Set<string>()
            if (progData.presidente_id) memberIds.add(progData.presidente_id)
            if (progData.oracao_inicial_id) memberIds.add(progData.oracao_inicial_id)
            if (progData.oracao_final_id) memberIds.add(progData.oracao_final_id)

            const partes = (progData.partes as any as Parte[]) || []
            partes.forEach(p => {
                if (p.membro_id) memberIds.add(p.membro_id)
                if (p.ajudante_id) memberIds.add(p.ajudante_id)
            })

            // 3. Fetch Members Details
            if (memberIds.size > 0) {
                const { data: membData, error: membError } = await supabase
                    .from('membros')
                    .select('*')
                    .in('id', Array.from(memberIds))

                if (membError) throw membError
                setMembros(membData || [])
            } else {
                setMembros([])
            }

        } catch (error) {
            console.error('Erro ao carregar programação:', error)
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

    const getMemberName = (id: string | undefined | null) => {
        if (!id) return '______________________'
        const membro = membros.find(m => m.id === id)
        return membro ? membro.nome_completo : 'Membro não encontrado'
    }

    const getWeekRange = (dateString: string) => {
        if (!dateString) return ''
        const date = parseISO(dateString)
        const start = startOfWeek(date, { weekStartsOn: 1 }) // Monday
        const end = endOfWeek(date, { weekStartsOn: 1 }) // Sunday

        const startStr = format(start, "d 'de' MMMM", { locale: ptBR })
        const endStr = format(end, "d 'de' MMMM", { locale: ptBR })

        return `Semana de ${startStr} a ${endStr}`
    }

    const renderBoldTime = (text: string) => {
        if (!text) return text
        // Match patterns like (5 min.), (10 min), (45 min.)
        const regex = /(\(\d+\s*min\.?\))/gi

        const parts = text.split(regex)

        return (
            <>
                {parts.map((part, i) => {
                    if (part.match(regex)) {
                        return <span key={i} className="font-bold">{part}</span>
                    }
                    return part
                })}
            </>
        )
    }

    const renderPartSection = (title: string, tipo: string, colorClass: string) => {
        const rawPartes = (programacao?.partes as any as Parte[]) || []

        let sectionParts = rawPartes.filter(p => p.tipo === tipo)

        // Calculate times for all parts to get the correct start time for each
        const calculatedPartes = calculatePartTimes(rawPartes, programacao?.data_reuniao || new Date().toISOString().split('T')[0])

        // Map the calculated start time back onto filtered section parts
        sectionParts = sectionParts.map(p => {
            const calculated = calculatedPartes.find(c => c.nome === p.nome && c.tipo === p.tipo)
            return { ...p, startTime: calculated?.startTime || '' }
        })

        // Enforce Bible Study order
        if (tipo === 'VIDA_CRISTA') {
            sectionParts.sort((a, b) => {
                const aIsStudy = a.nome.toLowerCase().includes('estudo bíblico');
                const bIsStudy = b.nome.toLowerCase().includes('estudo bíblico');
                if (aIsStudy && !bIsStudy) return 1;
                if (!aIsStudy && bIsStudy) return -1;
                return 0;
            });
        }

        if (sectionParts.length === 0) return null

        return (
            <div className="mb-6 break-inside-avoid">
                <h3 className={`text-lg font-bold uppercase mb-2 border-b-2 ${colorClass.replace('text-', 'border-')} pb-1 ${colorClass}`}>
                    {title}
                </h3>
                <div className="space-y-3">
                    {sectionParts.map((parte, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-start text-sm">
                            <div className="col-span-2 font-bold text-slate-500">
                                <span className="text-slate-900 mr-2">{(parte as any).startTime}</span>
                            </div>
                            <div className="col-span-6 font-medium">
                                {renderBoldTime(parte.nome)}
                            </div>
                            <div className="col-span-4 text-right">
                                <div className="font-bold text-slate-900">
                                    {getMemberName(parte.membro_id)}
                                </div>
                                {(parte.ajudante_id || (parte.tipo === 'VIDA_CRISTA' && parte.nome.toLowerCase().includes('estudo bíblico') && parte.ajudante_id)) && (
                                    <div className="text-xs text-slate-500 italic">
                                        {parte.nome.toLowerCase().includes('estudo bíblico') ? 'Leitor: ' : 'Ajudante: '}
                                        {getMemberName(parte.ajudante_id)}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (dates.length === 0 && !loading) return <div className="p-8 text-center">Nenhuma programação encontrada.</div>

    const currentDate = dates[currentIndex]

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen bg-transparent text-slate-900 print:p-0 print:min-h-0 print:m-0" suppressHydrationWarning>
            {/* Print View */}
            <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-0 overflow-y-auto text-slate-900">
                <div className="max-w-[210mm] mx-auto p-[15mm]">
                    <div className="text-center mb-8 border-b border-slate-300 pb-4">
                        <h2 className="text-2xl font-bold uppercase mb-1">Nossa Vida e Ministério Cristão</h2>

                        <div className="mb-2">
                            <p className="text-xl font-bold text-slate-800 capitalize">
                                {currentDate ? format(parseISO(currentDate), "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : ''}
                            </p>
                            <p className="text-md text-slate-600 capitalize">
                                {currentDate ? getWeekRange(currentDate) : ''}
                            </p>
                        </div>

                        <p className="text-lg font-medium text-slate-600 capitalize">
                            {programacao?.evento_tipo !== 'normal' ? programacao?.evento_tipo : programacao?.semana_descricao}
                        </p>
                    </div>

                    {programacao?.evento_tipo === 'normal' ? (
                        <>
                            {/* Top Roles */}
                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div>
                                    <span className="block text-xs font-bold uppercase text-slate-500 mb-1">Presidente</span>
                                    <span className="text-lg font-bold text-slate-900">{getMemberName(programacao?.presidente_id)}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs font-bold uppercase text-slate-500 mb-1">Oração Inicial</span>
                                    <span className="text-lg font-bold text-slate-900">{getMemberName(programacao?.oracao_inicial_id)}</span>
                                </div>
                            </div>

                            {/* Sections */}
                            {renderPartSection('Tesouros da Palavra de Deus', 'TESOUROS', 'text-slate-700')}
                            {renderPartSection('Faça Seu Melhor no Ministério', 'MINISTERIO', 'text-yellow-700')}
                            {renderPartSection('Nossa Vida Cristã', 'VIDA_CRISTA', 'text-red-700')}

                            {/* Closing Prayer */}
                            <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between items-center">
                                <span className="font-bold uppercase text-sm text-slate-500">Oração Final</span>
                                <span className="text-lg font-bold text-slate-900">{getMemberName(programacao?.oracao_final_id)}</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center py-20 bg-slate-50 rounded-lg border border-slate-200">
                            <h2 className="text-4xl font-bold uppercase text-slate-800 tracking-wider">
                                {programacao?.evento_tipo}
                            </h2>
                        </div>
                    )}

                    <div className="mt-12 text-sm text-slate-500 text-center italic">
                        "A tua palavra é lâmpada para o meu pé, e luz para o meu caminho." - Salmo 119:105
                    </div>
                </div>

                <style jsx global>{`
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 0;
                        }
                        body {
                            background: white;
                            -webkit-print-color-adjust: exact;
                        }
                        /* Hide scrollbars in print */
                        ::-webkit-scrollbar {
                            display: none;
                        }
                        nav, aside, header, footer, .no-print {
                            display: none !important;
                        }
                    }
                `}</style>
            </div>

            {/* Editor/Screen View (Hidden on Print) */}
            <div className="print:hidden">
                <div className="mb-8 print:hidden">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold">Relatório de Reunião</h1>
                        <div className="flex gap-2">
                            <button
                                onClick={() => router.back()}
                                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors bg-white shadow-sm"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={handlePrint}
                                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <span>🖨️</span> Imprimir
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 bg-white shadow-sm p-4 rounded-lg border border-slate-200">
                        <button
                            onClick={handlePrev}
                            disabled={currentIndex <= 0}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-30"
                        >
                            ◀️
                        </button>
                        <h2 className="text-xl font-bold capitalize w-64 text-center">
                            {currentDate ? format(parseISO(currentDate), "d 'de' MMMM", { locale: ptBR }) : 'Carregando...'}
                        </h2>
                        <button
                            onClick={handleNext}
                            disabled={currentIndex >= dates.length - 1}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-30"
                        >
                            ▶️
                        </button>
                    </div>
                </div>

                {/* Report Content for Screen */}
                <div className="max-w-[210mm] mx-auto bg-white border border-slate-200 p-8 shadow-sm rounded-lg print:hidden">
                    <div className="text-center mb-8 border-b border-slate-300 pb-4">
                        <h2 className="text-2xl font-bold uppercase mb-1">Nossa Vida e Ministério Cristão</h2>

                        {programacao?.evento_tipo === 'normal' && (
                            <p className="text-lg font-medium text-slate-600 capitalize">
                                {programacao?.semana_descricao}
                            </p>
                        )}
                    </div>

                    {programacao?.evento_tipo === 'normal' ? (
                        <>
                            {/* Top Roles */}
                            <div className="grid grid-cols-2 gap-8 mb-8 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div>
                                    <span className="block text-xs font-bold uppercase text-slate-500 mb-1">Presidente</span>
                                    <span className="text-lg font-bold text-slate-900">{getMemberName(programacao?.presidente_id)}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs font-bold uppercase text-slate-500 mb-1">Oração Inicial</span>
                                    <span className="text-lg font-bold text-slate-900">{getMemberName(programacao?.oracao_inicial_id)}</span>
                                </div>
                            </div>

                            {/* Sections */}
                            {renderPartSection('Tesouros da Palavra de Deus', 'TESOUROS', 'text-slate-700')}
                            {renderPartSection('Faça Seu Melhor no Ministério', 'MINISTERIO', 'text-yellow-700')}
                            {renderPartSection('Nossa Vida Cristã', 'VIDA_CRISTA', 'text-red-700')}

                            {/* Closing Prayer */}
                            <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between items-center">
                                <span className="font-bold uppercase text-sm text-slate-500">Oração Final</span>
                                <span className="text-lg font-bold text-slate-900">{getMemberName(programacao?.oracao_final_id)}</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center py-20 bg-slate-50 rounded-lg border border-slate-200">
                            <h2 className="text-4xl font-bold uppercase text-slate-800 tracking-wider">
                                {programacao?.evento_tipo}
                            </h2>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function RelatorioReuniaoMeioSemanaPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Carregando visualizador...</div>}>
            <RelatorioContent />
        </Suspense>
    )
}
