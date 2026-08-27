'use client'

import { Database } from '@/types/database.types'
import { calculatePartTimes } from '@/lib/scheduleUtils'

type Membro = Database['public']['Tables']['membros']['Row']

interface Parte {
    tipo: 'TESOUROS' | 'MINISTERIO' | 'VIDA_CRISTA' | 'PRESIDENTE' | 'ORACAO'
    nome: string
    tempo: number
    membro_id?: string
    ajudante_id?: string
}

interface Props {
    config: any
    membros: Membro[]
    colaboradores: any[]
    programacao: any
    updateConfig: (key: string, value: any) => void
    updateNestedObj: (key: string, field: string, value: string) => void
}

export default function TabVidaMinisterio({ config, membros, colaboradores, programacao, updateConfig, updateNestedObj }: Props) {
    const partes: Parte[] = programacao?.partes || []
    const dataReuniao = programacao?.data_reuniao || new Date().toISOString().split('T')[0]

    const calculatedPartes = calculatePartTimes(partes, dataReuniao)

    const getMembroNome = (id: string | undefined | null) => {
        if (!id) return null
        const m = membros.find(m => m.id === id)
        return m?.nome_completo || null
    }

    const tesouros = calculatedPartes.filter(p => p.tipo === 'TESOUROS')
    const ministerio = calculatedPartes.filter(p => p.tipo === 'MINISTERIO')

    // Separar Vida Cristã: partes normais vs Estudo Bíblico
    const allVidaCrista = calculatedPartes.filter(p => p.tipo === 'VIDA_CRISTA')
    const vidaCristaPartes = allVidaCrista.filter(p => !p.nome.toLowerCase().includes('estudo bíblico'))
    const estudoBiblico = allVidaCrista.filter(p => p.nome.toLowerCase().includes('estudo bíblico'))

    // Calcular horário do discurso do Spte: após as partes normais da Vida Cristã
    const getDiscursoStartTime = () => {
        if (vidaCristaPartes.length === 0) return ''
        const lastPart = vidaCristaPartes[vidaCristaPartes.length - 1]
        // O horário de início da última parte + seu tempo = início do discurso
        const [h, m] = lastPart.startTime.split(':').map(Number)
        const totalMin = h * 60 + m + (lastPart.tempo || 0)
        const newH = Math.floor(totalMin / 60)
        const newM = totalMin % 60
        return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
    }

    const renderBoldTime = (text: string) => {
        if (!text) return text
        const regex = /(\(\d+\s*min\.?\))/gi
        const parts = text.split(regex)
        return (
            <>
                {parts.map((part, i) => {
                    if (part.match(regex)) {
                        return <span key={i} className="font-bold">{part}</span>
                    }
                    return part
                })}
            </>
        )
    }

    const renderReadOnlyPart = (parte: Parte & { startTime: string }) => {
        const designado = getMembroNome(parte.membro_id)
        const ajudante = getMembroNome(parte.ajudante_id)
        const isEstudo = parte.tipo === 'VIDA_CRISTA' && parte.nome.toLowerCase().includes('estudo bíblico')

        return (
            <div key={parte.nome + parte.startTime} className="flex items-start gap-3 py-2.5 px-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5 min-w-[40px]">{parte.startTime}</span>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{renderBoldTime(parte.nome)}</p>
                    {designado ? (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                            👤 {designado}
                            {ajudante && (
                                <span className="text-slate-400 dark:text-slate-500">
                                    {' · '}{isEstudo ? 'Leitor' : 'Ajudante'}: {ajudante}
                                </span>
                            )}
                        </p>
                    ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">Sem designação</p>
                    )}
                </div>
            </div>
        )
    }

    const SectionHeader = ({ title, color }: { title: string; color: string }) => (
        <div className={`py-2 px-3 rounded-lg font-bold text-sm uppercase tracking-wide ${color}`}>
            {title}
        </div>
    )

    const hasPartes = partes.length > 0

    return (
        <div className="space-y-6">
            {/* 1. Card Data / Hora / Local */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="text-lg">📍</span> Data, Hora e Local
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Data</label>
                        <input type="date" value={config.reuniao_terca.data} onChange={e => updateNestedObj('reuniao_terca', 'data', e.target.value)} className="w-full p-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-600" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Hora</label>
                        <input type="time" value={config.reuniao_terca.hora} onChange={e => updateNestedObj('reuniao_terca', 'hora', e.target.value)} className="w-full p-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-600" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Local</label>
                        <input type="text" placeholder="Local" value={config.reuniao_terca.local} onChange={e => updateNestedObj('reuniao_terca', 'local', e.target.value)} className="w-full p-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-600" />
                    </div>
                </div>
            </div>

            {/* 2. Card Reunião Vida e Ministério */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="text-lg">📖</span> Reunião Vida e Ministério
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    As partes e designados vêm da programação semanal. Cânticos e oração são editáveis aqui.
                </p>

                {!hasPartes ? (
                    <div className="text-center py-8">
                        <p className="text-slate-500 italic">Nenhuma parte encontrada para esta semana.</p>
                        <p className="text-sm text-slate-400 mt-1">As partes são importadas da programação semanal (PDF ou manual).</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Cântico Inicial */}
                        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/10 dark:to-amber-900/5 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
                            <span className="text-lg">🎵</span>
                            <label className="text-sm font-medium text-amber-800 dark:text-amber-400 min-w-[100px]">Cântico Inicial</label>
                            <input
                                type="text"
                                placeholder="Nº"
                                value={config.cantico_inicial_meio_semana}
                                onChange={e => updateConfig('cantico_inicial_meio_semana', e.target.value)}
                                className="w-24 p-1.5 text-sm text-center border rounded-lg dark:bg-slate-800 dark:border-slate-600 font-bold"
                            />
                        </div>

                        {/* Presidente e Oração Inicial */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex items-center gap-3 py-2.5 px-3 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-200/50 dark:border-purple-800/30">
                                <span className="text-sm">🎩</span>
                                <div>
                                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Presidente</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{getMembroNome(programacao?.presidente_id) || '—'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 py-2.5 px-3 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg border border-purple-200/50 dark:border-purple-800/30">
                                <span className="text-sm">🙏</span>
                                <div>
                                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Oração Inicial</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{getMembroNome(programacao?.oracao_inicial_id) || '—'}</p>
                                </div>
                            </div>
                        </div>

                        {/* TESOUROS DA PALAVRA DE DEUS */}
                        {tesouros.length > 0 && (
                            <div className="space-y-2">
                                <SectionHeader title="Tesouros da Palavra de Deus" color="bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300" />
                                {tesouros.map(p => renderReadOnlyPart(p))}
                            </div>
                        )}

                        {/* FAÇA SEU MELHOR NO MINISTÉRIO */}
                        {ministerio.length > 0 && (
                            <div className="space-y-2">
                                <SectionHeader title="Faça Seu Melhor no Ministério" color="bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-400" />
                                {ministerio.map(p => renderReadOnlyPart(p))}
                            </div>
                        )}

                        {/* Cântico do Meio */}
                        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/10 dark:to-amber-900/5 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
                            <span className="text-lg">🎵</span>
                            <label className="text-sm font-medium text-amber-800 dark:text-amber-400 min-w-[100px]">Cântico do Meio</label>
                            <input
                                type="text"
                                placeholder="Nº"
                                value={config.cantico_meio_meio_semana}
                                onChange={e => updateConfig('cantico_meio_meio_semana', e.target.value)}
                                className="w-24 p-1.5 text-sm text-center border rounded-lg dark:bg-slate-800 dark:border-slate-600 font-bold"
                            />
                        </div>

                        {/* NOSSA VIDA CRISTÃ — Partes normais */}
                        {vidaCristaPartes.length > 0 && (
                            <div className="space-y-2">
                                <SectionHeader title="Nossa Vida Cristã" color="bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400" />
                                {vidaCristaPartes.map(p => renderReadOnlyPart(p))}
                            </div>
                        )}

                        {/* DISCURSO DO SUPERINTENDENTE (após os 15 min da Vida Cristã) */}
                        <div className="p-4 bg-teal-50/50 dark:bg-teal-900/10 rounded-lg border-l-4 border-teal-500">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-xs font-bold text-slate-400 min-w-[40px]">{getDiscursoStartTime()}</span>
                                <span className="text-sm font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wide">
                                    Discurso {colaboradores?.[0]?.nome ? `(${colaboradores[0].nome.split(' ')[0]})` : 'do Spte.'}
                                </span>
                            </div>
                            <input
                                type="text"
                                placeholder="Tema do discurso do Superintendente"
                                value={config.midweek_discurso_tema}
                                onChange={e => updateConfig('midweek_discurso_tema', e.target.value)}
                                className="w-full p-2.5 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-600 font-medium"
                            />
                        </div>

                        {/* Estudo Bíblico (se existir) */}
                        {estudoBiblico.length > 0 && (
                            <div className="space-y-2">
                                {estudoBiblico.map(p => renderReadOnlyPart(p))}
                            </div>
                        )}

                        {/* Oração Final */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Oração Final</label>
                            <select
                                value={config.oracao_final_meio_semana_id}
                                onChange={e => updateConfig('oracao_final_meio_semana_id', e.target.value)}
                                className="w-full p-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-600"
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
                                    {membros.filter(m => m.is_anciao || m.is_servo_ministerial).map(m => (
                                        <option key={m.id} value={m.id}>{m.nome_completo}</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>

                        {/* Cântico Final */}
                        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/10 dark:to-amber-900/5 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
                            <span className="text-lg">🎵</span>
                            <label className="text-sm font-medium text-amber-800 dark:text-amber-400 min-w-[100px]">Cântico Final</label>
                            <input
                                type="text"
                                placeholder="Nº"
                                value={config.cantico_final_meio_semana}
                                onChange={e => updateConfig('cantico_final_meio_semana', e.target.value)}
                                className="w-24 p-1.5 text-sm text-center border rounded-lg dark:bg-slate-800 dark:border-slate-600 font-bold"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
