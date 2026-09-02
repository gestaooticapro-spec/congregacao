'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Square, Clock, PlusCircle } from 'lucide-react'

interface TimerCardProps {
    membroId: string;
    onManualEntry: () => void;
    onTimerStop: (minutos: number, startTime: string, endTime: string) => void;
    savedTimerNonce: number;
}

type TimerState = {
    startIso: string;
    endIso?: string;
}

export default function TimerCard({ membroId, onManualEntry, onTimerStop, savedTimerNonce }: TimerCardProps) {
    const [isActive, setIsActive] = useState(false)
    const [startTime, setStartTime] = useState<Date | null>(null)
    const [endTime, setEndTime] = useState<Date | null>(null)
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const storageKey = `pioneer_timer_state:${membroId}`

    const saveLocalTimerState = useCallback((state: TimerState) => {
        if (typeof window === 'undefined') return
        localStorage.setItem(storageKey, JSON.stringify(state))
    }, [storageKey])

    const clearLocalTimerState = useCallback(() => {
        if (typeof window === 'undefined') return
        localStorage.removeItem(storageKey)
    }, [storageKey])
    
    const restoreTimer = useCallback(async () => {
        setIsLoading(true)
        try {
            let localStart: Date | null = null
            if (typeof window !== 'undefined') {
                const raw = localStorage.getItem(storageKey)
                if (raw) {
                    try {
                        const parsed = JSON.parse(raw) as TimerState
                        if (parsed.startIso) {
                            const parsedStart = new Date(parsed.startIso)
                            const localEnd = parsed.endIso ? new Date(parsed.endIso) : null
                            if (Number.isNaN(parsedStart.getTime()) || (localEnd && Number.isNaN(localEnd.getTime()))) {
                                localStorage.removeItem(storageKey)
                                return
                            }

                            localStart = parsedStart
                            setStartTime(parsedStart)
                            setEndTime(localEnd)
                            setIsActive(!localEnd)
                            setElapsedSeconds(Math.floor(((localEnd || new Date()).getTime() - parsedStart.getTime()) / 1000))

                            if (localEnd) {
                                window.setTimeout(() => {
                                    onTimerStop(
                                        Math.max(Math.floor((localEnd.getTime() - parsedStart.getTime()) / 60000), 1),
                                        parsedStart.toISOString(),
                                        localEnd.toISOString()
                                    )
                                }, 0)
                            }
                        }
                    } catch {
                        localStorage.removeItem(storageKey)
                    }
                }
            }
        } finally {
            setIsLoading(false)
        }
    }, [onTimerStop, saveLocalTimerState, storageKey])

    useEffect(() => {
        void restoreTimer()
    }, [restoreTimer])

    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
        }

        if (isActive && startTime) {
            setElapsedSeconds(Math.floor((Date.now() - startTime.getTime()) / 1000))

            intervalRef.current = setInterval(() => {
                setElapsedSeconds(Math.floor((Date.now() - startTime.getTime()) / 1000))
            }, 1000)
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [isActive, startTime])

    useEffect(() => {
        if (savedTimerNonce === 0) return
        clearLocalTimerState()
        setStartTime(null)
        setEndTime(null)
        setElapsedSeconds(0)
    }, [clearLocalTimerState, savedTimerNonce])

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600)
        const m = Math.floor((totalSeconds % 3600) / 60)
        const s = totalSeconds % 60
        
        if (h > 0) {
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    const handleStart = async () => {
        const now = new Date()
        setStartTime(now)
        setEndTime(null)
        setIsActive(true)
        setElapsedSeconds(0)
        saveLocalTimerState({ startIso: now.toISOString() })
    }

    const handleStop = async () => {
        const end = new Date()
        const start = startTime || end
        const totalMinutes = Math.max(Math.floor((end.getTime() - start.getTime()) / 60000), 1)
        
        setIsActive(false)
        setEndTime(end)
        saveLocalTimerState({ startIso: start.toISOString(), endIso: end.toISOString() })
        
        onTimerStop(totalMinutes, start.toISOString(), end.toISOString())
    }

    const reopenPendingTimer = () => {
        if (!startTime || !endTime) return
        onTimerStop(
            Math.max(Math.floor((endTime.getTime() - startTime.getTime()) / 60000), 1),
            startTime.toISOString(),
            endTime.toISOString()
        )
    }

    if (isLoading) {
        return <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg p-6 relative overflow-hidden">
            {isActive && (
                <div className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 opacity-50 transition-all duration-1000 animate-pulse"></div>
            )}
            
            <div className="relative z-10 flex flex-col items-center">
                <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {isActive ? 'Ministério em andamento' : 'Cronômetro'}
                </div>
                
                <div className={`text-6xl font-mono tracking-tighter font-light mb-6 transition-colors duration-300 ${isActive ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-800 dark:text-white'}`}>
                    {formatTime(elapsedSeconds)}
                </div>
                
                <div className="flex items-center gap-4 w-full">
                    <button
                        onClick={isActive ? handleStop : endTime ? reopenPendingTimer : handleStart}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${
                            isActive 
                            ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30 shadow-lg' 
                            : endTime
                            ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30 shadow-lg'
                            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30 shadow-lg'
                        }`}
                    >
                        {isActive ? (
                            <>
                                <Square className="w-5 h-5 fill-current" /> Parar
                            </>
                        ) : endTime ? (
                            <>
                                <Clock className="w-5 h-5" /> Confirmar tempo
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5 fill-current" /> Iniciar
                            </>
                        )}
                    </button>
                    
                    {!isActive && !endTime && (
                        <button
                            onClick={onManualEntry}
                            className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 p-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                            title="Lançamento Manual"
                        >
                            <PlusCircle className="w-5 h-5" />
                        </button>
                    )}
                </div>
                
                {isActive && (
                    <div className="mt-4 text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900/50 px-3 py-1.5 rounded-full flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        Seu tempo fica guardado neste dispositivo até você salvar.
                    </div>
                )}
                {endTime && (
                    <div className="mt-4 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-full">
                        Tempo pendente. Toque em “Confirmar tempo” para salvar.
                    </div>
                )}
            </div>
        </div>
    )
}
