'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import CalendarGrid from '@/components/events/CalendarGrid'
import EventList from '@/components/events/EventList'
import EventModal from '@/components/events/EventModal'

export default function AgendaAnciaosPage() {
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
    const [currentDate, setCurrentDate] = useState(new Date())
    const [events, setEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedEvent, setSelectedEvent] = useState<any>(null)

    useEffect(() => {
        fetchEvents()
    }, [currentDate, viewMode])

    const fetchEvents = async () => {
        setLoading(true)
        try {
            let query = supabase
                .from('agenda_anciaos')
                .select('*')
                .order('data_inicio', { ascending: true })

            if (viewMode === 'list') {
                // List View: Fetch all future events (data_fim >= today)
                const today = format(new Date(), 'yyyy-MM-dd')
                query = query.gte('data_fim', today)
            } else {
                // Calendar View: Fetch events for the selected month
                const start = format(startOfMonth(currentDate), 'yyyy-MM-dd')
                const end = format(endOfMonth(currentDate), 'yyyy-MM-dd')

                // (data_inicio <= endOfMonth) AND (data_fim >= startOfMonth)
                query = query.lte('data_inicio', end).gte('data_fim', start)
            }

            const { data, error } = await query

            if (error) throw error
            setEvents(data || [])
        } catch (error) {
            console.error('Error fetching events:', error)
        } finally {
            setLoading(false)
        }
    }

    const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1))
    const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1))

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white text-center md:text-left">
                        Agenda de Anciãos
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-center md:text-left mt-1">
                        Compromissos e lembretes do corpo de anciãos.
                    </p>
                </div>

                {/* View Toggle */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('calendar')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'calendar'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        📅 Calendário
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'list'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        📜 Lista
                    </button>
                </div>
            </div>

            {/* Navigation (Only for Calendar View) */}
            {viewMode === 'calendar' && (
                <div className="flex items-center justify-between mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <button
                        onClick={handlePrevMonth}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                    >
                        ⬅️
                    </button>
                    <h2 className="text-xl font-bold capitalize text-slate-900 dark:text-white">
                        {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </h2>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                    >
                        ➡️
                    </button>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="text-center py-12 text-slate-500 animate-pulse">
                    Carregando agenda...
                </div>
            ) : (
                <div className="animate-in fade-in duration-300">
                    {viewMode === 'calendar' ? (
                        <CalendarGrid
                            currentDate={currentDate}
                            events={events}
                            onEventClick={setSelectedEvent}
                        />
                    ) : (
                        <EventList
                            events={events}
                            onEventClick={setSelectedEvent}
                        />
                    )}
                </div>
            )}

            {/* Modal */}
            {selectedEvent && (
                <EventModal
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                />
            )}
        </div>
    )
}
