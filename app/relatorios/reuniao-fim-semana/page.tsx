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
            // We need to check both Saturday and Sunday of the current weekend
            // If currentDate is Saturday, check Saturday and Sunday
            // If currentDate is Sunday, check Saturday (prev) and Sunday

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

            // 1. Fetch Schedule (Programacao Semanal) for both days to see which one exists
            const { data: schedules, error: scheduleError } = await supabase
                .from('programacao_semanal')
                .select(`
                    id,
                    data_reuniao,
                    designacoes_suporte(
                        funcao,
                        membro:membro_id(nome_completo)
                    )
                `)
                .in('data_reuniao', [saturdayStr, sundayStr])

            // Find the active schedule (prefer the one that matches currentDate, or the first one found)
            let activeSchedule = schedules?.find(s => s.data_reuniao === format(currentDate, 'yyyy-MM-dd'))

            // If no schedule for current date, try the other day of the weekend
            if (!activeSchedule && schedules && schedules.length > 0) {
                activeSchedule = schedules[0]
                // Update current date to match the found schedule so the UI shows the correct date
                if (activeSchedule.data_reuniao !== format(currentDate, 'yyyy-MM-dd')) {
                    // We don't update state here to avoid infinite loop, but we use this date for fetching talk
                }
            }

            const activeDateStr = activeSchedule ? activeSchedule.data_reuniao : format(currentDate, 'yyyy-MM-dd')

            // 2. Fetch Public Talk for the active date
            const { data: talkData, error: talkError } = await supabase
                .from('agenda_discursos_locais')
                .select(`
                    *,
                    tema:temas(*),
                    orador_local:orador_local_id(nome_completo),
                    orador_visitante:orador_visitante_id(nome, congregacao)
                `)
                .eq('data', activeDateStr)
                .single()

            // 3. Fetch Assignments directly by date (since programacao_id might be null)
            const { data: assignmentsData, error: assignmentsError } = await supabase
                .from('designacoes_suporte')
                .select(`
                    funcao,
                    membro:membro_id(nome_completo)
                `)
                .eq('data', activeDateStr)

            setData({
                talk: talkData,
                assignments: assignmentsData || [],
                displayDate: activeDateStr // Store the actual date of the meeting
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
