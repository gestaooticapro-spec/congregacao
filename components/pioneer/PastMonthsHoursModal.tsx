'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock3, Sparkles, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'

type LogEntry = Database['public']['Tables']['ministerio_logs']['Row']

const CATEGORIA_LABEL: Record<string, string> = {
    CAMPO: 'Campo',
    ESTUDO: 'Estudo Bíblico',
    CARTA: 'Cartas',
    PUBLICO: 'Testemunho Público',
    INFORMAL: 'Informal',
    OUTROS: 'Outros',
    LDC: 'LDC (Abono)',
}

const formatMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours}h ${minutes.toString().padStart(2, '0')}min`
}

const monthKeyFromDate = (value: string) => value.slice(0, 7)

const currentMonthKey = () => format(new Date(), 'yyyy-MM')

interface PastMonthsHoursModalProps {
    isOpen: boolean
    onClose: () => void
    membroId: string
}

export default function PastMonthsHoursModal({ isOpen, onClose, membroId }: PastMonthsHoursModalProps) {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) return

        const loadPastLogs = async () => {
            setIsLoading(true)
            setLoadError(null)
            try {
                const { data, error } = await supabase
                    .from('ministerio_logs')
                    .select('*')
                    .eq('membro_id', membroId)
                    .order('data', { ascending: false })

                if (error) throw error
                setLogs(data || [])
            } catch (error) {
                console.error('Error loading past pioneer hours:', error)
                setLoadError('Não foi possível carregar os meses anteriores.')
                setLogs([])
            } finally {
                setIsLoading(false)
            }
        }

        void loadPastLogs()
    }, [isOpen, membroId])

    const months = useMemo(() => {
        const thisMonth = currentMonthKey()
        const grouped = new Map<string, { realMin: number; abonoMin: number; entries: LogEntry[] }>()

        logs.forEach((log) => {
            const key = monthKeyFromDate(log.data)
            if (key >= thisMonth) return

            const current = grouped.get(key) || { realMin: 0, abonoMin: 0, entries: [] }
            const minutes = log.minutos || 0
            if (log.categoria === 'LDC') current.abonoMin += minutes
            else current.realMin += minutes
            current.entries.push(log)
            grouped.set(key, current)
        })

        return [...grouped.entries()]
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([key, value]) => ({ key, ...value }))
    }, [logs])

    useEffect(() => {
        if (!isOpen) {
            setSelectedMonth(null)
            return
        }
        if (months.length === 0) {
            setSelectedMonth(null)
            return
        }
        setSelectedMonth((current) => {
            if (current && months.some((month) => month.key === current)) return current
            return months[0].key
        })
    }, [isOpen, months])

    const selected = months.find((month) => month.key === selectedMonth) || null

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="past-months-title"
                className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800">
                    <div>
                        <h3 id="past-months-title" className="text-xl font-bold text-slate-800 dark:text-white">
                            Meses anteriores
                        </h3>
                        <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
                            A meta mensal recomeça todo mês. As horas que você lançou continuam salvas aqui, só para consulta.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                        aria-label="Fechar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                    {isLoading ? (
                        <div className="flex justify-center py-16">
                            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
                        </div>
                    ) : loadError ? (
                        <p className="py-12 text-center text-sm text-red-500">{loadError}</p>
                    ) : months.length === 0 ? (
                        <div className="py-12 text-center">
                            <CalendarDays className="mx-auto mb-3 h-8 w-8 text-slate-200" />
                            <p className="font-semibold text-slate-600 dark:text-slate-300">Nenhum mês anterior</p>
                            <p className="mt-1 text-sm text-slate-400">Quando virar o mês, as horas já lançadas aparecerão aqui.</p>
                        </div>
                    ) : (
                        <>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="past-month">
                                Mês
                            </label>
                            <select
                                id="past-month"
                                value={selectedMonth || ''}
                                onChange={(event) => setSelectedMonth(event.target.value)}
                                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 font-semibold capitalize text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            >
                                {months.map((month) => (
                                    <option key={month.key} value={month.key}>
                                        {format(parseISO(`${month.key}-01`), 'MMMM yyyy', { locale: ptBR })}
                                    </option>
                                ))}
                            </select>

                            {selected && (
                                <>
                                    <div className="mt-5 grid grid-cols-2 gap-2">
                                        <div className="rounded-2xl bg-blue-50 p-4 dark:bg-blue-950/30">
                                            <Clock3 className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                                            <p className="mt-2 text-lg font-bold text-slate-800 dark:text-white">{formatMinutes(selected.realMin)}</p>
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Horas</p>
                                        </div>
                                        <div className="rounded-2xl bg-purple-50 p-4 dark:bg-purple-950/30">
                                            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                                            <p className="mt-2 text-lg font-bold text-slate-800 dark:text-white">{formatMinutes(selected.abonoMin)}</p>
                                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Abono</p>
                                        </div>
                                    </div>

                                    <p className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-400">
                                        {selected.entries.length} lançamento{selected.entries.length === 1 ? '' : 's'}
                                    </p>

                                    <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                                        {selected.entries.map((log) => (
                                            <div key={log.id} className="flex items-center justify-between gap-3 p-4">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                                                        log.categoria === 'LDC' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                                                    }`}>
                                                        {log.categoria === 'LDC' ? 'AB' : 'HR'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-bold capitalize text-slate-700 dark:text-slate-200">
                                                            {format(parseISO(log.data), 'EEEE, dd/MM', { locale: ptBR })}
                                                        </p>
                                                        <p className="text-[10px] font-medium uppercase text-slate-400">
                                                            {formatMinutes(log.minutos)} • {CATEGORIA_LABEL[log.categoria] || log.categoria}
                                                        </p>
                                                        {log.comentarios && (
                                                            <p className="mt-1 truncate text-xs text-slate-500">{log.comentarios}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
