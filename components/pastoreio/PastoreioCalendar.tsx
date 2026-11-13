'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export type VisitaCalendario = {
    id: string
    nome: string
    data: string
    atrasada: boolean
}

type PastoreioCalendarProps = {
    year: number
    month: number
    hoje: string
    visitas: VisitaCalendario[]
    totalMembros: number
    semData: number
    onPrev: () => void
    onNext: () => void
    onDayClick: (data: string) => void
    onVerGrupo: () => void
}

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function cellKey(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function PastoreioCalendar({
    year,
    month,
    hoje,
    visitas,
    totalMembros,
    semData,
    onPrev,
    onNext,
    onDayClick,
    onVerGrupo,
}: PastoreioCalendarProps) {
    const firstWeekday = new Date(year, month - 1, 1).getDay()
    const daysInMonth = new Date(year, month, 0).getDate()
    const porDia = new Map<string, VisitaCalendario[]>()
    for (const visita of visitas) {
        const lista = porDia.get(visita.data) ?? []
        lista.push(visita)
        porDia.set(visita.data, lista)
    }

    const tituloMes = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR })

    return (
        <div>
            <div className="flex items-center justify-between mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <button
                    type="button"
                    onClick={onPrev}
                    aria-label="Mês anterior"
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                    ⬅️
                </button>
                <h2 className="text-xl font-bold capitalize text-slate-900 dark:text-white">
                    {tituloMes}
                </h2>
                <button
                    type="button"
                    onClick={onNext}
                    aria-label="Mês seguinte"
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                    ➡️
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    {WEEK_DAYS.map(day => (
                        <div key={day} className="min-w-0 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 auto-rows-fr">
                    {Array.from({ length: firstWeekday }, (_, i) => (
                        <div
                            key={`empty-${i}`}
                            className="min-h-[80px] md:min-h-[100px] min-w-0 overflow-hidden border-b border-r border-slate-100 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-900/20"
                        />
                    ))}

                    {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1
                        const chave = cellKey(year, month, day)
                        const doDia = porDia.get(chave) ?? []
                        const temVisita = doDia.length > 0
                        const algumaAtrasada = doDia.some(visita => visita.atrasada)
                        const isToday = chave === hoje
                        const className = [
                            'min-h-[80px] md:min-h-[100px] min-w-0 overflow-hidden p-2 border-b border-r border-slate-100 dark:border-slate-700/50 text-left',
                            temVisita ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10' : '',
                            isToday ? 'bg-blue-50/30 dark:bg-blue-900/5' : '',
                        ].join(' ')

                        const conteudo = (
                            <>
                                <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                                    isToday ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300'
                                }`}>
                                    {day}
                                </span>
                                {temVisita && (
                                    <>
                                        <div className="mt-2 flex items-center justify-center gap-1 md:hidden">
                                            <span className={`w-1.5 h-1.5 rounded-full ${algumaAtrasada ? 'bg-red-500' : 'bg-blue-500'}`} />
                                            <span className="text-[10px] text-slate-500">{doDia.length}</span>
                                        </div>
                                        <div className="hidden md:block mt-1 space-y-0.5">
                                            {doDia.slice(0, 2).map(visita => (
                                                <div key={visita.id} className="flex items-center gap-1 min-w-0">
                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${visita.atrasada ? 'bg-red-500' : 'bg-blue-500'}`} />
                                                    <span className="min-w-0 truncate text-[11px] leading-tight text-slate-700 dark:text-slate-300">
                                                        {visita.nome}
                                                    </span>
                                                </div>
                                            ))}
                                            {doDia.length > 2 && (
                                                <span className="text-[11px] text-slate-500">+{doDia.length - 2}</span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </>
                        )

                        if (!temVisita) {
                            return (
                                <div key={chave} className={className}>
                                    {conteudo}
                                </div>
                            )
                        }

                        return (
                            <button
                                key={chave}
                                type="button"
                                onClick={() => onDayClick(chave)}
                                className={className}
                            >
                                {conteudo}
                            </button>
                        )
                    })}
                </div>
            </div>

            {visitas.length === 0 && (
                <p className="mt-4 text-center text-sm text-slate-500">
                    Nenhuma visita agendada neste mês.
                </p>
            )}

            {totalMembros === 0 ? (
                <p className="mt-4 text-center text-sm text-slate-500">
                    Nenhum membro neste grupo.
                </p>
            ) : semData > 0 ? (
                <p className="mt-4 text-center text-sm text-slate-500">
                    {semData} {semData === 1 ? 'membro' : 'membros'} sem data{' '}
                    <button
                        type="button"
                        onClick={onVerGrupo}
                        className="font-medium text-blue-600 hover:text-blue-800"
                    >
                        Ver grupo
                    </button>
                </p>
            ) : null}
        </div>
    )
}
