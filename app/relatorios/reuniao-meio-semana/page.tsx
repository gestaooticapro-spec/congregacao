'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Programacao = Database['public']['Tables']['programacao_semanal']['Row']
type Membro = Database['public']['Tables']['membros']['Row']

interface Parte {
    tipo: 'TESOUROS' | 'MINISTERIO' | 'VIDA_CRISTA' | 'PRESIDENTE' | 'ORACAO'
    nome: string
    tempo: number
    membro_id?: string
    ajudante_id?: string
}

export default function RelatorioReuniaoMeioSemanaPage() {
    const router = useRouter()
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

            // Find next meeting (first date >= today)
            const today = new Date().toISOString().split('T')[0]
            const nextIndex = uniqueDates.findIndex(d => d >= today)

            if (nextIndex !== -1) {
                setCurrentIndex(nextIndex)
            } else if (uniqueDates.length > 0) {
                setCurrentIndex(uniqueDates.length - 1)
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

    const renderPartSection = (title: string, tipo: string, colorClass: string) => {
        const partes = (programacao?.partes as any as Parte[]) || []
        const sectionParts = partes.filter(p => p.tipo === tipo)

        // Enforce Bible Study order
        if (tipo === 'VIDA_CRISTA') {
            sectionParts.sort((a, b) => {
                const aIsStudy = a.nome.includes('Estudo Bíblico');
                const bIsStudy = b.nome.includes('Estudo Bíblico');
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
                                {parte.tempo} min
                            </div>
                            <div className="col-span-6 font-medium">
                                {parte.nome}
                            </div>
                            <div className="col-span-4 text-right">
                                <div className="font-bold text-slate-900">
                                    {getMemberName(parte.membro_id)}
                                </div>
                                {(parte.ajudante_id || (parte.tipo === 'VIDA_CRISTA' && parte.nome.includes('Estudo Bíblico') && parte.ajudante_id)) && (
                                    <div className="text-xs text-slate-500 italic">
                                        {parte.nome.includes('Estudo Bíblico') ? 'Leitor: ' : 'Ajudante: '}
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
        <div className="p-8 max-w-[210mm] mx-auto min-h-screen print:min-h-0 print:h-auto print:p-0 bg-white text-slate-900" suppressHydrationWarning>
            {/* Header / Controls (Hidden on Print) */}
            <div className="mb-8 print:hidden">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Relatório de Reunião</h1>
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
                        {currentDate ? format(parseISO(currentDate), "d 'de' MMMM", { locale: ptBR }) : 'Carregando...'}
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
                <div className="text-center mb-8 border-b border-slate-300 pb-4">
                    <h2 className="text-2xl font-bold uppercase mb-1">Nossa Vida e Ministério Cristão</h2>
                    <p className="text-lg font-medium text-slate-600">
                        {programacao?.semana_descricao}
                    </p>
                </div>

                {/* Top Roles */}
                <div className="grid grid-cols-2 gap-8 mb-8 bg-slate-50 p-4 rounded-lg border border-slate-200 print:bg-transparent print:border-none print:p-0">
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

                <div className="mt-12 text-sm text-slate-500 text-center italic">
                    "A tua palavra é lâmpada para o meu pé, e luz para o meu caminho." - Salmo 119:105
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 15mm;
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
