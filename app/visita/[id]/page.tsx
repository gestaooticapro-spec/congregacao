'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function VisitaRelatorioPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [programacao, setProgramacao] = useState<any>(null)
    const [config, setConfig] = useState<any>(null)
    const [membros, setMembros] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) fetchData()
    }, [id])

    const fetchData = async () => {
        try {
            // Fetch Programação
            const { data: progData, error: progError } = await supabase
                .from('programacao_semanal')
                .select('*')
                .eq('id', id)
                .single()

            if (progError) throw progError
            setProgramacao(progData)

            // Fetch Config
            const { data: configData, error: configError } = await (supabase as any)
                .from('visita_config')
                .select('*')
                .eq('programacao_id', id)
                .maybeSingle()

            if (configError) throw configError
            setConfig(configData || {})

            // Fetch Membros for resolving names/phones
            const { data: membData, error: membError } = await supabase
                .from('membros')
                .select('*')

            if (membError) throw membError
            setMembros(membData || [])

        } catch (error) {
            console.error('Erro ao carregar:', error)
            alert('Erro ao carregar os dados.')
        } finally {
            setLoading(false)
        }
    }

    const getMembro = (membroId: string) => {
        return membros.find(m => m.id === membroId) || {}
    }

    const formatPhone = (phone: string) => {
        if (!phone) return ''
        return phone // Apply mask if needed
    }

    if (loading) return <div className="p-8 text-center text-slate-500">Carregando relatório da visita...</div>
    const formatTitleDate = () => {
        if (!programacao?.data_reuniao) return ''
        const baseDate = new Date(programacao.data_reuniao + 'T12:00:00')
        const day = baseDate.getDay()
        const diff = 7 - (day === 0 ? 7 : day)
        const endDate = new Date(baseDate.getTime() + diff * 24 * 60 * 60 * 1000)

        const startDay = baseDate.getDate()
        const startMonth = format(baseDate, 'MMMM', { locale: ptBR })
        const endDay = endDate.getDate()
        const endMonth = format(endDate, 'MMMM', { locale: ptBR })

        if (startMonth === endMonth) {
            return `Visita de ${startDay}-${endDay} de ${endMonth} - Congr. Guaíra`
        } else {
            return `Visita de ${startDay} de ${startMonth} a ${endDay} de ${endMonth} - Congr. Guaíra`
        }
    }

    const getWeekendDate = () => {
        if (!programacao?.data_reuniao) return null
        const baseDate = new Date(programacao.data_reuniao + 'T12:00:00')
        const day = baseDate.getDay()
        const diff = 7 - (day === 0 ? 7 : day)
        return new Date(baseDate.getTime() + diff * 24 * 60 * 60 * 1000)
    }

    const weekendDate = getWeekendDate()

    if (!programacao) return <div className="p-8 text-center text-red-500">Programação não encontrada.</div>

    return (
        <div className="bg-slate-100 min-h-screen font-sans text-slate-900 print:bg-white print:text-black">
            {/* Top Bar for Screen */}
            <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-50 shadow-sm print:hidden flex justify-between items-center max-w-5xl mx-auto rounded-b-xl mb-8">
                <button
                    onClick={() => router.back()}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                >
                    Voltar
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={() => router.push(`/admin/visita/${id}`)}
                        className="px-4 py-2 border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium transition-colors"
                    >
                        ✏️ Editar Visita
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <span>🖨️</span> Imprimir
                    </button>
                </div>
            </div>

            {/* Print Container */}
            <div className="max-w-[210mm] mx-auto bg-white p-8 md:p-[15mm] shadow-md md:rounded-xl print:shadow-none print:rounded-none print:p-0">
                
                {/* Header */}
                <div className="text-center mb-8 border-b-2 border-black pb-4">
                    <h1 className="text-2xl font-bold uppercase tracking-wide">
                        Programa de Atividades para a Semana da Visita
                    </h1>
                    <p className="text-lg font-medium mt-1">
                        {formatTitleDate()}
                    </p>
                </div>

                {/* Table 1: Reuniões para a Semana da Visita */}
                <div className="mb-8 break-inside-avoid">
                    <table className="w-full text-sm border-collapse border border-slate-300">
                        <thead>
                            <tr className="bg-[#4a86e8] text-white print:bg-[#4a86e8] print:text-white">
                                <th className="border border-slate-300 p-2 text-left font-bold w-1/2">Reuniões para a Semana da Visita</th>
                                <th className="border border-slate-300 p-2 text-center font-bold">Dia e Hora</th>
                                <th className="border border-slate-300 p-2 text-center font-bold">Local</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border border-slate-300 bg-white">
                                <td className="border border-slate-300 p-2 font-medium">Análise dos Cartões e Arquivos</td>
                                <td className="border border-slate-300 p-2 text-center capitalize">{config?.analise_arquivos?.data ? format(parseISO(config.analise_arquivos.data), 'eeee', { locale: ptBR }) : ''} - {config?.analise_arquivos?.hora}</td>
                                <td className="border border-slate-300 p-2 text-center font-bold">{config?.analise_arquivos?.local || 'Farei sozinho'}</td>
                            </tr>
                            <tr className="border border-slate-300 bg-blue-50/50 print:bg-[#e8f0fe]">
                                <td className="border border-slate-300 p-2 font-medium">Reunião Vida e Ministério (60 min) / Discurso de Serviço (30 min)</td>
                                <td className="border border-slate-300 p-2 text-center capitalize">{config?.reuniao_terca?.data ? format(parseISO(config.reuniao_terca.data), 'eeee', { locale: ptBR }) : ''} - {config?.reuniao_terca?.hora}</td>
                                <td className="border border-slate-300 p-2 text-center font-bold">{config?.reuniao_terca?.local || 'Salão do Reino'}</td>
                            </tr>
                            <tr className="border border-slate-300 bg-white">
                                <td className="border border-slate-300 p-2 font-medium">Discurso Público (30 min)/Estudo de A Sentinela (30 min)/Discurso de Serviço (30 min)</td>
                                <td className="border border-slate-300 p-2 text-center capitalize">{weekendDate ? format(weekendDate, 'eeee', { locale: ptBR }) : ''} - 19:00</td>
                                <td className="border border-slate-300 p-2 text-center font-bold">Salão do Reino</td>
                            </tr>
                            <tr className="border border-slate-300 bg-blue-50/50 print:bg-[#e8f0fe]">
                                <td className="border border-slate-300 p-2 font-medium">Reunião com Grupo LS</td>
                                <td className="border border-slate-300 p-2 text-center capitalize">{config?.reuniao_ls?.data ? format(parseISO(config.reuniao_ls.data), 'eeee', { locale: ptBR }) : ''} - {config?.reuniao_ls?.hora}</td>
                                <td className="border border-slate-300 p-2 text-center font-bold">{config?.reuniao_ls?.local || 'Salão do Reino'}</td>
                            </tr>
                            <tr className="border border-slate-300 bg-white">
                                <td className="border border-slate-300 p-2 font-medium">Reunião com os Pioneiros Auxiliares, Regulares, Especiais e Missionários em Campo</td>
                                <td className="border border-slate-300 p-2 text-center capitalize">{config?.reuniao_pioneiros?.data ? format(parseISO(config.reuniao_pioneiros.data), 'eeee', { locale: ptBR }) : ''} - {config?.reuniao_pioneiros?.hora}</td>
                                <td className="border border-slate-300 p-2 text-center font-bold">{config?.reuniao_pioneiros?.local || 'Local'}</td>
                            </tr>
                            <tr className="border border-slate-300 bg-blue-50/50 print:bg-[#e8f0fe]">
                                <td className="border border-slate-300 p-2 font-medium">Reunião com os Anciãos e Servos Ministeriais</td>
                                <td className="border border-slate-300 p-2 text-center capitalize">{config?.reuniao_anciaos?.data ? format(parseISO(config.reuniao_anciaos.data), 'eeee', { locale: ptBR }) : ''} - {config?.reuniao_anciaos?.hora}</td>
                                <td className="border border-slate-300 p-2 text-center font-bold">{config?.reuniao_anciaos?.local || 'Local'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Table 2: Consideração antes do serviço de pregação */}
                <div className="mb-8 break-inside-avoid">
                    <table className="w-full text-sm border-collapse border border-slate-300">
                        <thead>
                            <tr className="bg-[#2b4c8a] text-white print:bg-[#2b4c8a] print:text-white">
                                <th colSpan={3} className="border border-slate-300 p-2 text-left font-bold">Consideração antes do serviço de pregação e Estudos</th>
                            </tr>
                            <tr className="bg-[#4a86e8] text-white print:bg-[#4a86e8] print:text-white">
                                <th className="border border-slate-300 p-2 text-left font-bold w-1/4">Atividade de Campo</th>
                                <th className="border border-slate-300 p-2 text-center font-bold w-1/4">Horário</th>
                                <th className="border border-slate-300 p-2 text-center font-bold w-1/2">Locais de reuniões</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(config?.saidas_campo || []).map((saida: any, idx: number) => (
                                <tr key={saida.id} className={`border border-slate-300 ${idx % 2 === 0 ? 'bg-blue-50/30 print:bg-[#e8f0fe]' : 'bg-white'}`}>
                                    <td className="border border-slate-300 p-2 capitalize font-medium">{saida.dia}</td>
                                    <td className="border border-slate-300 p-2 text-center text-[#4a86e8] font-bold">{saida.hora}</td>
                                    <td className="border border-slate-300 p-2 text-center">{saida.local}</td>
                                </tr>
                            ))}
                            {(!config?.saidas_campo || config.saidas_campo.length === 0) && (
                                <tr>
                                    <td colSpan={3} className="border border-slate-300 p-4 text-center italic text-slate-500">Nenhuma atividade de campo cadastrada.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table 3: Visitas de Pastoreio */}
                {config?.pastoreios && config.pastoreios.length > 0 && (
                    <div className="mb-8 break-before-page">
                        <table className="w-full text-sm border-collapse border border-slate-300 mb-0">
                            <thead>
                                <tr className="bg-[#4a86e8] text-white print:bg-[#4a86e8] print:text-white">
                                    <th className="border border-slate-300 p-2 text-left font-bold">Visitas de Pastoreio</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-slate-300 p-0">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0">
                                            {config.pastoreios.map((pastoreio: any, idx: number) => {
                                                const membro = getMembro(pastoreio.membro_id)
                                                const anciao = getMembro(pastoreio.anciao_id)
                                                return (
                                                    <div key={pastoreio.id} className="p-4 border-b md:border-b-0 md:border-r border-slate-300 last:border-b-0 last:border-r-0">
                                                        <h3 className="font-bold text-[#4a86e8] mb-2">{idx + 1}ª Visita:</h3>
                                                        <div className="flex gap-4 mb-2">
                                                            <div><span className="font-bold">Data:</span> {pastoreio.data ? format(parseISO(pastoreio.data), 'dd/MM') : ''}</div>
                                                            <div><span className="font-bold">Horário:</span> {pastoreio.hora}</div>
                                                        </div>
                                                        <div className="mb-4 min-h-[60px]">
                                                            <span className="font-bold block mb-1">Breve descrição:</span>
                                                            {pastoreio.memo}
                                                        </div>
                                                        <div className="bg-[#e8f0fe] p-2 border border-slate-300 rounded">
                                                            <div className="mb-2"><span className="font-bold block">Irmão(ã) ou Família:</span> {membro.nome_completo}</div>
                                                            <div className="border-t border-blue-200 pt-2 mt-2"><span className="font-bold block">Ancião ou SM que me acompanhará:</span> {anciao.nome_completo?.split(' ')[0] || ''}</div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Table 4: Arranjos para os almoços */}
                <div className="mb-8 break-inside-avoid">
                    <table className="w-full text-sm border-collapse border border-slate-300">
                        <thead>
                            <tr className="bg-[#4a86e8] text-white print:bg-[#4a86e8] print:text-white">
                                <th colSpan={4} className="border border-slate-300 p-2 text-left font-bold">Arranjos para os almoços:</th>
                            </tr>
                            <tr className="bg-[#c9daf8] text-black print:bg-[#c9daf8] print:text-black">
                                <th className="border border-slate-300 p-2 text-center font-bold">Dias</th>
                                <th className="border border-slate-300 p-2 text-center font-bold w-1/3">Nomes: Irmão(ã) ou Família:</th>
                                <th className="border border-slate-300 p-2 text-center font-bold w-1/3">Endereço:</th>
                                <th className="border border-slate-300 p-2 text-center font-bold">Telefone:</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(config?.almocos || []).map((almoco: any, idx: number) => {
                                const membro = getMembro(almoco.membro_id)
                                return (
                                    <tr key={almoco.id} className={`border border-slate-300 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#e8f0fe] print:bg-[#e8f0fe]'}`}>
                                        <td className="border border-slate-300 p-2 text-center font-medium capitalize">{almoco.dia}</td>
                                        <td className="border border-slate-300 p-2 text-center font-bold text-[#cc0000] uppercase">
                                            {membro.nome_completo || almoco.membro_id || ''}
                                        </td>
                                        <td className="border border-slate-300 p-2 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <span>{membro.endereco || ''}</span>
                                                {membro.endereco && <span>📍</span>}
                                            </div>
                                        </td>
                                        <td className="border border-slate-300 p-2 text-center">
                                            {formatPhone(membro.contato)}
                                        </td>
                                    </tr>
                                )
                            })}
                            {(!config?.almocos || config.almocos.length === 0) && (
                                <tr>
                                    <td colSpan={4} className="border border-slate-300 p-4 text-center italic text-slate-500">Nenhum arranjo de almoço cadastrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Tables 5: Arranjos de Estudo */}
                {config?.arranjos_estudo && config.arranjos_estudo.length > 0 && (
                    <div className="space-y-8 break-inside-avoid">
                        {config.arranjos_estudo.map((tabela: any) => (
                            <table key={tabela.id} className="w-full text-sm border-collapse border border-slate-300 break-inside-avoid">
                                <thead>
                                    <tr className="bg-[#4a86e8] text-white print:bg-[#4a86e8] print:text-white">
                                        <th colSpan={4} className="border border-slate-300 p-2 text-left font-bold">{tabela.nome_tabela}</th>
                                    </tr>
                                    <tr className="bg-[#c9daf8] text-black print:bg-[#c9daf8] print:text-black">
                                        <th className="border border-slate-300 p-2 text-center font-bold">Dias da Semana:</th>
                                        <th className="border border-slate-300 p-2 text-center font-bold">Horários:</th>
                                        <th className="border border-slate-300 p-2 text-center font-bold">Nome do Acompanhante e Número de Telefone:</th>
                                        <th className="border border-slate-300 p-2 text-center font-bold">Publicação usada no estudo:</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tabela.linhas.map((linha: any, idx: number) => {
                                        const membro = getMembro(linha.membro_id)
                                        return (
                                            <tr key={linha.id} className={`border border-slate-300 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#e8f0fe] print:bg-[#e8f0fe]'}`}>
                                                <td className="border border-slate-300 p-2 text-center font-bold capitalize text-[#cc0000]">
                                                    {linha.dia}
                                                </td>
                                                <td className="border border-slate-300 p-2 text-center text-[#4a86e8] font-bold">
                                                    {linha.hora}
                                                </td>
                                                <td className="border border-slate-300 p-2 text-center">
                                                    {membro.nome_completo}
                                                    {membro.contato && <span className="block text-xs mt-1 text-slate-600">{formatPhone(membro.contato)}</span>}
                                                </td>
                                                <td className="border border-slate-300 p-2 text-center">
                                                    {linha.publicacao}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        ))}
                    </div>
                )}

                {/* Pauta Anciãos */}
                {config?.pauta_anciaos_visita && config.pauta_anciaos_visita.length > 0 && (
                    <div className="mb-8 break-before-page mt-8">
                        <table className="w-full text-sm border-collapse border border-slate-300">
                            <thead>
                                <tr className="bg-[#4a86e8] text-white print:bg-[#4a86e8] print:text-white">
                                    <th className="border border-slate-300 p-2 text-left font-bold">Pauta para Reunião com Anciãos</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-slate-300 p-4">
                                        <div className="space-y-4">
                                            {config.pauta_anciaos_visita.map((pauta: any, idx: number) => {
                                                const anciao = getMembro(pauta.anciao_id)
                                                return (
                                                    <div key={pauta.id} className="border border-slate-300 rounded p-4 break-inside-avoid bg-white">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h3 className="font-bold text-md text-slate-900">
                                                                <span className="text-slate-400 mr-2">{idx + 1}.</span>
                                                                {pauta.assunto}
                                                            </h3>
                                                            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">
                                                                Sugerido por: <strong>{anciao.nome_completo?.split(' ')[0] || '-'}</strong>
                                                            </span>
                                                        </div>
                                                        <div className="mt-2 text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-100 whitespace-pre-wrap">
                                                            {pauta.memo}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
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
                        print-color-adjust: exact;
                    }
                    ::-webkit-scrollbar {
                        display: none;
                    }
                }
            `}</style>
        </div>
    )
}
