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
                        {programacao.data_reuniao ? `Semana de ${format(parseISO(programacao.data_reuniao), "dd 'de' MMMM", { locale: ptBR })}` : ''}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2 print:gap-4 mb-8">
                    {/* Left Column: Meetings */}
                    <div>
                        <h2 className="text-lg font-bold border-b border-slate-300 mb-3 uppercase">Reuniões Especiais</h2>
                        <table className="w-full text-sm mb-6 border-collapse">
                            <tbody>
                                <tr className="border-b border-slate-200">
                                    <td className="py-2 pr-2 font-medium">Análise dos Arquivos</td>
                                    <td className="py-2 px-2 text-slate-600">{config?.analise_arquivos?.data ? format(parseISO(config.analise_arquivos.data), 'eeee', { locale: ptBR }) : ''}</td>
                                    <td className="py-2 px-2 text-slate-600">{config?.analise_arquivos?.hora}</td>
                                    <td className="py-2 pl-2 text-right text-slate-600">{config?.analise_arquivos?.local}</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <td className="py-2 pr-2 font-medium">Reunião de Terça</td>
                                    <td className="py-2 px-2 text-slate-600">{config?.reuniao_terca?.data ? format(parseISO(config.reuniao_terca.data), 'eeee', { locale: ptBR }) : ''}</td>
                                    <td className="py-2 px-2 text-slate-600">{config?.reuniao_terca?.hora}</td>
                                    <td className="py-2 pl-2 text-right text-slate-600">{config?.reuniao_terca?.local}</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <td className="py-2 pr-2 font-medium">Reunião com Grupo LS</td>
                                    <td className="py-2 px-2 text-slate-600">{config?.reuniao_ls?.data ? format(parseISO(config.reuniao_ls.data), 'eeee', { locale: ptBR }) : ''}</td>
                                    <td className="py-2 px-2 text-slate-600">{config?.reuniao_ls?.hora}</td>
                                    <td className="py-2 pl-2 text-right text-slate-600">{config?.reuniao_ls?.local}</td>
                                </tr>
                                <tr className="border-b border-slate-200">
                                    <td className="py-2 pr-2 font-medium">Reunião Pioneiros</td>
                                    <td className="py-2 px-2 text-slate-600">{config?.reuniao_pioneiros?.data ? format(parseISO(config.reuniao_pioneiros.data), 'eeee', { locale: ptBR }) : ''}</td>
                                    <td className="py-2 px-2 text-slate-600">{config?.reuniao_pioneiros?.hora}</td>
                                    <td className="py-2 pl-2 text-right text-slate-600">{config?.reuniao_pioneiros?.local}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 pr-2 font-medium">Reunião Anciãos e SM</td>
                                    <td className="py-2 px-2 text-slate-600">{config?.reuniao_anciaos?.data ? format(parseISO(config.reuniao_anciaos.data), 'eeee', { locale: ptBR }) : ''}</td>
                                    <td className="py-2 px-2 text-slate-600">{config?.reuniao_anciaos?.hora}</td>
                                    <td className="py-2 pl-2 text-right text-slate-600">{config?.reuniao_anciaos?.local}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Right Column: Field Service & Lunches */}
                    <div>
                        <h2 className="text-lg font-bold border-b border-slate-300 mb-3 uppercase">Atividade de Campo</h2>
                        <table className="w-full text-sm mb-6 border-collapse">
                            <tbody>
                                {(config?.saidas_campo || []).map((saida: any) => (
                                    <tr key={saida.id} className="border-b border-slate-200 last:border-0">
                                        <td className="py-1.5 pr-2 font-medium capitalize">{saida.dia}</td>
                                        <td className="py-1.5 px-2 text-slate-600">{saida.hora}</td>
                                        <td className="py-1.5 pl-2 text-right text-slate-600">{saida.local}</td>
                                    </tr>
                                ))}
                                {(!config?.saidas_campo || config.saidas_campo.length === 0) && (
                                    <tr><td colSpan={3} className="py-2 italic text-slate-500">Não cadastrado</td></tr>
                                )}
                            </tbody>
                        </table>

                        <h2 className="text-lg font-bold border-b border-slate-300 mb-3 uppercase">Arranjos para Almoço</h2>
                        <table className="w-full text-sm mb-6 border-collapse">
                            <tbody>
                                {(config?.almocos || []).map((almoco: any) => {
                                    const membro = getMembro(almoco.membro_id)
                                    return (
                                        <tr key={almoco.id} className="border-b border-slate-200 last:border-0">
                                            <td className="py-1.5 pr-2 font-medium capitalize w-1/4">{almoco.dia}</td>
                                            <td className="py-1.5 px-2 text-slate-900 font-medium">
                                                {membro.nome_completo?.split(' ')[0]}
                                                <span className="block text-xs font-normal text-slate-500">{membro.endereco || ''}</span>
                                            </td>
                                            <td className="py-1.5 pl-2 text-right text-slate-600 text-xs">
                                                {formatPhone(membro.telefone || membro.celular)}
                                            </td>
                                        </tr>
                                    )
                                })}
                                {(!config?.almocos || config.almocos.length === 0) && (
                                    <tr><td colSpan={3} className="py-2 italic text-slate-500">Não cadastrado</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Arranjos de Estudo */}
                {config?.arranjos_estudo && config.arranjos_estudo.length > 0 && (
                    <div className="mb-8 break-inside-avoid">
                        <h2 className="text-xl font-bold border-b-2 border-black mb-4 uppercase text-center bg-slate-100 py-1">
                            Arranjos de Estudo e Revisita
                        </h2>
                        
                        <div className="space-y-6">
                            {config.arranjos_estudo.map((tabela: any) => (
                                <div key={tabela.id} className="break-inside-avoid">
                                    <h3 className="font-bold text-md mb-2 bg-slate-50 p-2 border-l-4 border-slate-800">{tabela.nome_tabela}</h3>
                                    <table className="w-full text-sm border-collapse border border-slate-300">
                                        <thead>
                                            <tr className="bg-slate-100">
                                                <th className="border border-slate-300 p-1.5 text-left">Dia</th>
                                                <th className="border border-slate-300 p-1.5 text-left">Hora</th>
                                                <th className="border border-slate-300 p-1.5 text-left">Irmão(ã)</th>
                                                <th className="border border-slate-300 p-1.5 text-left">Estudante</th>
                                                <th className="border border-slate-300 p-1.5 text-left">Publicação</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tabela.linhas.map((linha: any) => {
                                                const membro = getMembro(linha.membro_id)
                                                return (
                                                    <tr key={linha.id}>
                                                        <td className="border border-slate-300 p-1.5 capitalize">{linha.dia}</td>
                                                        <td className="border border-slate-300 p-1.5">{linha.hora}</td>
                                                        <td className="border border-slate-300 p-1.5 font-medium">
                                                            {membro.nome_completo?.split(' ')[0] || ''}
                                                            {membro.telefone && <span className="block text-xs font-normal text-slate-500">{membro.telefone}</span>}
                                                        </td>
                                                        <td className="border border-slate-300 p-1.5">{linha.estudante}</td>
                                                        <td className="border border-slate-300 p-1.5 text-xs">{linha.publicacao}</td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pastoreios */}
                {config?.pastoreios && config.pastoreios.length > 0 && (
                    <div className="mb-8 break-before-page">
                        <h2 className="text-xl font-bold border-b-2 border-black mb-4 uppercase text-center bg-slate-100 py-1">
                            Arranjos de Pastoreio
                        </h2>
                        
                        <div className="space-y-4">
                            {config.pastoreios.map((pastoreio: any) => {
                                const membro = getMembro(pastoreio.membro_id)
                                const anciao = getMembro(pastoreio.anciao_id)
                                return (
                                    <div key={pastoreio.id} className="border border-slate-300 rounded p-3 break-inside-avoid">
                                        <div className="flex justify-between items-start mb-2 border-b border-slate-200 pb-2">
                                            <div>
                                                <h3 className="font-bold text-lg">{membro.nome_completo}</h3>
                                                <p className="text-sm text-slate-600">{membro.endereco || 'Endereço não cadastrado'}</p>
                                                <p className="text-sm font-medium text-blue-600">{formatPhone(membro.telefone || membro.celular)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">
                                                    {pastoreio.data ? format(parseISO(pastoreio.data), 'dd/MM/yyyy') : ''} às {pastoreio.hora}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1">Acompanhante: <span className="font-medium text-slate-700">{anciao.nome_completo?.split(' ')[0] || '-'}</span></p>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-700 italic">
                                            <span className="font-bold not-italic">Contexto: </span>
                                            {pastoreio.memo || 'Sem observações.'}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Pauta Anciãos */}
                {config?.pauta_anciaos_visita && config.pauta_anciaos_visita.length > 0 && (
                    <div className="mb-8 break-before-page">
                        <h2 className="text-xl font-bold border-b-2 border-black mb-4 uppercase text-center bg-slate-100 py-1">
                            Pauta para Reunião com Anciãos
                        </h2>
                        
                        <div className="space-y-4">
                            {config.pauta_anciaos_visita.map((pauta: any, idx: number) => {
                                const anciao = getMembro(pauta.anciao_id)
                                return (
                                    <div key={pauta.id} className="border border-slate-300 rounded p-4 break-inside-avoid">
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
