'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface EventModalProps {
    event: any
    onClose: () => void
}

export default function EventModal({ event, onClose }: EventModalProps) {
    if (!event) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <div className={`p-6 ${event.tipo === 'assembleia' ? 'bg-purple-100 dark:bg-purple-900/30' :
                        event.tipo === 'congresso' ? 'bg-blue-100 dark:bg-blue-900/30' :
                            event.tipo === 'limpeza' ? 'bg-green-100 dark:bg-green-900/30' :
                                event.tipo === 'visita' ? 'bg-teal-100 dark:bg-teal-900/30' :
                                    'bg-orange-100 dark:bg-orange-900/30'
                    }`}>
                    <div className="flex justify-between items-start">
                        <span className="text-4xl">
                            {event.tipo === 'assembleia' ? '🏛️' :
                                event.tipo === 'congresso' ? '🏟️' :
                                    event.tipo === 'limpeza' ? '🧹' :
                                        event.tipo === 'visita' ? '👔' : '⭐'}
                        </span>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                    <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
                        {event.titulo}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-300 font-medium capitalize mt-1">
                        {event.tipo}
                    </p>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                        <span className="text-xl">📅</span>
                        <span className="font-medium">
                            {format(new Date(event.data_inicio + 'T12:00:00'), "EEEE, d 'de' MMMM", { locale: ptBR })}
                            {event.data_fim && event.data_fim !== event.data_inicio && (
                                <> até {format(new Date(event.data_fim + 'T12:00:00'), "EEEE, d 'de' MMMM", { locale: ptBR })}</>
                            )}
                        </span>
                    </div>

                    {event.descricao && (
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Detalhes</h3>
                            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                {event.descricao}
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    )
}
