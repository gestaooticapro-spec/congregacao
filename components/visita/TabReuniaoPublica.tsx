'use client'

import { Database } from '@/types/database.types'
type Membro = Database['public']['Tables']['membros']['Row']

interface Props {
    config: any
    membros: Membro[]
    colaboradores: any[]
    weekendPresidente?: string | null
    updateConfig: (key: string, value: any) => void
}

export default function TabReuniaoPublica({ config, membros, colaboradores, weekendPresidente, updateConfig }: Props) {
    const eldersAndServants = membros.filter(m => m.is_anciao || m.is_servo_ministerial)
    const elders = membros.filter(m => m.is_anciao)
    const coFirstName = colaboradores?.[0]?.nome?.split(' ')[0] || ''
    const coLabel = coFirstName ? ` (${coFirstName})` : ''

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <span className="text-lg">🎤</span> Reunião Pública (Fim de Semana)
            </h2>

            <div className="space-y-4">
                {/* 1 - Cântico Inicial */}
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/10 dark:to-amber-900/5 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
                    <span className="text-lg">🎵</span>
                    <label className="text-sm font-medium text-amber-800 dark:text-amber-400 min-w-[120px]">Cântico Inicial</label>
                    <input
                        type="text"
                        placeholder="Nº"
                        value={config.cantico_inicial_fim_semana}
                        onChange={e => updateConfig('cantico_inicial_fim_semana', e.target.value)}
                        className="w-24 p-1.5 text-sm text-center border rounded-lg dark:bg-slate-800 dark:border-slate-600 font-bold"
                    />
                </div>

                {/* 2 - Presidente */}
                <div className="flex items-center gap-3 py-3 px-4 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-200/50 dark:border-purple-800/30">
                    <span className="text-lg">🎩</span>
                    <div>
                        <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Presidente</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {weekendPresidente ? `👤 ${weekendPresidente}` : <span className="text-slate-400 italic">Sem designação nas escalas</span>}
                        </p>
                    </div>
                </div>

                {/* 3 - Oração Inicial */}
                <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg flex items-center gap-3">
                    <span className="text-lg">🙏</span>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[120px]">Oração Inicial</label>
                    <select
                        value={config.oracao_inicial_fim_semana_id}
                        onChange={e => updateConfig('oracao_inicial_fim_semana_id', e.target.value)}
                        className="flex-1 p-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-600"
                    >
                        <option value="">Irmão...</option>
                        {colaboradores.length > 0 && (
                            <optgroup label="Superintendente">
                                {colaboradores.map(c => (
                                    <option key={c.id} value={c.id}>{c.nome}</option>
                                ))}
                            </optgroup>
                        )}
                        <optgroup label="Anciãos e Servos">
                            {eldersAndServants.map(m => <option key={m.id} value={m.id}>{m.nome_completo}</option>)}
                        </optgroup>
                    </select>
                </div>

                {/* 4 - Discurso Público */}
                <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border-l-4 border-blue-500 mt-6">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Discurso Público{coLabel}</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Tema do discurso público"
                        value={config.weekend_discurso_tema}
                        onChange={e => updateConfig('weekend_discurso_tema', e.target.value)}
                        className="w-full p-2.5 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-600 font-medium"
                    />
                </div>

                {/* 5 - Cântico do Meio */}
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/10 dark:to-amber-900/5 rounded-lg border border-amber-200/50 dark:border-amber-800/30 mt-6">
                    <span className="text-lg">🎵</span>
                    <label className="text-sm font-medium text-amber-800 dark:text-amber-400 min-w-[120px]">Cântico do Meio</label>
                    <input
                        type="text"
                        placeholder="Nº"
                        value={config.cantico_meio_fim_semana}
                        onChange={e => updateConfig('cantico_meio_fim_semana', e.target.value)}
                        className="w-24 p-1.5 text-sm text-center border rounded-lg dark:bg-slate-800 dark:border-slate-600 font-bold"
                    />
                </div>

                {/* 6 - Estudo de A Sentinela */}
                <div className="p-4 bg-red-50/50 dark:bg-red-900/10 rounded-lg border-l-4 border-red-500 mt-6">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-wide">Estudo de A Sentinela</span>
                    </div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Dirigente</label>
                    <select
                        value={config.dirigente_sentinela_fim_semana_id}
                        onChange={e => updateConfig('dirigente_sentinela_fim_semana_id', e.target.value)}
                        className="w-full p-2.5 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-600 font-medium"
                    >
                        <option value="">Ancião dirigente...</option>
                        {elders.map(m => <option key={m.id} value={m.id}>{m.nome_completo}</option>)}
                    </select>
                </div>

                {/* 7 - Discurso Final do Supte */}
                <div className="p-4 bg-teal-50/50 dark:bg-teal-900/10 rounded-lg border-l-4 border-teal-500 mt-6">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wide">Discurso Final{coLabel}</span>
                    </div>
                    <input
                        type="text"
                        placeholder="Tema do discurso final do Superintendente"
                        value={config.weekend_discurso_final_tema}
                        onChange={e => updateConfig('weekend_discurso_final_tema', e.target.value)}
                        className="w-full p-2.5 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-600 font-medium"
                    />
                </div>

                {/* 8 - Cântico Final */}
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/10 dark:to-amber-900/5 rounded-lg border border-amber-200/50 dark:border-amber-800/30 mt-6">
                    <span className="text-lg">🎵</span>
                    <label className="text-sm font-medium text-amber-800 dark:text-amber-400 min-w-[120px]">Cântico Final</label>
                    <input
                        type="text"
                        placeholder="Nº"
                        value={config.cantico_final_fim_semana}
                        onChange={e => updateConfig('cantico_final_fim_semana', e.target.value)}
                        className="w-24 p-1.5 text-sm text-center border rounded-lg dark:bg-slate-800 dark:border-slate-600 font-bold"
                    />
                </div>

                {/* 9 - Oração Final */}
                <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg flex items-center gap-3">
                    <span className="text-lg">🙏</span>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[120px]">Oração Final</label>
                    <select
                        value={config.oracao_final_fim_semana_id}
                        onChange={e => updateConfig('oracao_final_fim_semana_id', e.target.value)}
                        className="flex-1 p-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-600"
                    >
                        <option value="">Irmão...</option>
                        {colaboradores.length > 0 && (
                            <optgroup label="Superintendente">
                                {colaboradores.map(c => (
                                    <option key={c.id} value={c.id}>{c.nome}</option>
                                ))}
                            </optgroup>
                        )}
                        <optgroup label="Anciãos e Servos">
                            {eldersAndServants.map(m => <option key={m.id} value={m.id}>{m.nome_completo}</option>)}
                        </optgroup>
                    </select>
                </div>
            </div>
        </div>
    )
}
