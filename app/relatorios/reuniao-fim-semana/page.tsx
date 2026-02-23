'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { format, addDays, startOfWeek, endOfWeek, nextDay, Day } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Helper to get the next meeting date (Saturday or Sunday)
const getNextWeekendMeetingDate = (baseDate: Date) => {
    const day = baseDate.getDay()
    // If today is Saturday (6) or Sunday (0), return today
    if (day === 6 || day === 0) return baseDate

    // Otherwise, find next Saturday
    return nextDay(baseDate, 6 as Day)
}

export default function ReuniaoFimSemanaPage() {
    const [currentDate, setCurrentDate] = useState(getNextWeekendMeetingDate(new Date()))
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)

    useEffect(() => {
        loadData()
    }, [currentDate])

    const loadData = async () => {
        setLoading(true)
        try {
            let saturdayDate: Date
            let sundayDate: Date

            if (currentDate.getDay() === 6) {
                saturdayDate = currentDate
                sundayDate = addDays(currentDate, 1)
            } else {
                saturdayDate = addDays(currentDate, -1)
                sundayDate = currentDate
            }

            const saturdayStr = format(saturdayDate, 'yyyy-MM-dd')
            const sundayStr = format(sundayDate, 'yyyy-MM-dd')
            const dates = [saturdayStr, sundayStr]

            // Fetch everything for both days in parallel
            const [schedulesRes, talksRes, assignmentsRes] = await Promise.all([
                supabase.from('programacao_semanal').select('data_reuniao').in('data_reuniao', dates),
                supabase.from('agenda_discursos_locais').select('data').in('data', dates),
                supabase.from('designacoes_suporte').select('data').in('data', dates)
            ])

            // Determine which date has data
            const hasDataOnSaturday =
                schedulesRes.data?.some(s => s.data_reuniao === saturdayStr) ||
                talksRes.data?.some(t => t.data === saturdayStr) ||
                assignmentsRes.data?.some(a => a.data === saturdayStr)

            const hasDataOnSunday =
                schedulesRes.data?.some(s => s.data_reuniao === sundayStr) ||
                talksRes.data?.some(t => t.data === sundayStr) ||
                assignmentsRes.data?.some(a => a.data === sundayStr)

            // Decide active date
            // Priority: 
            // 1. If currentDate matches a day with data, use it.
            // 2. If only one day has data, use it.
            // 3. Default to currentDate (or Saturday if preferred)

            let activeDateStr = format(currentDate, 'yyyy-MM-dd')

            if (format(currentDate, 'yyyy-MM-dd') === saturdayStr && hasDataOnSaturday) {
                activeDateStr = saturdayStr
            } else if (format(currentDate, 'yyyy-MM-dd') === sundayStr && hasDataOnSunday) {
                activeDateStr = sundayStr
            } else if (hasDataOnSunday && !hasDataOnSaturday) {
                activeDateStr = sundayStr
            } else if (hasDataOnSaturday && !hasDataOnSunday) {
                activeDateStr = saturdayStr
            }

            // Now fetch full data for the determined active date
            const { data: talkData } = await supabase
                .from('agenda_discursos_locais')
                .select(`
                    *,
                    tema:temas(*),
                    orador_local:orador_local_id(nome_completo),
                    orador_visitante:orador_visitante_id(nome, congregacao)
                `)
                .eq('data', activeDateStr)
                .single()

            const { data: assignmentsData } = await supabase
                .from('designacoes_suporte')
                .select(`
                    funcao,
                    membro:membro_id(nome_completo)
                `)
                .eq('data', activeDateStr)

            // Fetch Mid-week Meeting to check for special event types
            const weekStartStr = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
            const weekEndStr = format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')

            const { data: specialEventData } = await supabase
                .from('programacao_semanal')
                .select('evento_tipo')
                .gte('data_reuniao', weekStartStr)
                .lte('data_reuniao', weekEndStr)
                .in('evento_tipo', ['assembleia', 'congresso'])
                .limit(1)

            const isSpecialEvent = specialEventData && specialEventData.length > 0;

            setData({
                talk: talkData,
                assignments: assignmentsData || [],
                displayDate: activeDateStr,
                specialEventType: isSpecialEvent ? specialEventData[0].evento_tipo : null
            })

        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handlePrevious = () => setCurrentDate(d => addDays(d, -7))
    const handleNext = () => setCurrentDate(d => addDays(d, 7))

    const getAssignment = (role: string) => {
        return data?.assignments?.find((a: any) => a.funcao === role)?.membro?.nome_completo || 'Não designado'
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <button
                    onClick={handlePrevious}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                    ⬅️ Anterior
                </button>

                <h1 className="text-2xl font-bold text-center">
                    Reunião de Fim de Semana
                    <div className="text-base font-normal text-slate-500 mt-1">
                        {format(data?.displayDate ? new Date(data.displayDate + 'T12:00:00') : currentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </div>
                </h1>

                <button
                    onClick={handleNext}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                    Próximo ➡️
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-500">Carregando...</div>
            ) : data?.specialEventType ? (
                <div className="bg-white dark:bg-slate-800 p-12 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center">
                    <h2 className="text-3xl uppercase tracking-wider text-slate-800 dark:text-white font-bold text-center">
                        {data.specialEventType}
                    </h2>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* President Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h2 className="text-sm uppercase tracking-wide text-slate-500 font-semibold mb-4">Presidência</h2>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xl">
                                👔
                            </div>
                            <div>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">
                                    {getAssignment('PRESIDENTE')}
                                </p>
                                <p className="text-sm text-slate-500">Presidente da Reunião</p>
                            </div>
                        </div>
                    </div>

                    {/* Public Talk Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h2 className="text-sm uppercase tracking-wide text-slate-500 font-semibold mb-4">Discurso Público</h2>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 text-xl shrink-0">
                                    🎤
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                                        {data?.talk?.tema?.numero ? `#${data.talk.tema.numero} - ` : ''}
                                        {data?.talk?.tema?.titulo || 'Tema não definido'}
                                    </h3>
                                    <div className="flex flex-col gap-1 mt-2">
                                        <p className="font-medium text-slate-700 dark:text-slate-300">
                                            {data?.talk?.orador_local?.nome_completo || data?.talk?.orador_visitante?.nome || 'Orador não definido'}
                                        </p>
                                        {data?.talk?.orador_visitante && (
                                            <p className="text-sm text-slate-500">
                                                {data.talk.orador_visitante.congregacao}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Watchtower Reader Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h2 className="text-sm uppercase tracking-wide text-slate-500 font-semibold mb-4">Estudo de A Sentinela</h2>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 text-xl">
                                📖
                            </div>
                            <div>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">
                                    {getAssignment('LEITOR_SENTINELA')}
                                </p>
                                <p className="text-sm text-slate-500">Leitor de A Sentinela</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
