'use client'

import { Database } from '@/types/database.types'
type Membro = Database['public']['Tables']['membros']['Row']

interface Props {
    config: any
    membros: Membro[]
    updateConfig: (key: string, value: any) => void
}

export default function TabMinisterio({ config, membros, updateConfig }: Props) {
    return (
        <div className="space-y-8">
            {/* Saídas de Campo */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="text-lg">🚶</span> Saídas de Campo
                    </h2>
                    <button onClick={() => updateConfig('saidas_campo', [...config.saidas_campo, { id: Date.now().toString(), dia: '', hora: '08:30', local: 'Salão do Reino' }])} className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">+ Adicionar</button>
                </div>

                <div className="space-y-3">
                    {config.saidas_campo.map((saida: any, idx: number) => (
                        <div key={saida.id} className="grid grid-cols-12 gap-2 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                            <select value={saida.dia} onChange={e => { const s = [...config.saidas_campo]; s[idx].dia = e.target.value; updateConfig('saidas_campo', s) }} className="col-span-4 p-2 text-sm border rounded-lg dark:bg-slate-800">
                                <option value="">Dia...</option>
                                <option value="Quarta">Quarta</option>
                                <option value="Quinta">Quinta</option>
                                <option value="Sexta">Sexta</option>
                                <option value="Sábado">Sábado</option>
                                <option value="Domingo">Domingo</option>
                            </select>
                            <input type="time" value={saida.hora} onChange={e => { const s = [...config.saidas_campo]; s[idx].hora = e.target.value; updateConfig('saidas_campo', s) }} className="col-span-3 p-2 text-sm border rounded-lg dark:bg-slate-800" />
                            <input type="text" placeholder="Local" value={saida.local} onChange={e => { const s = [...config.saidas_campo]; s[idx].local = e.target.value; updateConfig('saidas_campo', s) }} className="col-span-4 p-2 text-sm border rounded-lg dark:bg-slate-800" />
                            <button onClick={() => updateConfig('saidas_campo', config.saidas_campo.filter((s: any) => s.id !== saida.id))} className="col-span-1 p-2 text-red-500 hover:bg-red-50 rounded-lg">✕</button>
                        </div>
                    ))}
                    {config.saidas_campo.length === 0 && <p className="text-sm text-slate-500 italic text-center py-4">Nenhuma saída cadastrada.</p>}
                </div>
            </div>

            {/* Arranjos de Estudo e Revisita */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="text-lg">📚</span> Estudos e Revisitas
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Ex: Trabalhar com o Superintendente, com a esposa, etc.</p>
                    </div>
                    <button onClick={() => updateConfig('arranjos_estudo', [...config.arranjos_estudo, { id: Date.now().toString(), nome_tabela: 'Arranjos para trabalhar com ...', linhas: [] }])} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors text-sm">+ Nova Tabela</button>
                </div>

                <div className="space-y-8">
                    {config.arranjos_estudo.map((tabela: any, tIdx: number) => (
                        <div key={tabela.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center gap-4">
                                <input
                                    type="text"
                                    value={tabela.nome_tabela}
                                    onChange={e => { const a = [...config.arranjos_estudo]; a[tIdx].nome_tabela = e.target.value; updateConfig('arranjos_estudo', a) }}
                                    className="flex-1 font-bold text-lg bg-transparent border-b border-dashed border-slate-400 focus:border-blue-500 outline-none px-1 py-1"
                                />
                                <div className="flex gap-2">
                                    <button onClick={() => { const a = [...config.arranjos_estudo]; a[tIdx].linhas.push({ id: Date.now().toString(), dia: '', hora: '', membro_id: '', estudante: '', publicacao: '' }); updateConfig('arranjos_estudo', a) }} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200">+ Linha</button>
                                    <button onClick={() => updateConfig('arranjos_estudo', config.arranjos_estudo.filter((t: any) => t.id !== tabela.id))} className="text-sm bg-red-50 text-red-600 px-3 py-1 rounded-lg hover:bg-red-100">Excluir</button>
                                </div>
                            </div>
                            <div className="p-4 space-y-3">
                                {tabela.linhas.map((linha: any, lIdx: number) => (
                                    <div key={linha.id} className="grid grid-cols-12 gap-2 items-center">
                                        <select value={linha.dia} onChange={e => { const a = [...config.arranjos_estudo]; a[tIdx].linhas[lIdx].dia = e.target.value; updateConfig('arranjos_estudo', a) }} className="col-span-2 p-2 text-sm border rounded-lg dark:bg-slate-800">
                                            <option value="">Dia...</option>
                                            <option value="Terça">Terça</option>
                                            <option value="Quarta">Quarta</option>
                                            <option value="Quinta">Quinta</option>
                                            <option value="Sexta">Sexta</option>
                                        </select>
                                        <input type="time" value={linha.hora} onChange={e => { const a = [...config.arranjos_estudo]; a[tIdx].linhas[lIdx].hora = e.target.value; updateConfig('arranjos_estudo', a) }} className="col-span-2 p-2 text-sm border rounded-lg dark:bg-slate-800" />
                                        <select value={linha.membro_id} onChange={e => { const a = [...config.arranjos_estudo]; a[tIdx].linhas[lIdx].membro_id = e.target.value; updateConfig('arranjos_estudo', a) }} className="col-span-3 p-2 text-sm border rounded-lg dark:bg-slate-800">
                                            <option value="">Irmão(ã)...</option>
                                            {membros.map(m => <option key={m.id} value={m.id}>{m.nome_completo}</option>)}
                                        </select>
                                        <input type="text" placeholder="Estudante" value={linha.estudante} onChange={e => { const a = [...config.arranjos_estudo]; a[tIdx].linhas[lIdx].estudante = e.target.value; updateConfig('arranjos_estudo', a) }} className="col-span-2 p-2 text-sm border rounded-lg dark:bg-slate-800" />
                                        <input type="text" placeholder="Publicação" value={linha.publicacao} onChange={e => { const a = [...config.arranjos_estudo]; a[tIdx].linhas[lIdx].publicacao = e.target.value; updateConfig('arranjos_estudo', a) }} className="col-span-2 p-2 text-sm border rounded-lg dark:bg-slate-800" />
                                        <button onClick={() => { const a = [...config.arranjos_estudo]; a[tIdx].linhas = a[tIdx].linhas.filter((l: any) => l.id !== linha.id); updateConfig('arranjos_estudo', a) }} className="col-span-1 p-2 text-red-500 hover:bg-red-50 rounded-lg">✕</button>
                                    </div>
                                ))}
                                {tabela.linhas.length === 0 && <p className="text-sm text-slate-500 italic text-center">Nenhuma linha nesta tabela.</p>}
                            </div>
                        </div>
                    ))}
                    {config.arranjos_estudo.length === 0 && <p className="text-slate-500 italic text-center py-4">Nenhuma tabela de arranjo criada.</p>}
                </div>
            </div>
        </div>
    )
}
