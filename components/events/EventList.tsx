'use client'

import { format, differenceInDays, differenceInWeeks, differenceInMonths, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Database } from '@/types/database.types'

type Evento = Database['public']['Tables']['eventos']['Row']

interface EventListProps {
    events: Evento[]
    onEventClick: (event: Evento) => void
}

export default function EventList({ events, onEventClick }: EventListProps) {
    if (events.length === 0) {
        return (
            <div className="text-center py-12 text-slate-500">
                Nenhum evento futuro encontrado.
            </div>
        )
    }

    const colors = [
        {
            base: 'text-purple-600 dark:text-purple-400',
            bg: 'bg-purple-100 dark:bg-purple-900/30',
            bar: 'bg-purple-500 dark:bg-purple-400',
        },
        {
            base: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-100 dark:bg-blue-900/30',
            bar: 'bg-blue-500 dark:bg-blue-400',
        },
        {
            base: 'text-green-600 dark:text-green-400',
            bg: 'bg-green-100 dark:bg-green-900/30',
            bar: 'bg-green-500 dark:bg-green-400',
        },
        {
            base: 'text-teal-600 dark:text-teal-400',
            bg: 'bg-teal-100 dark:bg-teal-900/30',
            bar: 'bg-teal-500 dark:bg-teal-400',
        },
        {
            base: 'text-orange-600 dark:text-orange-400',
            bg: 'bg-orange-100 dark:bg-orange-900/30',
            bar: 'bg-orange-500 dark:bg-orange-400',
        },
        {
            base: 'text-pink-600 dark:text-pink-400',
            bg: 'bg-pink-100 dark:bg-pink-900/30',
            bar: 'bg-pink-500 dark:bg-pink-400',
        },
    ]

    const getMonthColors = (dateString: string) => {
        const date = new Date(dateString)
        const monthIndex = date.getMonth()
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

    const formatarPeriodo = (evento: Evento) => {
        if (evento.data_fim && evento.data_fim !== evento.data_inicio) {
            return `${format(new Date(evento.data_inicio + 'T12:00:00'), 'dd', { locale: ptBR })} - ${format(new Date(evento.data_fim + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR })}`
        }

        return format(new Date(evento.data_inicio + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR })
    }

    return (
        <div className="space-y-3">
            {events.map((event) => {
                const color = getMonthColors(event.data_inicio)

                return (
                    <div
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className="px-4 py-3 flex gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                        <div className={`w-1 rounded-full self-stretch ${color.bar}`} />

                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-bold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                            {event.titulo}
                                        </h3>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                                            {event.tipo}
                                        </span>
                                    </div>

                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        {formatarPeriodo(event)}
                                        {getTimeRemaining(event.data_inicio) && (
                                            <>
                                                {' · '}
                                                <span className={color.base}>{getTimeRemaining(event.data_inicio)}</span>
                                            </>
                                        )}
                                    </p>
                                </div>

                                <div className="flex items-center text-slate-300 dark:text-slate-600 shrink-0">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
