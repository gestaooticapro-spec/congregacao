'use client'

import { format, getDaysInMonth, startOfMonth, getDay, isSameDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CalendarGridProps {
    currentDate: Date
    events: any[]
    onEventClick: (event: any) => void
}

export default function CalendarGrid({ currentDate, events, onEventClick }: CalendarGridProps) {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDayOfMonth = startOfMonth(currentDate)
    const startDayIndex = getDay(firstDayOfMonth) // 0 = Sunday, 1 = Monday, etc.

    // Generate array of days
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

    // Generate empty slots for days before the 1st
    const emptySlots = Array.from({ length: startDayIndex }, (_, i) => i)

    const getEventsForDay = (day: number) => {
        const dateStr = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), day), 'yyyy-MM-dd')
        return events.filter(e => {
            const start = e.data_inicio
            const end = e.data_fim || e.data_inicio
            return dateStr >= start && dateStr <= end
        })
    }

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {/* Week Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                {weekDays.map(day => (
                    <div key={day} className="py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 auto-rows-fr">
                {/* Empty Slots */}
                {emptySlots.map(i => (
                    <div key={`empty-${i}`} className="min-h-[80px] md:min-h-[100px] border-b border-r border-slate-100 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-900/20" />
                ))}

                {/* Days */}
                {days.map(day => {
                    const dayEvents = getEventsForDay(day)
                    const hasEvent = dayEvents.length > 0
                    const isToday = isSameDay(new Date(currentDate.getFullYear(), currentDate.getMonth(), day), new Date())

                    return (
                        <div
                            key={day}
                            onClick={() => hasEvent ? onEventClick(dayEvents[0]) : null}
                            className={`
                                min-h-[80px] md:min-h-[100px] p-2 border-b border-r border-slate-100 dark:border-slate-700/50 relative transition-colors
                                ${hasEvent ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10' : ''}
                                ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}
                            `}
                        >
                            <span className={`
                                text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                                ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300'}
                            `}>
                                {day}
                            </span>

                            {hasEvent && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl filter drop-shadow-sm animate-bounce-short">📌</span>
                                </div>
                            )}

                            {/* Mobile Indicator (dots) */}
                            {hasEvent && (
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
                                    {dayEvents.map((event, i) => (
                                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${event.tipo === 'assembleia' ? 'bg-purple-500' :
                                                event.tipo === 'congresso' ? 'bg-blue-500' :
                                                    event.tipo === 'limpeza' ? 'bg-green-500' :
                                                        event.tipo === 'visita' ? 'bg-teal-500' :
                                                            'bg-orange-500'
                                            }`} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
