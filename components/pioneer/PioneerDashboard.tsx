'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { CategoriaMinisterio, Database } from '@/types/database.types'
import RadialProgress from './RadialProgress'
import TimerCard from './TimerCard'
import ManualEntryModal from './ManualEntryModal'
import { Trash2, Edit3, History, Settings2, Sparkles, AlertCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'react-hot-toast'

interface PioneerDashboardProps {
    membroId: string;
    nome: string;
}

type LogEntry = Database['public']['Tables']['ministerio_logs']['Row']

export default function PioneerDashboard({ membroId, nome }: PioneerDashboardProps) {
    const [stats, setStats] = useState({
        mesReal: 0,
        mesAbono: 0,
        anoReal: 0,
        anoAbono: 0
    })
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [saldoInicial, setSaldoInicial] = useState<number>(0)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isConfigOpen, setIsConfigOpen] = useState(false)
    const [initialTimerMinutes, setInitialTimerMinutes] = useState(0)
    const [initialStartTime, setInitialStartTime] = useState<string | null>(null)
    const [initialEndTime, setInitialEndTime] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

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

    const fetchAllData = useCallback(async () => {
        setIsLoading(true)
        try {
            // 1. Fetch Logs
            const { data: logsData, error: logsError } = await supabase
                .from('ministerio_logs')
                .select('*')
                .eq('membro_id', membroId)
                .gte('data', yearStart)
                .lte('data', yearEnd)
                .order('data', { ascending: false })
            
            if (logsError) throw logsError
            setLogs(logsData || [])

            // 2. Fetch Saldo Inicial from membro
            const { data: membroData } = await supabase
                .from('membros')
                .select('saldo_inicial_pioneiro')
                .eq('id', membroId)
                .single()
            
            const saldoJson = membroData?.saldo_inicial_pioneiro as Record<string, number> || {}
            const currentYearSaldo = saldoJson[yearLabel] || 0
            setSaldoInicial(currentYearSaldo)

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
                mesReal: Math.floor(mesRealMin / 60),
                mesAbono: Math.floor(mesAbonoMin / 60),
                anoReal: Math.floor(anoRealMin / 60),
                anoAbono: Math.floor(anoAbonoMin / 60),
            })

        } catch (err) {
            console.error("Error fetching pioneer data:", err)
        } finally {
            setIsLoading(false)
        }
    }, [membroId, yearStart, yearEnd, yearLabel])

    useEffect(() => {
        void fetchAllData()
    }, [fetchAllData])

    const handleDeleteLog = async (id: string) => {
        if (!confirm('Deseja realmente excluir este registro?')) return
        try {
            await supabase.from('ministerio_logs').delete().eq('id', id)
            toast.success('Registro excluído')
            await fetchAllData()
        } catch (e) {
            toast.error('Erro ao excluir')
        }
    }

    const handleSaveSaldo = async (horas: number) => {
        try {
            const { data: currentMembro } = await supabase.from('membros').select('saldo_inicial_pioneiro').eq('id', membroId).single()
            const currentSaldo = currentMembro?.saldo_inicial_pioneiro as Record<string, number> || {}
            const updatedSaldo = { ...currentSaldo, [yearLabel]: horas }
            
            await supabase.from('membros').update({ saldo_inicial_pioneiro: updatedSaldo }).eq('id', membroId)
            toast.success('Saldo inicial atualizado')
            setIsConfigOpen(false)
            await fetchAllData()
        } catch (e) {
            toast.error('Erro ao salvar saldo')
        }
    }

    const handleSaveManualEntry = async (data: string, minutos: number, categoria: CategoriaMinisterio, comment: string, startTime?: string | null, endTime?: string | null) => {
        const { error } = await supabase.from('ministerio_logs').insert({
            membro_id: membroId,
            data, minutos, categoria, comentarios: comment,
            start_time: startTime || null,
            end_time: endTime || null
        })
        if (error) throw error
        toast.success('Tempo registrado com sucesso!')
        await fetchAllData()
    }

    const targetMes = 50
    const targetAno = 600

    // Color logic
    const currentMonthIndex = new Date().getMonth()
    const monthsElapsed = currentMonthIndex >= 8 ? (currentMonthIndex - 8 + 1) : (currentMonthIndex + 4 + 1)
    const expected = monthsElapsed * targetMes
    
    const totalAnoCalculado = stats.anoReal + stats.anoAbono
    const diff = expected - totalAnoCalculado
    const isAnoOnTrack = diff <= 0
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
                            current={stats.mesReal} 
                            target={targetMes} 
                            abono={stats.mesAbono}
                            label="Meta Mensal"
                            colorClass="text-blue-600"
                        />
                        <RadialProgress 
                            current={stats.anoReal} 
                            target={targetAno} 
                            abono={stats.anoAbono}
                            label="Meta Anual"
                            colorClass={colorClass}
                        />
                    </div>
                    
                    <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 shadow-inner rounded-2xl">
                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[11px] md:text-sm font-medium text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                                Ideal para esse mês: <span className="font-bold text-slate-800 dark:text-white">{expected}h</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                Feitas: <span className="font-bold text-slate-800 dark:text-white">{totalAnoCalculado}h</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${diff > 0 ? 'bg-orange-400' : 'bg-emerald-400'}`}></span>
                                {diff > 0 ? 'Faltam' : 'Sobrando'}: <span className={`font-bold ${diff > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{Math.abs(diff)}h</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timer Card */}
                <div className="lg:col-span-4">
                    <TimerCard 
                        membroId={membroId} 
                        onManualEntry={() => { setInitialTimerMinutes(0); setInitialStartTime(null); setInitialEndTime(null); setIsModalOpen(true); }}
                        onTimerStop={(min, start, end) => { setInitialTimerMinutes(min); setInitialStartTime(start); setInitialEndTime(end); setIsModalOpen(true); }}
                    />
                </div>
            </div>

            {/* History Section */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-400" />
                        Histórico Recente
                    </h3>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-lg">
                        {logs.length} lançamentos
                    </span>
                </div>
                
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                    {logs.length > 0 ? logs.slice(0, 10).map((log) => (
                        <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
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
                                    onClick={() => handleDeleteLog(log.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="p-12 text-center">
                            <Sparkles className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-400">Nenhum registro encontrado neste ano.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Config Modal for Initial Balance */}
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

            <ManualEntryModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSaveManualEntry} 
                initialMinutes={initialTimerMinutes}
                initialStartTime={initialStartTime}
                initialEndTime={initialEndTime}
            />
        </div>
    )
}
