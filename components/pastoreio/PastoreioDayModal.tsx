'use client'

import { useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export type VisitaDoDia = {
    id: string
    nome: string
    atrasada: boolean
}

type PastoreioDayModalProps = {
    data: string
    visitas: VisitaDoDia[]
    onClose: () => void
    onVerNaLista: (id: string) => void
}

export default function PastoreioDayModal({ data, visitas, onClose, onVerNaLista }: PastoreioDayModalProps) {
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [onClose])

    const titulo = format(parseISO(data), "EEEE, d 'de' MMMM", { locale: ptBR })

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="pastoreio-dia-titulo"
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
                onClick={event => event.stopPropagation()}
            >
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-start gap-4">
                        <h2 id="pastoreio-dia-titulo" className="text-xl font-bold capitalize text-slate-900 dark:text-white">
                            {titulo}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Fechar"
                            className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-500"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <ul className="p-6 space-y-3">
                    {visitas.map(visita => (
                        <li key={visita.id} className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="font-medium text-slate-800 dark:text-slate-100 break-words">
                                    {visita.nome}
                                </p>
                                {visita.atrasada && (
                                    <p className="text-xs font-medium text-red-600">Atrasada</p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => onVerNaLista(visita.id)}
                                className="shrink-0 text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                                Ver na lista
                            </button>
                        </li>
                    ))}
                </ul>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-medium hover:opacity-90"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    )
}
