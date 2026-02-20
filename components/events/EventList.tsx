'use client'

import { format, differenceInDays, differenceInWeeks, differenceInMonths, startOfDay } from 'date-fns'
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

    // Define a loop of colors
    // Structure: [Icon/Text Color, Border Color]
    const colors = [
        {
            base: 'text-purple-600 dark:text-purple-400',
            bg: 'bg-purple-100 dark:bg-purple-900/30',
            border: 'border-purple-200 dark:border-purple-800'
        },
        {
            base: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-100 dark:bg-blue-900/30',
            border: 'border-blue-200 dark:border-blue-800'
        },
        {
            base: 'text-green-600 dark:text-green-400',
            bg: 'bg-green-100 dark:bg-green-900/30',
            border: 'border-green-200 dark:border-green-800'
        },
        {
            base: 'text-teal-600 dark:text-teal-400',
            bg: 'bg-teal-100 dark:bg-teal-900/30',
            border: 'border-teal-200 dark:border-teal-800'
        },
        {
            base: 'text-orange-600 dark:text-orange-400',
            bg: 'bg-orange-100 dark:bg-orange-900/30',
            border: 'border-orange-200 dark:border-orange-800'
        },
        {
            base: 'text-pink-600 dark:text-pink-400',
            bg: 'bg-pink-100 dark:bg-pink-900/30',
            border: 'border-pink-200 dark:border-pink-800'
        },
    ]

    const getMonthColors = (dateString: string) => {
        const date = new Date(dateString)
        const monthIndex = date.getMonth() // 0-11
        return colors[monthIndex % colors.length]
    }

    const getTimeRemaining = (dateString: string) => {
        const today = startOfDay(new Date())
        const eventDate = startOfDay(new Date(dateString + 'T12:00:00'))

        const diffMonths = differenceInMonths(eventDate, today)
        if (diffMonths > 0) {
            return diffMonths === 1 ? 'Falta 1 mês' : `Faltam ${diffMonths} meses`
        }

        const diffWeeks = differenceInWeeks(eventDate, today)
        if (diffWeeks > 0) {
            return diffWeeks === 1 ? 'Falta 1 semana' : `Faltam ${diffWeeks} semanas`
        }

        const diffDays = differenceInDays(eventDate, today)
        if (diffDays === 0) return 'Hoje'
        if (diffDays === 1) return 'Amanhã'
        if (diffDays > 0) return `Faltam ${diffDays} dias`

        return ''
    }

    return (
        <div className="space-y-3">
            {events.map(event => {
                const color = getMonthColors(event.data_inicio)

                return (
                    <div
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className={`flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer group ${color.border} border-y border-r border-slate-200 dark:border-r-slate-700 dark:border-y-slate-700`}
                    >
                        <div className={`
                            w-12 h-12 rounded-lg flex items-center justify-center text-xl shrink-0
                            ${color.bg} ${color.base}
                        `}>
                            {event.tipo === 'assembleia' ? '🏛️' :
                                event.tipo === 'congresso' ? '🏟️' :
                                    event.tipo === 'limpeza' ? '🧹' :
                                        event.tipo === 'visita' ? '👔' : '⭐'}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-sm font-bold uppercase tracking-wide ${color.base}`}>
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

                        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${color.bg} ${color.base}`}>
                                {getTimeRemaining(event.data_inicio)}
                            </span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
