'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, CalendarDays, Clock3, FileText, Sparkles } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface SessaoMembro {
    id: string
    is_pioneiro: boolean
    pin: string
}

type Relatorio = {
    id: string
    membro_id: string
    mes: string
    horas: number | null
    estudos: number | null
    trabalhou: boolean | null
    is_pioneiro_auxiliar: boolean | null
    horas_abono: number | null
    atualizado_em: string
}

const getCurrentServiceYear = () => {
    const now = new Date()
    return now.getMonth() < 8 ? now.getFullYear() : now.getFullYear() + 1
}

const getServiceYearRange = (year: number) => ({
    start: `${year - 1}-09-01`,
    end: `${year}-08-31`
})

export default function HistoricoPioneiroPage() {
    const router = useRouter()
    const [reports, setReports] = useState<Relatorio[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [hasAccess, setHasAccess] = useState(false)
    const [selectedYear, setSelectedYear] = useState(getCurrentServiceYear())

    useEffect(() => {
        const loadReports = async () => {
            const stored = localStorage.getItem('membro_sessao')
            if (!stored) return router.replace('/')

            try {
                const session: SessaoMembro = JSON.parse(stored)
                if (!session.is_pioneiro) return router.replace('/')

                if (!session.pin) throw new Error('Sessão sem PIN')

                const response = await fetch('/api/pioneer/reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin: session.pin })
                })
                if (!response.ok) throw new Error('Não foi possível carregar os relatórios')

                const { reports: data } = await response.json() as { reports: Relatorio[] }

                setReports(data || [])
                setHasAccess(true)
            } catch (error) {
                console.error('Error loading pioneer report history:', error)
                router.replace('/painel-pioneiro')
            } finally {
                setIsLoading(false)
            }
        }

        void loadReports()
    }, [router])

    const serviceYears = useMemo(() => {
        const years = new Set<number>([getCurrentServiceYear()])
        reports.forEach((report) => {
            const month = parseISO(report.mes)
            years.add(month.getMonth() >= 8 ? month.getFullYear() + 1 : month.getFullYear())
        })
        return [...years].sort((a, b) => b - a)
    }, [reports])

    const filteredReports = useMemo(() => {
        const range = getServiceYearRange(selectedYear)
        return reports.filter((report) => report.mes >= range.start && report.mes <= range.end)
    }, [reports, selectedYear])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
        )
    }

    if (!hasAccess) return null

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-6 pb-12">
            <div className="max-w-md mx-auto">
                <button
                    onClick={() => router.push('/painel-pioneiro')}
                    className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-900 dark:hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" /> Painel do Pioneiro
                </button>

                <div className="mt-6 flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Histórico de relatórios</h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Relatórios enviados no seu ano de serviço.</p>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
                        <FileText className="h-5 w-5" />
                    </div>
                </div>

                <label className="mt-7 block text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="service-year">
                    Ano de serviço
                </label>
                <select
                    id="service-year"
                    value={selectedYear}
                    onChange={(event) => setSelectedYear(Number(event.target.value))}
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                    {serviceYears.map((year) => (
                        <option key={year} value={year}>Ano de serviço {year}</option>
                    ))}
                </select>

                <div className="mt-5 space-y-3">
                    {filteredReports.map((report) => (
                        <article key={report.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="flex items-center gap-2 text-sm font-bold capitalize text-slate-800 dark:text-white">
                                        <CalendarDays className="h-4 w-4 text-violet-500" />
                                        {format(parseISO(report.mes), 'MMMM yyyy', { locale: ptBR })}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">Enviado em {format(parseISO(report.atualizado_em), 'dd/MM/yyyy')}</p>
                                </div>
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">ENVIADO</span>
                            </div>

                            <div className="mt-5 grid grid-cols-3 gap-2">
                                <div className="rounded-2xl bg-blue-50 p-3 dark:bg-blue-950/30">
                                    <Clock3 className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                                    <p className="mt-2 text-lg font-bold text-slate-800 dark:text-white">{report.horas || 0}h</p>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Horas</p>
                                </div>
                                <div className="rounded-2xl bg-purple-50 p-3 dark:bg-purple-950/30">
                                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                                    <p className="mt-2 text-lg font-bold text-slate-800 dark:text-white">{report.horas_abono || 0}h</p>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Abono</p>
                                </div>
                                <div className="rounded-2xl bg-amber-50 p-3 dark:bg-amber-950/30">
                                    <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                                    <p className="mt-2 text-lg font-bold text-slate-800 dark:text-white">{report.estudos || 0}</p>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Estudos</p>
                                </div>
                            </div>
                        </article>
                    ))}

                    {filteredReports.length === 0 && (
                        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
                            <FileText className="mx-auto h-8 w-8 text-slate-300" />
                            <p className="mt-3 font-semibold text-slate-600 dark:text-slate-300">Nenhum relatório enviado</p>
                            <p className="mt-1 text-sm text-slate-400">Os relatórios deste ano de serviço aparecerão aqui.</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    )
}
