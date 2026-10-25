'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, Square, Clock, PlusCircle } from 'lucide-react'

interface TimerCardProps {
    membroId: string;
    onManualEntry: () => void;
    onTimerStop: (minutos: number, startTime: string, endTime: string) => void;
    actionButtonRef: React.RefObject<HTMLButtonElement | null>;
    savedTimerNonce: number;
}

type TimerState = {
    startIso: string;
    endIso?: string;
    elapsedMilliseconds?: number;
    // Kept to restore timer states saved before millisecond precision was added.
    elapsedSeconds?: number;
    activeSinceIso?: string;
    isPaused?: boolean;
}

export default function TimerCard({ membroId, onManualEntry, onTimerStop, actionButtonRef, savedTimerNonce }: TimerCardProps) {
    const [isActive, setIsActive] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [startTime, setStartTime] = useState<Date | null>(null)
    const [activeSince, setActiveSince] = useState<Date | null>(null)
    const [endTime, setEndTime] = useState<Date | null>(null)
    const [elapsedMilliseconds, setElapsedMilliseconds] = useState(0)
    const [accumulatedMilliseconds, setAccumulatedMilliseconds] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const onTimerStopRef = useRef(onTimerStop)
    const lastSavedTimerNonceRef = useRef(savedTimerNonce)
    const storageKey = `pioneer_timer_state:${membroId}`

    onTimerStopRef.current = onTimerStop

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
        setStartTime(null)
        setActiveSince(null)
        setEndTime(null)
        setElapsedMilliseconds(0)
        setAccumulatedMilliseconds(0)
        setIsActive(false)
        setIsPaused(false)
        try {
            if (typeof window === 'undefined') return

            const raw = localStorage.getItem(storageKey)
            if (!raw) return

            try {
                const parsed = JSON.parse(raw) as TimerState
                if (!parsed.startIso) {
                    localStorage.removeItem(storageKey)
                    return
                }

                const parsedStart = new Date(parsed.startIso)
                const parsedEnd = parsed.endIso ? new Date(parsed.endIso) : null
                const parsedActiveSince = parsed.activeSinceIso ? new Date(parsed.activeSinceIso) : null
                if (
                    Number.isNaN(parsedStart.getTime()) ||
                    (parsedEnd && Number.isNaN(parsedEnd.getTime())) ||
                    (parsedActiveSince && Number.isNaN(parsedActiveSince.getTime()))
                ) {
                    localStorage.removeItem(storageKey)
                    return
                }

                const savedElapsedMilliseconds = Math.max(
                    0,
                    parsed.elapsedMilliseconds ?? (parsed.elapsedSeconds ?? 0) * 1000
                )
                setStartTime(parsedStart)
                setEndTime(parsedEnd)

                if (parsedEnd) {
                    // Older saved timers only have start/end timestamps.
                    const totalMilliseconds = parsed.elapsedMilliseconds
                        ?? (parsed.elapsedSeconds != null
                            ? parsed.elapsedSeconds * 1000
                            : parsedEnd.getTime() - parsedStart.getTime())
                    const safeTotalMilliseconds = Math.max(0, totalMilliseconds)
                    setElapsedMilliseconds(safeTotalMilliseconds)
                    setAccumulatedMilliseconds(safeTotalMilliseconds)
                    setActiveSince(null)
                    setIsActive(false)
                    setIsPaused(false)
                    window.setTimeout(() => {
                        onTimerStopRef.current(
                            Math.max(Math.floor(safeTotalMilliseconds / 60000), 1),
                            parsedStart.toISOString(),
                            parsedEnd.toISOString()
                        )
                    }, 0)
                    return
                }

                if (parsed.isPaused) {
                    setElapsedMilliseconds(savedElapsedMilliseconds)
                    setAccumulatedMilliseconds(savedElapsedMilliseconds)
                    setActiveSince(null)
                    setIsActive(false)
                    setIsPaused(true)
                    return
                }

                // Timer states saved before pause support don't include activeSinceIso.
                const restoredActiveSince = parsedActiveSince || parsedStart
                setActiveSince(restoredActiveSince)
                setAccumulatedMilliseconds(savedElapsedMilliseconds)
                setElapsedMilliseconds(savedElapsedMilliseconds + Math.max(0, Date.now() - restoredActiveSince.getTime()))
                setIsActive(true)
                setIsPaused(false)
            } catch {
                localStorage.removeItem(storageKey)
            }
        } finally {
            setIsLoading(false)
        }
    }, [storageKey])

    useEffect(() => {
        void restoreTimer()
    }, [restoreTimer])

    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
        }

        if (isActive && activeSince) {
            setElapsedMilliseconds(accumulatedMilliseconds + Math.max(0, Date.now() - activeSince.getTime()))
            intervalRef.current = setInterval(() => {
                setElapsedMilliseconds(accumulatedMilliseconds + Math.max(0, Date.now() - activeSince.getTime()))
            }, 1000)
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [isActive, activeSince, accumulatedMilliseconds])

    useEffect(() => {
        if (savedTimerNonce === lastSavedTimerNonceRef.current) return
        lastSavedTimerNonceRef.current = savedTimerNonce
        if (savedTimerNonce === 0) return
        clearLocalTimerState()
        setStartTime(null)
        setActiveSince(null)
        setEndTime(null)
        setIsActive(false)
        setElapsedMilliseconds(0)
        setAccumulatedMilliseconds(0)
        setIsPaused(false)
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

    const handleStart = () => {
        const now = new Date()
        setStartTime(now)
        setActiveSince(now)
        setEndTime(null)
        setIsActive(true)
        setIsPaused(false)
        setElapsedMilliseconds(0)
        setAccumulatedMilliseconds(0)
        saveLocalTimerState({ startIso: now.toISOString(), activeSinceIso: now.toISOString(), elapsedMilliseconds: 0 })
    }

    const handlePause = () => {
        if (!startTime || !activeSince) return

        const now = new Date()
        const totalMilliseconds = accumulatedMilliseconds + Math.max(0, now.getTime() - activeSince.getTime())
        setIsActive(false)
        setIsPaused(true)
        setActiveSince(null)
        setElapsedMilliseconds(totalMilliseconds)
        setAccumulatedMilliseconds(totalMilliseconds)
        saveLocalTimerState({ startIso: startTime.toISOString(), elapsedMilliseconds: totalMilliseconds, isPaused: true })
    }

    const handleResume = () => {
        if (!startTime) return

        const now = new Date()
        setActiveSince(now)
        setIsPaused(false)
        setIsActive(true)
        saveLocalTimerState({
            startIso: startTime.toISOString(),
            elapsedMilliseconds: accumulatedMilliseconds,
            activeSinceIso: now.toISOString(),
        })
    }

    const handleStop = () => {
        const end = new Date()
        const start = startTime || end
        const activeMilliseconds = isActive && activeSince
            ? accumulatedMilliseconds + Math.max(0, end.getTime() - activeSince.getTime())
            : accumulatedMilliseconds
        const totalMinutes = Math.max(Math.floor(activeMilliseconds / 60000), 1)

        setIsActive(false)
        setIsPaused(false)
        setActiveSince(null)
        setEndTime(end)
        setElapsedMilliseconds(activeMilliseconds)
        setAccumulatedMilliseconds(activeMilliseconds)
        saveLocalTimerState({ startIso: start.toISOString(), endIso: end.toISOString(), elapsedMilliseconds: activeMilliseconds })

        onTimerStop(totalMinutes, start.toISOString(), end.toISOString())
    }

    const reopenPendingTimer = () => {
        if (!startTime || !endTime) return
        onTimerStop(
            Math.max(Math.floor(elapsedMilliseconds / 60000), 1),
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
                    {isActive ? 'Ministério em andamento' : isPaused ? 'Cronômetro pausado' : 'Cronômetro'}
                </div>

                <div className={`text-6xl font-mono tracking-tighter font-light mb-6 transition-colors duration-300 ${isActive ? 'text-blue-600 dark:text-blue-400 font-medium' : isPaused ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-white'}`}>
                    {formatTime(Math.floor(elapsedMilliseconds / 1000))}
                </div>

                <div className="flex items-center gap-3 w-full">
                    <button
                        ref={actionButtonRef}
                        onClick={isActive ? handleStop : isPaused ? handleResume : endTime ? reopenPendingTimer : handleStart}
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
                        ) : isPaused ? (
                            <>
                                <Play className="w-5 h-5 fill-current" /> Continuar
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

                    {isActive && (
                        <button
                            onClick={handlePause}
                            className="flex items-center justify-center gap-2 py-4 px-4 rounded-xl font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
                            aria-label="Pausar cronômetro"
                            title="Pausar cronômetro"
                        >
                            <Pause className="w-5 h-5 fill-current" />
                            <span className="hidden sm:inline">Pausar</span>
                        </button>
                    )}

                    {isPaused && (
                        <button
                            onClick={handleStop}
                            className="flex items-center justify-center gap-2 py-4 px-4 rounded-xl font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                            aria-label="Finalizar cronômetro"
                            title="Finalizar cronômetro"
                        >
                            <Square className="w-5 h-5 fill-current" />
                            <span className="hidden sm:inline">Parar</span>
                        </button>
                    )}

                    {!isActive && !isPaused && !endTime && (
                        <button
                            onClick={onManualEntry}
                            className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 p-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                            title="Lançamento Manual"
                        >
                            <PlusCircle className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {(isActive || isPaused) && (
                    <div className="mt-4 text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900/50 px-3 py-1.5 rounded-full flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`}></div>
                        {isPaused ? 'Tempo pausado. Toque em “Continuar” para retomar.' : 'Seu tempo fica guardado neste dispositivo até você salvar.'}
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
