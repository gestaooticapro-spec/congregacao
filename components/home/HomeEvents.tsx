'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { format } from 'date-fns'
import Link from 'next/link'
import EventList from '@/components/events/EventList'
import EventModal from '@/components/events/EventModal'

export default function HomeEvents() {
    const [events, setEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedEvent, setSelectedEvent] = useState<any>(null)

    useEffect(() => {
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        setLoading(true)
        setError(null)
        try {
            const today = format(new Date(), 'yyyy-MM-dd')

            // The actual data fetch
            const { data, error } = await supabase
                .from('eventos')
                .select('*')
                .gte('data_fim', today)
                .order('data_inicio', { ascending: true })
                .limit(6)

            if (error) throw error
            setEvents(data || [])
        } catch (error: any) {
            console.error('Error fetching events:', error)
            setError('Não foi possível carregar os eventos. Verifique sua conexão.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full mt-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                    Próximos Eventos
                </h2>
                <Link
                    href="/calendario"
                    className="text-sm font-medium text-primary hover:text-blue-700 hover:underline transition-colors"
                >
                    Ver eventos no calendário →
                </Link>
            </div>

            {loading ? (
                <div className="text-center py-8 text-slate-500 animate-pulse" suppressHydrationWarning>
                    Carregando eventos...
                </div>
            ) : error ? (
                <div className="text-center py-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800/30">
                    <p className="text-red-600 dark:text-red-400 mb-3">{error}</p>
                    <button
                        onClick={fetchEvents}
                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    >
                        Tentar novamente
                    </button>
                </div>
            ) : (
                <EventList
                    events={events}
                    onEventClick={setSelectedEvent}
                />
            )}

            {selectedEvent && (
                <EventModal
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                />
            )}
        </div>
    )
}
