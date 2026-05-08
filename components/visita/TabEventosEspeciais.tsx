'use client'

import { Database } from '@/types/database.types'
type Membro = Database['public']['Tables']['membros']['Row']

interface Props {
    config: any
    membros: Membro[]
    updateConfig: (key: string, value: any) => void
    updateNestedObj: (key: string, field: string, value: string) => void
}

export default function TabEventosEspeciais({ config, membros, updateConfig, updateNestedObj }: Props) {
    return (
        <div className="space-y-8">
            {/* Análise dos Cartões e Arquivos */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="text-lg">📂</span> Análise dos Cartões e Arquivos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Data</label>
                        <input type="date" value={config.analise_arquivos.data} onChange={e => updateNestedObj('analise_arquivos', 'data', e.target.value)} className="w-full p-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-600" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Hora</label>
                        <input type="time" value={config.analise_arquivos.hora} onChange={e => updateNestedObj('analise_arquivos', 'hora', e.target.value)} className="w-full p-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-600" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Local</label>
                        <input type="text" placeholder="Local" value={config.analise_arquivos.local} onChange={e => updateNestedObj('analise_arquivos', 'local', e.target.value)} className="w-full p-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-600" />
                    </div>
                </div>
            </div>

            {/* Reuniões Especiais */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="text-lg">🤝</span> Reuniões Especiais
                </h2>
                <div className="space-y-4">
                    {[
                        { key: 'reuniao_ls', label: 'Grupo LS' },
                        { key: 'reuniao_pioneiros', label: 'Pioneiros' },
                        { key: 'reuniao_anciaos', label: 'Anciãos e SM' },
                    ].map(item => (
                        <div key={item.key} className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                            <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-2">{item.label}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <input type="date" value={(config[item.key] as any).data} onChange={e => updateNestedObj(item.key, 'data', e.target.value)} className="p-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-600" />
                                <input type="time" value={(config[item.key] as any).hora} onChange={e => updateNestedObj(item.key, 'hora', e.target.value)} className="p-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-600" />
                                <input type="text" placeholder="Local" value={(config[item.key] as any).local} onChange={e => updateNestedObj(item.key, 'local', e.target.value)} className="p-2 text-sm border rounded-lg dark:bg-slate-800 dark:border-slate-600" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pauta para Reunião com Anciãos */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="text-lg">📋</span> Pauta para Reunião com Anciãos
                    </h2>
                    <button onClick={() => updateConfig('pauta_anciaos_visita', [...config.pauta_anciaos_visita, { id: Date.now().toString(), assunto: '', anciao_id: '', memo: '' }])} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-colors text-sm">+ Adicionar Assunto</button>
                </div>

                <div className="space-y-4">
                    {config.pauta_anciaos_visita.map((pauta: any, idx: number) => (
                        <div key={pauta.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3 relative">
                            <button onClick={() => updateConfig('pauta_anciaos_visita', config.pauta_anciaos_visita.filter((p: any) => p.id !== pauta.id))} className="absolute top-2 right-2 text-red-500 hover:bg-red-50 rounded p-1">✕</button>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Assunto</label>
                                    <input type="text" value={pauta.assunto} onChange={e => { const p = [...config.pauta_anciaos_visita]; p[idx].assunto = e.target.value; updateConfig('pauta_anciaos_visita', p) }} className="w-full p-2 text-sm border rounded-lg dark:bg-slate-800" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Ancião que Sugeriu</label>
                                    <select value={pauta.anciao_id} onChange={e => { const p = [...config.pauta_anciaos_visita]; p[idx].anciao_id = e.target.value; updateConfig('pauta_anciaos_visita', p) }} className="w-full p-2 text-sm border rounded-lg dark:bg-slate-800">
                                        <option value="">Selecione...</option>
                                        {membros.filter(m => m.is_anciao).map(m => <option key={m.id} value={m.id}>{m.nome_completo}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Breve Descrição / Contexto</label>
                                <textarea value={pauta.memo} onChange={e => { const p = [...config.pauta_anciaos_visita]; p[idx].memo = e.target.value; updateConfig('pauta_anciaos_visita', p) }} className="w-full p-2 text-sm border rounded-lg dark:bg-slate-800 h-24" />
                            </div>
                        </div>
                    ))}
                    {config.pauta_anciaos_visita.length === 0 && <p className="text-slate-500 italic text-center py-4">Nenhum assunto na pauta.</p>}
                </div>
            </div>
        </div>
    )
}
