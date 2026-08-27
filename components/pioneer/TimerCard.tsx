'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Square, Clock, PlusCircle } from 'lucide-react'

interface TimerCardProps {
    membroId: string;
    onManualEntry: () => void;
    onTimerStop: (minutos: number, startTime: string, endTime: string) => void;
}

export default function TimerCard({ membroId, onManualEntry, onTimerStop }: TimerCardProps) {
    const [isActive, setIsActive] = useState(false)
    const [startTime, setStartTime] = useState<Date | null>(null)
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const storageKey = `pioneer_timer_state:${membroId}`

    const saveLocalTimerState = useCallback((state: { startIso: string }) => {
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
                        const parsed = JSON.parse(raw) as { startIso?: string }
                        if (parsed.startIso) {
                            localStart = new Date(parsed.startIso)
                        }
                    } catch {
                        localStorage.removeItem(storageKey)
                    }
                }
            }

            if (localStart) {
                setStartTime(localStart)
                setIsActive(true)
                setElapsedSeconds(Math.floor((Date.now() - localStart.getTime()) / 1000))
                saveLocalTimerState({ startIso: localStart.toISOString() })
            }
        } finally {
            setIsLoading(false)
        }
    }, [saveLocalTimerState, storageKey])

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
        setIsActive(true)
        setElapsedSeconds(0)
        saveLocalTimerState({ startIso: now.toISOString() })
    }

    const handleStop = async () => {
        const end = new Date()
        const start = startTime || end
        const totalMinutes = Math.max(Math.floor((end.getTime() - start.getTime()) / 60000), 1)
        
        setIsActive(false)
        setStartTime(null)
        setElapsedSeconds(0)
        clearLocalTimerState()
        
        onTimerStop(totalMinutes, start.toISOString(), end.toISOString())
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
                        onClick={isActive ? handleStop : handleStart}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] ${
                            isActive 
                            ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30 shadow-lg' 
                            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30 shadow-lg'
                        }`}
                    >
                        {isActive ? (
                            <>
                                <Square className="w-5 h-5 fill-current" /> Parar
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5 fill-current" /> Iniciar
                            </>
                        )}
                    </button>
                    
                    {!isActive && (
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
            </div>
        </div>
    )
}
