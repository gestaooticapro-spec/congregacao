'use client'

import React, { useEffect, useState } from 'react'
import { X, Save, Clock, CalendarDays } from 'lucide-react'
import { CategoriaMinisterio } from '@/types/database.types'

type CategoriaOption = {
    value: CategoriaMinisterio;
    label: string;
}

const CATEGORIAS: CategoriaOption[] = [
    { value: 'CAMPO', label: 'Campo' },
    { value: 'ESTUDO', label: 'Estudo Bíblico' },
    { value: 'CARTA', label: 'Cartas' },
    { value: 'PUBLICO', label: 'Testemunho Público (Carrinho)' },
    { value: 'INFORMAL', label: 'Informal' },
    { value: 'OUTROS', label: 'Outros (Telefone, etc)' },
    { value: 'LDC', label: 'LDC (Abono)' },
]

interface ManualEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: string, minutos: number, categoria: CategoriaMinisterio, comment: string, startTime?: string | null, endTime?: string | null) => Promise<void>;
    initialMinutes?: number;
    initialStartTime?: string | null;
    initialEndTime?: string | null;
}

export default function ManualEntryModal({ isOpen, onClose, onSave, initialMinutes = 0, initialStartTime = null, initialEndTime = null }: ManualEntryModalProps) {
    const [data, setData] = useState(new Date().toISOString().split('T')[0])
    const [horas, setHoras] = useState(Math.floor(initialMinutes / 60).toString())
    const [minutos, setMinutos] = useState((initialMinutes % 60).toString())
    const [categoria, setCategoria] = useState<CategoriaMinisterio>('CAMPO')
    const [comentarios, setComentarios] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) return
        setHoras(Math.floor(initialMinutes / 60).toString())
        setMinutos((initialMinutes % 60).toString())
        setError(null)
    }, [isOpen, initialMinutes])

    if (!isOpen) return null

    const handleSave = async () => {
        const h = parseInt(horas) || 0
        const m = parseInt(minutos) || 0
        const totalMinutes = (h * 60) + m

        if (totalMinutes <= 0) {
            setError("Por favor, informe pelo menos 1 minuto de atividade.")
            return
        }

        if (!data) {
            setError("A data é obrigatória.")
            return
        }

        setError(null)
        setIsSaving(true)

        try {
            await onSave(data, totalMinutes, categoria, comentarios, initialStartTime, initialEndTime)
            onClose()
            setHoras('')
            setMinutos('')
            setComentarios('')
            setCategoria('CAMPO')
            setData(new Date().toISOString().split('T')[0])
        } catch (err: any) {
            console.error('[ManualEntry] Save error:', err)
            const msg = err?.message || "Não foi possível salvar. Tente novamente."
            setError(msg)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        {initialMinutes > 0 ? (
                            <>Confirmar Tempo <span className="text-sm font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded ml-2">Cronômetro</span></>
                        ) : 'Lançamento Manual'}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-slate-400" /> Data
                            </label>
                            <input 
                                type="date" 
                                value={data}
                                onChange={(e) => setData(e.target.value)}
                                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-400" /> Duração
                            </label>
                            <div className="flex gap-4">
                                <div className="flex-1 relative">
                                    <input 
                                        type="number" 
                                        min="0"
                                        placeholder="0"
                                        value={horas || ''}
                                        onChange={(e) => setHoras(e.target.value)}
                                        className="w-full p-3 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow text-center text-lg font-bold dark:text-white"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">h</span>
                                </div>
                                <div className="flex-1 relative">
                                    <input 
                                        type="number" 
                                        min="0"
                                        max="59"
                                        placeholder="00"
                                        value={minutos || ''}
                                        onChange={(e) => setMinutos(e.target.value)}
                                        className="w-full p-3 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow text-center text-lg font-bold dark:text-white"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">min</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Categoria
                            </label>
                            <select 
                                value={categoria}
                                onChange={(e) => setCategoria(e.target.value as CategoriaMinisterio)}
                                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow dark:text-white"
                            >
                                {CATEGORIAS.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                            {categoria === 'LDC' && (
                                <p className="text-xs text-blue-600 mt-1 font-medium bg-blue-50 inline-block px-2 py-0.5 rounded">
                                    Esta categoria conta como &quot;abono&quot; e preenche a meta visualmente sem inflar o relatório final.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Observações <span className="text-slate-400 font-normal">(Opcional)</span>
                            </label>
                            <input 
                                type="text" 
                                placeholder="Com quem trabalhou, território, etc."
                                value={comentarios}
                                onChange={(e) => setComentarios(e.target.value)}
                                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                        disabled={isSaving}
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white transition-all transform hover:scale-105 active:scale-95 ${
                            isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20'
                        }`}
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <><Save className="w-4 h-4" /> Salvar Tempo</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
