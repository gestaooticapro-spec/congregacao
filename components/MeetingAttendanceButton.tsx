'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type MeetingType = 'MEIO_SEMANA' | 'FIM_SEMANA'

interface MeetingAttendanceButtonProps {
    date: string | undefined
    meetingType: MeetingType
}

export default function MeetingAttendanceButton({ date, meetingType }: MeetingAttendanceButtonProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [quantity, setQuantity] = useState('')
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!date) return

        const loadAttendance = async () => {
            setLoading(true)
            const { data, error } = await (supabase as any)
                .from('assistencias_reunioes')
                .select('quantidade')
                .eq('data_reuniao', date)
                .eq('tipo_reuniao', meetingType)
                .maybeSingle()

            if (!error) setQuantity(data?.quantidade?.toString() || '')
            setLoading(false)
        }

        loadAttendance()
    }, [date, meetingType])

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault()
        const parsedQuantity = Number(quantity)

        if (!date || !Number.isInteger(parsedQuantity) || parsedQuantity < 0) return

        setSaving(true)
        const { error } = await (supabase as any)
            .from('assistencias_reunioes')
            .upsert({
                data_reuniao: date,
                tipo_reuniao: meetingType,
                quantidade: parsedQuantity,
                atualizado_em: new Date().toISOString()
            }, { onConflict: 'data_reuniao,tipo_reuniao' })

        setSaving(false)
        if (error) {
            console.error('Erro ao salvar assistência:', error)
            return
        }

        setQuantity(parsedQuantity.toString())
        setIsOpen(false)
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                disabled={!date || loading}
                className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-800/50 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
            >
                {quantity ? `Assistência: ${quantity}` : 'Informar assistência'}
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                >
                    <form
                        onSubmit={handleSave}
                        onClick={event => event.stopPropagation()}
                        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
                    >
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Informar assistência</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Informe o número inteiro de irmãos presentes nesta reunião.
                        </p>
                        <label className="mt-5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Quantidade de presentes
                            <input
                                type="number"
                                min="0"
                                step="1"
                                required
                                autoFocus
                                value={quantity}
                                onChange={event => setQuantity(event.target.value)}
                                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                        </label>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    )
}
