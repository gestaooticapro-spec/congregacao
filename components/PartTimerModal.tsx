'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, X } from 'lucide-react'
import { formatPartElapsed, getPartElapsedMs, initialPartTimerState, togglePartTimer } from '@/lib/partTimer'

interface PartTimerModalProps {
    open: boolean
    title: string
    durationMinutes: number
    onClose: () => void
}

function clockTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    })
}

export default function PartTimerModal({ open, title, durationMinutes, onClose }: PartTimerModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const [timer, setTimer] = useState(initialPartTimerState)
    const [now, setNow] = useState(() => Date.now())

    useEffect(() => {
        const dialog = dialogRef.current
        if (!dialog) return
        if (open && !dialog.open) dialog.showModal()
        if (!open && dialog.open) dialog.close()
    }, [open])

    useEffect(() => {
        if (!open) return
        const update = () => setNow(Date.now())
        update()
        const interval = window.setInterval(update, 200)
        document.addEventListener('visibilitychange', update)
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            window.clearInterval(interval)
            document.removeEventListener('visibilitychange', update)
            document.body.style.overflow = previousOverflow
        }
    }, [open])

    const durationMs = durationMinutes * 60_000
    const elapsedMs = getPartElapsedMs(timer, now)
    const overtime = elapsedMs > durationMs
    const start = timer.startedAt ?? now
    const end = start + durationMs
    const running = timer.runningSince !== null

    const handleToggle = () => {
        const timestamp = Date.now()
        setNow(timestamp)
        setTimer(current => togglePartTimer(current, timestamp))
    }

    const handleReset = () => {
        setNow(Date.now())
        setTimer(initialPartTimerState)
    }

    return (
        <dialog
            ref={dialogRef}
            aria-labelledby="part-timer-title"
            onCancel={onClose}
            onClose={onClose}
            className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white sm:p-7 print:hidden"
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 id="part-timer-title" className="text-xl font-bold">Cronômetro da minha parte</h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{title}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tempo previsto: {durationMinutes} min</p>
                </div>
                <button type="button" autoFocus onClick={onClose} aria-label="Fechar cronômetro" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-slate-800">
                    <X className="h-5 w-5" aria-hidden="true" />
                </button>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-100 p-4 text-center dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Início</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">{clockTime(start)}</p>
            </div>

            <div className="py-7 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">Tempo decorrido</p>
                <p role="timer" aria-label="Tempo decorrido" className={`my-2 text-[clamp(3rem,17vw,5rem)] font-bold leading-none tabular-nums ${overtime ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                    {formatPartElapsed(elapsedMs)}
                </p>
                <p role="status" className={`min-h-6 text-sm font-semibold ${overtime ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {overtime ? 'Tempo previsto ultrapassado' : timer.startedAt === null ? 'Pronto para começar' : running ? 'Em andamento' : 'Pausado'}
                </p>
                <div className="mt-5 flex justify-center gap-3">
                    <button type="button" onClick={handleToggle} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                        {running ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5" aria-hidden="true" />}
                        {running ? 'Pausar' : timer.startedAt === null ? 'Começar' : 'Continuar'}
                    </button>
                    <button type="button" onClick={handleReset} disabled={timer.startedAt === null} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 font-semibold hover:bg-slate-100 disabled:opacity-40 dark:border-slate-600 dark:hover:bg-slate-800">
                        <RotateCcw className="h-4 w-4" aria-hidden="true" /> Zerar
                    </button>
                </div>
            </div>

            <div className="rounded-2xl bg-slate-100 p-4 text-center dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Término previsto</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">{clockTime(end)}</p>
            </div>
            <p className="mt-4 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {timer.startedAt === null
                    ? 'Ao começar, os horários de início e término ficam fixos.'
                    : 'Pausar interrompe a contagem, sem alterar os horários. Fechar mantém o cronômetro nesta página.'}
            </p>
        </dialog>
    )
}
