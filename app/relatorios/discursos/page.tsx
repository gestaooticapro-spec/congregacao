'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'
import { useRouter } from 'next/navigation'
import { format, startOfMonth, endOfMonth, addMonths, subMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type DiscursoLocal = Database['public']['Tables']['agenda_discursos_locais']['Row'] & {
    membros?: { nome_completo: string } | null
    oradores_visitantes?: { nome: string, congregacao: string } | null
    temas?: { numero: number, titulo: string } | null
}

type DiscursoFora = Database['public']['Tables']['agenda_discursos_fora']['Row'] & {
    membros?: { nome_completo: string } | null
    temas?: { numero: number, titulo: string } | null
}

export default function RelatorioDiscursosPage() {
    const router = useRouter()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [discursosLocais, setDiscursosLocais] = useState<DiscursoLocal[]>([])
    const [discursosFora, setDiscursosFora] = useState<DiscursoFora[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [currentDate])

    const fetchData = async () => {
        setLoading(true)
        const start = startOfMonth(currentDate).toISOString()
        const end = endOfMonth(currentDate).toISOString()

        try {
            // Fetch Local Talks
            const { data: locaisData, error: locaisError } = await supabase
                .from('agenda_discursos_locais')
                .select(`
                    *,
                    membros:orador_local_id (nome_completo),
                    oradores_visitantes:orador_visitante_id (nome, congregacao),
                    temas:tema_id (numero, titulo)
                `)
                .gte('data', start)
                .lte('data', end)
                .order('data')

            if (locaisError) throw locaisError

            // Fetch Outgoing Talks
            const { data: foraData, error: foraError } = await supabase
                .from('agenda_discursos_fora')
                .select(`
                    *,
                    membros:orador_id (nome_completo),
                    temas:tema_id (numero, titulo)
                `)
                .gte('data', start)
                .lte('data', end)
                .order('data')

            if (foraError) throw foraError

            setDiscursosLocais(locaisData as any)
            setDiscursosFora(foraData as any)

        } catch (error) {
            console.error('Erro ao carregar dados:', error)
            alert('Erro ao carregar relatório.')
        } finally {
            setLoading(false)
        }
    }

    const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1))
    const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1))
    const handlePrint = () => window.print()

    return (
        <div className="p-8 max-w-[210mm] mx-auto min-h-screen print:min-h-0 print:h-auto print:p-0 bg-white text-slate-900">
            {/* Header / Controls (Hidden on Print) */}
            <div className="mb-8 print:hidden">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Relatório de Discursos</h1>
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
                    <h2 className="text-xl font-bold capitalize w-64 text-center">
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
                <div className="text-center mb-8 border-b border-slate-300 pb-4">
                    <h2 className="text-2xl font-bold uppercase mb-1">Arranjos de Discursos Públicos</h2>
                    <p className="text-lg font-medium text-slate-600 capitalize">
                        {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </p>
                </div>

                {/* Local Talks */}
                <div className="mb-8 break-inside-avoid">
                    <h3 className="text-lg font-bold uppercase mb-4 bg-slate-100 p-2 border-l-4 border-slate-800">
                        Discursos na Congregação
                    </h3>
                    <table className="w-full text-sm border-collapse border border-slate-300">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="border border-slate-300 p-2 text-left w-24">Data</th>
                                <th className="border border-slate-300 p-2 text-left">Orador / Congregação</th>
                                <th className="border border-slate-300 p-2 text-left">Tema</th>
                                <th className="border border-slate-300 p-2 text-center w-16">Cânt.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {discursosLocais.map((d) => (
                                <tr key={d.id}>
                                    <td className="border border-slate-300 p-2 font-medium">
                                        {format(parseISO(d.data), 'dd/MM')}
                                    </td>
                                    <td className="border border-slate-300 p-2">
                                        <div className="font-bold">
                                            {d.orador_local_id
                                                ? d.membros?.nome_completo
                                                : d.oradores_visitantes?.nome}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {d.orador_local_id
                                                ? 'Local'
                                                : d.oradores_visitantes?.congregacao}
                                        </div>
                                    </td>
                                    <td className="border border-slate-300 p-2">
                                        <span className="font-bold mr-1">#{d.temas?.numero}</span>
                                        {d.temas?.titulo}
                                    </td>
                                    <td className="border border-slate-300 p-2 text-center">
                                        {d.cantico || '-'}
                                    </td>
                                </tr>
                            ))}
                            {discursosLocais.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="border border-slate-300 p-4 text-center text-slate-500 italic">
                                        Nenhum discurso agendado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Outgoing Talks */}
                <div className="break-inside-avoid">
                    <h3 className="text-lg font-bold uppercase mb-4 bg-slate-100 p-2 border-l-4 border-slate-800">
                        Discursos Fora
                    </h3>
                    <table className="w-full text-sm border-collapse border border-slate-300">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="border border-slate-300 p-2 text-left w-24">Data</th>
                                <th className="border border-slate-300 p-2 text-left">Orador</th>
                                <th className="border border-slate-300 p-2 text-left">Destino</th>
                                <th className="border border-slate-300 p-2 text-left">Tema</th>
                            </tr>
                        </thead>
                        <tbody>
                            {discursosFora.map((d) => (
                                <tr key={d.id}>
                                    <td className="border border-slate-300 p-2 font-medium">
                                        {format(parseISO(d.data), 'dd/MM')}
                                        <div className="text-xs text-slate-500 font-normal">
                                            {d.horario.substring(0, 5)}
                                        </div>
                                    </td>
                                    <td className="border border-slate-300 p-2">
                                        {d.membros?.nome_completo}
                                    </td>
                                    <td className="border border-slate-300 p-2">
                                        <div className="font-bold">{d.destino_congregacao}</div>
                                        <div className="text-xs text-slate-500">{d.destino_cidade}</div>
                                    </td>
                                    <td className="border border-slate-300 p-2">
                                        <span className="font-bold mr-1">#{d.temas?.numero}</span>
                                        {d.temas?.titulo}
                                    </td>
                                </tr>
                            ))}
                            {discursosFora.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="border border-slate-300 p-4 text-center text-slate-500 italic">
                                        Nenhum discurso agendado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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
