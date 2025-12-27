'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface EventListProps {
    events: any[]
    onEventClick: (event: any) => void
}

export default function EventList({ events, onEventClick }: EventListProps) {
    if (events.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500">
                Nenhum evento futuro encontrado.
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {events.map(event => (
                <div
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className={`
                        w-12 h-12 rounded-lg flex items-center justify-center text-xl shrink-0
                        ${event.tipo === 'assembleia' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                            event.tipo === 'congresso' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                event.tipo === 'limpeza' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                                    event.tipo === 'visita' ? 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400' :
                                        'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                        }
                    `}>
                        {event.tipo === 'assembleia' ? '🏛️' :
                            event.tipo === 'congresso' ? '🏟️' :
                                event.tipo === 'limpeza' ? '🧹' :
                                    event.tipo === 'visita' ? '👔' : '⭐'}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                                {format(new Date(event.data_inicio + 'T12:00:00'), "dd", { locale: ptBR })}
                                {event.data_fim && event.data_fim !== event.data_inicio && (
                                    <> - {format(new Date(event.data_fim + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR })}</>
                                )}
                                {(!event.data_fim || event.data_fim === event.data_inicio) && (
                                    <> de {format(new Date(event.data_inicio + 'T12:00:00'), "MMM", { locale: ptBR })}</>
                                )}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize">
                                {event.tipo}
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                            {event.titulo}
                        </h3>
                    </div>

                    <div className="text-slate-400">
                        ➡️
                    </div>
                </div>
            ))}
        </div>
    )
}
