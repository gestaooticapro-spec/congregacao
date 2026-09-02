'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { CategoriaMinisterio, Database } from '@/types/database.types'
import RadialProgress from './RadialProgress'
import TimerCard from './TimerCard'
import ManualEntryModal from './ManualEntryModal'
import PastMonthsHoursModal from './PastMonthsHoursModal'
import { Trash2, History, Settings2, Sparkles, CalendarDays } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'react-hot-toast'

interface PioneerDashboardProps {
    membroId: string;
    pin: string;
    onOnboardingCompleted?: () => void;
}

type LogEntry = Database['public']['Tables']['ministerio_logs']['Row']

type PioneerConfig = {
    saldo_inicial_pioneiro?: Record<string, number>
    pioneiro_onboarding_concluido?: boolean
    inicio_pioneiro_ano_servico?: Record<string, string>
}

export default function PioneerDashboard({ membroId, pin, onOnboardingCompleted }: PioneerDashboardProps) {
    const [stats, setStats] = useState({
        mesRealMin: 0,
        mesAbonoMin: 0,
        anoRealMin: 0,
        anoAbonoMin: 0
    })
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [saldoInicial, setSaldoInicial] = useState<number>(0)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isConfigOpen, setIsConfigOpen] = useState(false)
    const [isWelcomeOpen, setIsWelcomeOpen] = useState(false)
    const [isCompletingWelcome, setIsCompletingWelcome] = useState(false)
    const [pioneerStartDate, setPioneerStartDate] = useState<string | null>(null)
    const [initialTimerMinutes, setInitialTimerMinutes] = useState(0)
    const [initialStartTime, setInitialStartTime] = useState<string | null>(null)
    const [initialEndTime, setInitialEndTime] = useState<string | null>(null)
    const [editingLog, setEditingLog] = useState<LogEntry | null>(null)
    const [isPastMonthsOpen, setIsPastMonthsOpen] = useState(false)

    // Service Year Bounds
    const getServiceYearRange = () => {
        const now = new Date()
        let startYear = now.getFullYear()
        if (now.getMonth() < 8) startYear -= 1
        return {
            start: `${startYear}-09-01`,
            end: `${startYear + 1}-08-31`,
            label: `${startYear + 1}`
        }
    }

    const { start: yearStart, end: yearEnd, label: yearLabel } = getServiceYearRange()

    const getMonthsFromStart = (startDate: string | null) => {
        if (!startDate) return 12

        const start = parseISO(startDate)
        const serviceStart = parseISO(yearStart)
        const serviceEnd = parseISO(yearEnd)
        if (start < serviceStart || start > serviceEnd) return 12

        return (serviceEnd.getFullYear() - start.getFullYear()) * 12
            + serviceEnd.getMonth() - start.getMonth() + 1
    }

    const getMonthsElapsed = (startDate: string | null) => {
        const referenceStart = startDate && parseISO(startDate) > parseISO(yearStart)
            ? parseISO(startDate)
            : parseISO(yearStart)
        const now = new Date()

        return Math.max(1, (now.getFullYear() - referenceStart.getFullYear()) * 12
            + now.getMonth() - referenceStart.getMonth() + 1)
    }

    const fetchAllData = useCallback(async () => {
        try {
            // 1. Fetch Logs
            const { data: logsData, error: logsError } = await supabase.rpc('listar_logs_pioneiro', {
                p_membro_id: membroId,
                p_pin: pin,
                p_data_inicio: yearStart,
                p_data_fim: yearEnd,
            })
            
            if (logsError) throw logsError
            setLogs(logsData || [])

            const { data: anyPioneerLog, error: pioneerLogError } = await supabase.rpc('listar_logs_pioneiro', {
                p_membro_id: membroId,
                p_pin: pin,
            })
            if (pioneerLogError) throw pioneerLogError

            // 2. Fetch Saldo Inicial from membro
            const { data: membroDataRaw, error: membroError } = await supabase.rpc('obter_configuracao_pioneiro', {
                p_membro_id: membroId,
                p_pin: pin
            })
            if (membroError) throw membroError
            if (!membroDataRaw || typeof membroDataRaw !== 'object' || Array.isArray(membroDataRaw)) {
                throw new Error('PIN invalido para este pioneiro.')
            }
            const membroData = membroDataRaw as PioneerConfig
            
            const saldoJson = membroData?.saldo_inicial_pioneiro as Record<string, number> || {}
            const currentYearSaldo = saldoJson[yearLabel] || 0
            setSaldoInicial(currentYearSaldo)
            const startDates = membroData?.inicio_pioneiro_ano_servico as Record<string, string> || {}
            setPioneerStartDate(startDates[yearLabel] || null)

            if (!membroData?.pioneiro_onboarding_concluido && (anyPioneerLog?.length || 0) === 0) {
                setIsWelcomeOpen(true)
            }

            // 3. Calculate Stats
            let anoRealMin = currentYearSaldo * 60 // Initial balance is in hours
            let anoAbonoMin = 0
            let mesRealMin = 0
            let mesAbonoMin = 0

            const now = new Date()
            const startOfMonth = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd')

            logsData?.forEach(log => {
                const isLDC = log.categoria === 'LDC'
                const min = log.minutos || 0
                const isThisMonth = log.data >= startOfMonth

                if (isLDC) {
                    anoAbonoMin += min
                    if (isThisMonth) mesAbonoMin += min
                } else {
                    anoRealMin += min
                    if (isThisMonth) mesRealMin += min
                }
            })

            setStats({
                mesRealMin,
                mesAbonoMin,
                anoRealMin,
                anoAbonoMin,
            })

        } catch (err) {
            console.error("Error fetching pioneer data:", err)
        }
    }, [membroId, pin, yearStart, yearEnd, yearLabel])

    useEffect(() => {
        void fetchAllData()
    }, [fetchAllData])

    const handleDeleteLog = async (id: string) => {
        if (!confirm('Deseja realmente excluir este registro?')) return
        try {
            const { data: deleted, error } = await supabase.rpc('excluir_log_pioneiro', {
                p_membro_id: membroId,
                p_pin: pin,
                p_log_id: id,
            })
            if (error) throw error
            if (!deleted) throw new Error('Registro não encontrado.')
            toast.success('Registro excluído')
            await fetchAllData()
        } catch {
            toast.error('Erro ao excluir')
        }
    }

    const handleSaveSaldo = async (horas: number) => {
        try {
            const { data: saved, error } = await supabase.rpc('salvar_configuracao_pioneiro', {
                p_membro_id: membroId,
                p_pin: pin,
                p_ano_servico: yearLabel,
                p_saldo_inicial: horas
            })
            if (error) throw error
            if (!saved) throw new Error('PIN invalido para este pioneiro.')
            toast.success('Saldo inicial atualizado')
            setIsConfigOpen(false)
            await fetchAllData()
            if (isCompletingWelcome) onOnboardingCompleted?.()
        } catch {
            toast.error('Erro ao salvar saldo')
        }
    }

    const handleWelcomeChoice = async (isStartingNow: boolean) => {
        try {
            if (!isStartingNow) {
                setIsWelcomeOpen(false)
                setIsCompletingWelcome(true)
                setIsConfigOpen(true)
                return
            }

            const { data: saved, error: saveConfigError } = await supabase.rpc('salvar_configuracao_pioneiro', {
                p_membro_id: membroId,
                p_pin: pin,
                p_ano_servico: yearLabel,
                p_data_inicio: format(new Date(), 'yyyy-MM-dd')
            })
            if (saveConfigError) throw saveConfigError
            if (!saved) throw new Error('PIN invalido para este pioneiro.')

            setIsWelcomeOpen(false)
            toast.success('Sua meta foi ajustada para este ano de serviço.')
            await fetchAllData()
            onOnboardingCompleted?.()
        } catch (error) {
            console.error('Error saving pioneer onboarding:', error)
            toast.error('Não foi possível salvar essa configuração.')
        }
    }

    const handleSaveManualEntry = async (data: string, minutos: number, categoria: CategoriaMinisterio, comment: string, startTime?: string | null, endTime?: string | null, logId?: string) => {
        const { error } = await supabase.rpc('salvar_log_pioneiro', {
            p_membro_id: membroId,
            p_pin: pin,
            p_data: data,
            p_minutos: minutos,
            p_categoria: categoria,
            p_comentarios: comment || null,
            p_start_time: startTime || null,
            p_end_time: endTime || null,
            p_log_id: logId || null,
        })
        if (error) throw error
        toast.success(logId ? 'Atividade atualizada com sucesso!' : 'Tempo registrado com sucesso!')
        await fetchAllData()
    }

    const targetMes = 50
    const targetAno = getMonthsFromStart(pioneerStartDate) * targetMes
    const formatMinutes = (totalMinutes: number) => {
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60
        return `${hours}h ${minutes.toString().padStart(2, '0')}min`
    }
    const startOfMonth = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd')
    const currentMonthLogs = logs.filter((log) => log.data >= startOfMonth)

    // Color logic
    const monthsElapsed = Math.min(getMonthsElapsed(pioneerStartDate), getMonthsFromStart(pioneerStartDate))
    const expected = monthsElapsed * targetMes
    
    const totalAnoCalculadoMin = stats.anoRealMin + stats.anoAbonoMin
    const expectedMin = expected * 60
    const diffMin = expectedMin - totalAnoCalculadoMin
    const isAnoOnTrack = diffMin <= 0
    const colorClass = isAnoOnTrack ? 'text-emerald-500' : 'text-orange-500'

    return (
        <div className="space-y-6 text-left">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Stats Card */}
                <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white text-left">Meu Progresso Geral</h2>
                            <p className="text-xs text-slate-500 font-medium text-left">Ano de Serviço {yearLabel}</p>
                        </div>
                        <button 
                            onClick={() => setIsConfigOpen(true)}
                            className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 hover:text-blue-600 transition-colors"
                            title="Configurar Saldo Inicial"
                        >
                            <Settings2 className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <RadialProgress 
                            currentMinutes={stats.mesRealMin}
                            target={targetMes} 
                            abonoMinutes={stats.mesAbonoMin}
                            label="Meta Mensal"
                            colorClass="text-blue-600"
                        />
                        <RadialProgress 
                            currentMinutes={stats.anoRealMin}
                            target={targetAno} 
                            abonoMinutes={stats.anoAbonoMin}
                            label="Meta Anual"
                            colorClass={colorClass}
                        />
                    </div>
                    
                    <p className="mt-5 text-center text-xs font-medium text-slate-400">
                        A meta mensal recomeça no dia 1º. As horas dos meses anteriores continuam salvas.
                    </p>
                    <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 shadow-inner rounded-2xl">
                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[11px] md:text-sm font-medium text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                Ideal para esse mês: <span className="font-bold text-slate-800 dark:text-white">{expected}h</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                Feitas: <span className="font-bold text-slate-800 dark:text-white">{formatMinutes(totalAnoCalculadoMin)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${diffMin > 0 ? 'bg-orange-400' : 'bg-emerald-400'}`}></span>
                                {diffMin > 0 ? 'Faltam' : 'Sobrando'}: <span className={`font-bold ${diffMin > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatMinutes(Math.abs(diffMin))}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timer Card */}
                <div className="lg:col-span-4">
                    <TimerCard 
                        membroId={membroId} 
                        onManualEntry={() => { setEditingLog(null); setInitialTimerMinutes(0); setInitialStartTime(null); setInitialEndTime(null); setIsModalOpen(true); }}
                        onTimerStop={(min, start, end) => { setEditingLog(null); setInitialTimerMinutes(min); setInitialStartTime(start); setInitialEndTime(end); setIsModalOpen(true); }}
                    />
                </div>
            </div>

            {/* History Section */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-400" />
                        Histórico deste mês
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsPastMonthsOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600 transition hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
                        >
                            <CalendarDays className="h-3.5 w-3.5" />
                            Meses anteriores
                        </button>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-lg">
                            {currentMonthLogs.length} lançamentos
                        </span>
                    </div>
                </div>
                
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                    {currentMonthLogs.length > 0 ? currentMonthLogs.slice(0, 10).map((log) => (
                        <div
                            key={log.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                                setEditingLog(log)
                                setInitialTimerMinutes(0)
                                setInitialStartTime(log.start_time)
                                setInitialEndTime(log.end_time)
                                setIsModalOpen(true)
                            }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault()
                                    setEditingLog(log)
                                    setInitialTimerMinutes(0)
                                    setInitialStartTime(log.start_time)
                                    setInitialEndTime(log.end_time)
                                    setIsModalOpen(true)
                                }
                            }}
                            className="cursor-pointer p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                            title="Editar atividade"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                                    log.categoria === 'LDC' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                                }`}>
                                    {log.categoria === 'LDC' ? 'AB' : 'HR'}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate capitalize">
                                        {format(parseISO(log.data), "EEEE, dd/MM", { locale: ptBR })}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium uppercase">
                                        {Math.floor(log.minutos / 60)}h {log.minutos % 60}min • {log.categoria}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        void handleDeleteLog(log.id)
                                    }}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="p-12 text-center">
                            <Sparkles className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-400">Nenhum registro neste mês.</p>
                            <button
                                type="button"
                                onClick={() => setIsPastMonthsOpen(true)}
                                className="mt-3 text-sm font-bold text-blue-600 hover:underline"
                            >
                                Ver horas dos meses anteriores
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Config Modal for Initial Balance */}
            {isWelcomeOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold mb-2 dark:text-white">Bem-vindo ao Painel do Pioneiro</h3>
                        <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
                            Para preparar sua meta deste ano de serviço, escolha a opção que descreve sua situação.
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={() => void handleWelcomeChoice(false)}
                                className="w-full text-left p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                            >
                                <span className="block font-bold text-slate-800 dark:text-white">Já sou pioneiro</span>
                                <span className="block mt-1 text-sm text-slate-500">Informar as horas que já fiz neste ano de serviço.</span>
                            </button>
                            <button
                                onClick={() => void handleWelcomeChoice(true)}
                                className="w-full text-left p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                            >
                                <span className="block font-bold text-slate-800 dark:text-white">Fui aprovado para começar este mês</span>
                                <span className="block mt-1 text-sm text-slate-500">Calcularemos uma meta proporcional para os meses restantes.</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isConfigOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold mb-2 dark:text-white">Saldo Inicial</h3>
                        <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
                            Coloque aqui <strong>quantas horas</strong> você já fez <strong>neste ano</strong> de serviço pra começar a usar o app.
                        </p>
                        <div className="relative mb-6">
                            <input 
                                type="number" 
                                defaultValue={saldoInicial}
                                className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 text-2xl font-bold focus:ring-2 focus:ring-blue-500 dark:text-white"
                                id="initialHours"
                            />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 font-bold text-slate-400">HORAS</span>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsConfigOpen(false)} className="flex-1 py-3 font-bold text-slate-400">Cancelar</button>
                            <button 
                                onClick={() => {
                                    const val = parseInt((document.getElementById('initialHours') as HTMLInputElement).value) || 0;
                                    handleSaveSaldo(val);
                                }}
                                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PastMonthsHoursModal
                isOpen={isPastMonthsOpen}
                onClose={() => setIsPastMonthsOpen(false)}
                membroId={membroId}
                pin={pin}
            />

            <ManualEntryModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSaveManualEntry} 
                entryToEdit={editingLog}
                initialMinutes={initialTimerMinutes}
                initialStartTime={initialStartTime}
                initialEndTime={initialEndTime}
            />
        </div>
    )
}
