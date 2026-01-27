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
    const [selectedEvent, setSelectedEvent] = useState<any>(null)

    useEffect(() => {
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        try {
            const today = format(new Date(), 'yyyy-MM-dd')
            const { data, error } = await supabase
                .from('eventos')
                .select('*')
                .gte('data_fim', today)
                .order('data_inicio', { ascending: true })
                .limit(6) // Show next 6 events

            if (error) throw error
            setEvents(data || [])
        } catch (error) {
            console.error('Error fetching events:', error)
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
                <div className="text-center py-8 text-slate-500 animate-pulse">
                    Carregando eventos...
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
