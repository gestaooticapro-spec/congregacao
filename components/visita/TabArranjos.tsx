'use client'

import { Database } from '@/types/database.types'
type Membro = Database['public']['Tables']['membros']['Row']

interface Props {
    config: any
    membros: Membro[]
    updateConfig: (key: string, value: any) => void
}

export default function TabArranjos({ config, membros, updateConfig }: Props) {
    return (
        <div className="space-y-8">
            {/* Almoço */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="text-lg">🍽️</span> Arranjos para Almoço
                    </h2>
                    <button onClick={() => updateConfig('almocos', [...config.almocos, { id: Date.now().toString(), dia: '', membro_id: '' }])} className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">+ Adicionar</button>
                </div>

                <div className="space-y-3">
                    {config.almocos.map((almoco: any, idx: number) => (
                        <div key={almoco.id} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                            <select value={almoco.dia} onChange={e => { const a = [...config.almocos]; a[idx].dia = e.target.value; updateConfig('almocos', a) }} className="w-1/3 p-2 text-sm border rounded-lg dark:bg-slate-800">
                                <option value="">Dia...</option>
                                <option value="Terça">Terça</option>
                                <option value="Quarta">Quarta</option>
                                <option value="Quinta">Quinta</option>
                                <option value="Sexta">Sexta</option>
                                <option value="Sábado">Sábado</option>
                                <option value="Domingo">Domingo</option>
                            </select>
                            <select value={almoco.membro_id} onChange={e => { const a = [...config.almocos]; a[idx].membro_id = e.target.value; updateConfig('almocos', a) }} className="w-full p-2 text-sm border rounded-lg dark:bg-slate-800">
                                <option value="">Irmão(ã)...</option>
                                {membros.map(m => <option key={m.id} value={m.id}>{m.nome_completo}</option>)}
                            </select>
                            <button onClick={() => updateConfig('almocos', config.almocos.filter((a: any) => a.id !== almoco.id))} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">✕</button>
                        </div>
                    ))}
                    {config.almocos.length === 0 && <p className="text-sm text-slate-500 italic text-center py-4">Nenhum almoço cadastrado.</p>}
                </div>
            </div>

            {/* Pastoreios */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="text-lg">🐑</span> Pastoreios
                    </h2>
                    <button onClick={() => updateConfig('pastoreios', [...config.pastoreios, { id: Date.now().toString(), membro_id: '', data: '', hora: '11:00', anciao_id: '', memo: '' }])} className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">+ Adicionar</button>
                </div>

                <div className="space-y-4">
                    {config.pastoreios.map((pastoreio: any, idx: number) => (
                        <div key={pastoreio.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3 relative">
                            <button onClick={() => updateConfig('pastoreios', config.pastoreios.filter((p: any) => p.id !== pastoreio.id))} className="absolute top-2 right-2 text-red-500 hover:bg-red-50 rounded p-1">✕</button>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <select value={pastoreio.membro_id} onChange={e => { const p = [...config.pastoreios]; p[idx].membro_id = e.target.value; updateConfig('pastoreios', p) }} className="p-2 text-sm border rounded-lg dark:bg-slate-800">
                                    <option value="">Irmão(ã) a visitar...</option>
                                    {membros.map(m => <option key={m.id} value={m.id}>{m.nome_completo}</option>)}
                                </select>
                                <select value={pastoreio.anciao_id} onChange={e => { const p = [...config.pastoreios]; p[idx].anciao_id = e.target.value; updateConfig('pastoreios', p) }} className="p-2 text-sm border rounded-lg dark:bg-slate-800">
                                    <option value="">Ancião Acompanhante...</option>
                                    {membros.filter(m => m.is_anciao).map(m => <option key={m.id} value={m.id}>{m.nome_completo}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <input type="date" value={pastoreio.data} onChange={e => { const p = [...config.pastoreios]; p[idx].data = e.target.value; updateConfig('pastoreios', p) }} className="p-2 text-sm border rounded-lg dark:bg-slate-800" />
                                <input type="time" value={pastoreio.hora} onChange={e => { const p = [...config.pastoreios]; p[idx].hora = e.target.value; updateConfig('pastoreios', p) }} className="p-2 text-sm border rounded-lg dark:bg-slate-800" />
                            </div>
                            <textarea placeholder="Breve descrição do contexto (Ex: Inativo, doente, precisando encorajamento...)" value={pastoreio.memo} onChange={e => { const p = [...config.pastoreios]; p[idx].memo = e.target.value; updateConfig('pastoreios', p) }} className="w-full p-2 text-sm border rounded-lg dark:bg-slate-800 h-20" />
                        </div>
                    ))}
                    {config.pastoreios.length === 0 && <p className="text-sm text-slate-500 italic text-center py-4">Nenhum pastoreio cadastrado.</p>}
                </div>
            </div>
        </div>
    )
}
