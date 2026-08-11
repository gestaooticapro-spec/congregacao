'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'react-hot-toast'
import {
    Users,
    CheckCircle2,
    Calendar,
    Clock,
    FileText,
    Star,
    PieChart,
    ArrowRight,
    X,
    UserCheck
} from 'lucide-react'
import { addMonths, format, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

interface GrupoResumo {
    id: string
    nome: string
    totalMembros: number
    entregues: number
    pendentes: number
    horasPR: number
    horasPA: number
    abonoPR: number
    abonoPA: number
    estudos: number
    estudosPR: number
    trabalharamPR: number
    pioneirosRegulares: number
    pioneirosAuxiliares: number
}

interface PioneiroRegularResumo {
    id: string
    nome: string
    relatorio: {
        horas: number
        horasAbono: number
        estudos: number
        trabalhou: boolean
    } | null
}

const getMonthOptions = () => {
    const now = new Date()
    const currentMonth = startOfMonth(now)
    const prevMonth = startOfMonth(subMonths(now, 1))

    return [
        { value: format(currentMonth, 'yyyy-MM-dd'), label: format(currentMonth, 'MMMM yyyy', { locale: ptBR }) },
        { value: format(prevMonth, 'yyyy-MM-dd'), label: format(prevMonth, 'MMMM yyyy', { locale: ptBR }) }
    ]
}

export default function RelatoriosSecretariaPage() {
    const [isLoading, setIsLoading] = useState(true)
    const [meses] = useState(getMonthOptions())
    const [mes, setMes] = useState(meses.length > 1 ? meses[1].value : meses[0].value)
    const [resumoGrupos, setResumoGrupos] = useState<GrupoResumo[]>([])

    // Totais Gerais
    const [totais, setTotais] = useState({
        membros: 0,
        entregues: 0,
        horas: 0,
        estudos: 0,
        pr: 0,
        pa: 0,
        horasPR: 0,
        abonoPR: 0,
        estudosPR: 0,
        trabalharamPR: 0,
        assistenciaQuarta: 0,
        assistenciaDomingo: 0
    })
    const [mostrarResumoPR, setMostrarResumoPR] = useState(false)
    const [pioneirosRegularesDetalhes, setPioneirosRegularesDetalhes] = useState<PioneiroRegularResumo[]>([])

    useEffect(() => {
        const fetchDados = async () => {
            setIsLoading(true)
            try {
                // 1. Buscar todos os grupos
                const { data: grupos, error: errGrps } = await supabase
                    .from('grupos_servico')
                    .select('id, nome')
                    .order('nome')

                if (errGrps) throw errGrps

                // 2. Buscar todos os membros ativos
                const { data: membros, error: errMem } = await supabase
                    .from('membros')
                    .select('id, nome_completo, grupo_id, is_pioneiro')
                    .eq('ativo', true)

                if (errMem) throw errMem

                // 3. Buscar relatórios do mês
                const { data: relatorios, error: errRels } = await supabase
                    .from('relatorios_servico')
                    .select('*')
                    .eq('mes', mes)

                if (errRels) throw errRels

                const proximoMes = format(addMonths(new Date(`${mes}T12:00:00`), 1), 'yyyy-MM-dd')
                const { data: assistencias, error: errAssistencias } = await (supabase as any)
                    .from('assistencias_reunioes')
                    .select('tipo_reuniao, quantidade')
                    .gte('data_reuniao', mes)
                    .lt('data_reuniao', proximoMes)

                if (errAssistencias) throw errAssistencias

                const assistenciaQuarta = (assistencias || [])
                    .filter((a: { tipo_reuniao: string }) => a.tipo_reuniao === 'MEIO_SEMANA')
                    .reduce((total: number, a: { quantidade: number }) => total + (a.quantidade || 0), 0)
                const assistenciaDomingo = (assistencias || [])
                    .filter((a: { tipo_reuniao: string }) => a.tipo_reuniao === 'FIM_SEMANA')
                    .reduce((total: number, a: { quantidade: number }) => total + (a.quantidade || 0), 0)

                setPioneirosRegularesDetalhes(
                    (membros || [])
                        .filter(m => m.is_pioneiro)
                        .map(m => {
                            const rel = relatorios?.find(r => r.membro_id === m.id)
                            return {
                                id: m.id,
                                nome: m.nome_completo,
                                relatorio: rel ? {
                                    horas: rel.horas || 0,
                                    horasAbono: rel.horas_abono || 0,
                                    estudos: rel.estudos || 0,
                                    trabalhou: rel.trabalhou || false
                                } : null
                            }
                        })
                        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                )

                // Calcular resumos por grupo
                let mTot = 0, eTot = 0, hTot = 0, esTot = 0, prTot = 0, paTot = 0
                let horasPRTot = 0, abonoPRTot = 0, estudosPRTot = 0, trabalharamPRTot = 0

                const resumo: GrupoResumo[] = (grupos || []).map(g => {
                    const membrosDoGrupo = (membros || []).filter(m => m.grupo_id === g.id)
                    let entregues = 0
                    let horasPR = 0
                    let horasPA = 0
                    let abonoPR = 0
                    let abonoPA = 0
                    let estudos = 0
                    let estudosPR = 0
                    let trabalharamPR = 0
                    let pr = 0
                    let pa = 0

                    membrosDoGrupo.forEach(m => {
                        mTot++
                        const rel = relatorios?.find(r => r.membro_id === m.id)
                        if (rel) {
                            entregues++
                            eTot++
                            hTot += rel.horas || 0
                            estudos += rel.estudos || 0
                            esTot += rel.estudos || 0

                            if (m.is_pioneiro) {
                                pr++
                                prTot++
                                horasPR += rel.horas || 0
                                abonoPR += rel.horas_abono || 0
                                estudosPR += rel.estudos || 0
                                if (rel.trabalhou) trabalharamPR++
                                horasPRTot += rel.horas || 0
                                abonoPRTot += rel.horas_abono || 0
                                estudosPRTot += rel.estudos || 0
                                if (rel.trabalhou) trabalharamPRTot++
                            }
                            if (!m.is_pioneiro && rel.is_pioneiro_auxiliar) {
                                pa++
                                paTot++
                                horasPA += rel.horas || 0
                                abonoPA += rel.horas_abono || 0
                            }
                        }
                    })

                    return {
                        id: g.id,
                        nome: g.nome,
                        totalMembros: membrosDoGrupo.length,
                        entregues,
                        pendentes: membrosDoGrupo.length - entregues,
                        horasPR,
                        horasPA,
                        abonoPR,
                        abonoPA,
                        estudos,
                        estudosPR,
                        trabalharamPR,
                        pioneirosRegulares: pr,
                        pioneirosAuxiliares: pa
                    }
                })

                setResumoGrupos(resumo.filter(g => g.totalMembros > 0)) // Mostra só grupos com gente
                setTotais({
                    membros: mTot,
                    entregues: eTot,
                    horas: hTot,
                    estudos: esTot,
                    pr: prTot,
                    pa: paTot,
                    horasPR: horasPRTot,
                    abonoPR: abonoPRTot,
                    estudosPR: estudosPRTot,
                    trabalharamPR: trabalharamPRTot,
                    assistenciaQuarta,
                    assistenciaDomingo
                })

            } catch (err) {
                console.error(err)
                toast.error('Erro ao buscar dados da congregação.')
            } finally {
                setIsLoading(false)
            }
        }

        fetchDados()
    }, [mes])

    if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>

    const pgsGeral = Math.round((totais.entregues / totais.membros) * 100) || 0

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <FileText className="w-6 h-6 text-blue-600" />
                        Secretário (Relatórios)
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Visão consolidada do progresso de todos os grupos da congregação.
                    </p>
                </div>

                <div className="flex bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2 items-center gap-2 shadow-sm">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <select
                        value={mes}
                        onChange={e => setMes(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 dark:text-gray-300 py-1 cursor-pointer capitalize"
                    >
                        {meses.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Consolidado Geral */}
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <PieChart className="w-5 h-5 text-gray-500" /> Total da Congregação
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Membros vs Entregues</p>
                    <div className="flex items-end gap-2 mb-4">
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{totais.entregues}</h3>
                        <span className="text-gray-400 mb-1">/ {totais.membros}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5">
                        <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${pgsGeral}%` }}></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Horas</p>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{totais.horas}</h3>
                    </div>
                    <Clock className="w-8 h-8 text-indigo-100 dark:text-indigo-900/30 absolute right-6 bottom-6" />
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Estudos</p>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{totais.estudos}</h3>
                    </div>
                    <BookOpen className="w-8 h-8 text-teal-100 dark:text-teal-900/30 absolute right-6 bottom-6" />
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pioneiros Relatados</p>
                    <div className="flex gap-4 mt-2">
                        <button
                            type="button"
                            onClick={() => setMostrarResumoPR(true)}
                            className="text-left rounded-lg px-2 -mx-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                            title="Ver resumo dos pioneiros regulares"
                        >
                            <span className="block text-2xl font-bold text-amber-600 dark:text-amber-500">{totais.pr}</span>
                            <span className="text-[10px] uppercase font-bold text-gray-400">Regulares</span>
                        </button>
                        <div>
                            <span className="block text-2xl font-bold text-blue-600 dark:text-blue-500">{totais.pa}</span>
                            <span className="text-[10px] uppercase font-bold text-gray-400">Auxiliares</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Assistência às reuniões</p>
                            <div className="mt-2 flex gap-4">
                                <div>
                                    <span className="block text-2xl font-bold text-indigo-600 dark:text-indigo-400">{totais.assistenciaQuarta}</span>
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Quartas</span>
                                </div>
                                <div>
                                    <span className="block text-2xl font-bold text-cyan-600 dark:text-cyan-400">{totais.assistenciaDomingo}</span>
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Domingos</span>
                                </div>
                            </div>
                        </div>
                        <UserCheck className="h-8 w-8 text-indigo-100 dark:text-indigo-900/30" />
                    </div>
                </div>
            </div>

            {mostrarResumoPR && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    onClick={() => setMostrarResumoPR(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="resumo-pr-titulo"
                        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="mb-6 flex items-start justify-between gap-4">
                            <div>
                                <h2 id="resumo-pr-titulo" className="text-xl font-bold text-gray-900 dark:text-white">
                                    Resumo dos pioneiros regulares
                                </h2>
                                <p className="mt-1 text-sm capitalize text-gray-500 dark:text-gray-400">
                                    Relatórios de {meses.find(m => m.value === mes)?.label}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMostrarResumoPR(false)}
                                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800 dark:hover:text-gray-200"
                                aria-label="Fechar resumo"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mb-5 rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20">
                            <p className="text-sm text-amber-800 dark:text-amber-300">PR que entregaram o relatório</p>
                            <p className="mt-1 text-3xl font-bold text-amber-700 dark:text-amber-400">{totais.pr}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {[
                                ['Horas reais', totais.horasPR, 'text-indigo-600 dark:text-indigo-400'],
                                ['Horas de abono', totais.abonoPR, 'text-purple-600 dark:text-purple-400'],
                                ['Estudos', totais.estudosPR, 'text-teal-600 dark:text-teal-400'],
                                ['Trabalharam', totais.trabalharamPR, 'text-green-600 dark:text-green-400']
                            ].map(([label, value, color]) => (
                                <div key={label as string} className="rounded-xl border border-gray-100 p-3 dark:border-slate-800">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                                    <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6">
                            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Detalhamento por pioneiro
                            </h3>
                            <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-slate-800">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[640px] text-left text-sm">
                                        <thead className="bg-gray-50 dark:bg-slate-800/60">
                                            <tr className="text-xs text-gray-500 dark:text-gray-400">
                                                <th className="px-4 py-3 font-medium">Pioneiro</th>
                                                <th className="px-4 py-3 text-center font-medium">Status</th>
                                                <th className="px-4 py-3 text-right font-medium">Horas</th>
                                                <th className="px-4 py-3 text-right font-medium">Abono</th>
                                                <th className="px-4 py-3 text-right font-medium">Estudos</th>
                                                <th className="px-4 py-3 text-center font-medium">Trabalhou</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                            {pioneirosRegularesDetalhes.map(pioneiro => (
                                                <tr key={pioneiro.id}>
                                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                                        {pioneiro.nome}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${pioneiro.relatorio
                                                            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                                            : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'
                                                            }`}>
                                                            {pioneiro.relatorio ? 'Entregue' : 'Pendente'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                                                        {pioneiro.relatorio?.horas ?? '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold text-purple-600 dark:text-purple-400">
                                                        {pioneiro.relatorio?.horasAbono ?? '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold text-teal-600 dark:text-teal-400">
                                                        {pioneiro.relatorio?.estudos ?? '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                                                        {pioneiro.relatorio ? (pioneiro.relatorio.trabalhou ? 'Sim' : 'Não') : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <p className="mt-5 text-xs text-gray-500 dark:text-gray-400">
                            O resumo considera somente os relatórios enviados pelos membros marcados como pioneiros regulares.
                        </p>
                    </div>
                </div>
            )}

            {/* Resumo por Grupo */}
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mt-8">
                <Users className="w-5 h-5 text-gray-500" /> Progresso por Grupo
            </h2>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30">
                                <th className="py-4 px-6 font-medium text-sm text-gray-500 dark:text-gray-400">Grupo</th>
                                <th className="py-4 px-6 font-medium text-sm text-gray-500 dark:text-gray-400">Status Entrega</th>
                                <th className="py-4 px-6 font-medium text-sm text-gray-500 dark:text-gray-400 text-center">PR / PA</th>
                                <th className="py-4 px-6 font-medium text-sm text-gray-500 dark:text-gray-400 text-right">Horas PR</th>
                                <th className="py-4 px-6 font-medium text-sm text-gray-500 dark:text-gray-400 text-right">Horas PA</th>
                                <th className="py-4 px-6 font-medium text-sm text-purple-500 dark:text-purple-400 text-right">Abonos</th>
                                <th className="py-4 px-6 font-medium text-sm text-gray-500 dark:text-gray-400 text-right">Estudos</th>
                                <th className="py-4 px-6 font-medium text-sm text-gray-500 dark:text-gray-400 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {resumoGrupos.map((grp) => {
                                const progresso = Math.round((grp.entregues / grp.totalMembros) * 100) || 0
                                return (
                                    <tr key={grp.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                        <td className="py-4 px-6 font-medium text-gray-900 dark:text-white">
                                            {grp.nome}
                                        </td>
                                        <td className="py-4 px-6 w-1/3">
                                            <div className="flex items-center justify-between text-sm mb-1">
                                                <span className="text-gray-500 dark:text-gray-400">{grp.entregues} de {grp.totalMembros}</span>
                                                <span className={progresso === 100 ? "text-green-600 font-medium" : "text-gray-600 font-medium"}>{progresso}%</span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5">
                                                <div className={`h-1.5 rounded-full transition-all duration-500 ${progresso === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progresso}%` }}></div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="text-xs font-semibold bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 px-2 py-0.5 rounded">{grp.pioneirosRegulares}</span>
                                                <span className="text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-0.5 rounded">{grp.pioneirosAuxiliares}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right font-semibold text-amber-600 dark:text-amber-500">
                                            {grp.horasPR}
                                        </td>
                                        <td className="py-4 px-6 text-right font-semibold text-blue-600 dark:text-blue-500">
                                            {grp.horasPA}
                                        </td>
                                        <td className="py-4 px-6 text-right font-semibold text-purple-600 dark:text-purple-500">
                                            {grp.abonoPR + grp.abonoPA}
                                        </td>
                                        <td className="py-4 px-6 text-right font-semibold text-gray-900 dark:text-white">
                                            {grp.estudos}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <Link
                                                href={`/admin/relatorios-grupo?grupo_id=${grp.id}&mes=${mes}`}
                                                className="inline-flex items-center justify-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-400 transition-colors"
                                                title="Ver Detalhes do Grupo"
                                            >
                                                <ArrowRight className="w-4 h-4" />
                                            </Link>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function BookOpen(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>
}
