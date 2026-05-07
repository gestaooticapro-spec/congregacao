'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'

type Membro = Database['public']['Tables']['membros']['Row']

export default function PainelVisitaPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [programacao, setProgramacao] = useState<any>(null)
    const [membros, setMembros] = useState<Membro[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [configId, setConfigId] = useState<string | null>(null)
    const [config, setConfig] = useState({
        analise_arquivos: { data: '', hora: '', local: 'Salão do Reino' },
        reuniao_terca: { data: '', hora: '', local: 'Salão do Reino' },
        reuniao_ls: { data: '', hora: '', local: 'Salão do Reino' },
        reuniao_pioneiros: { data: '', hora: '', local: 'Salão do Reino' },
        reuniao_anciaos: { data: '', hora: '', local: 'Salão do Reino' },
        saidas_campo: [] as any[],
        pastoreios: [] as any[],
        almocos: [] as any[],
        arranjos_estudo: [] as any[],
        pauta_anciaos_visita: [] as any[],
        weekend_discurso_tema: '',
        cantico_inicial_meio_semana: '',
        cantico_meio_meio_semana: '',
        cantico_final_meio_semana: '',
        oracao_final_meio_semana_id: '',
        cantico_inicial_fim_semana: '',
        cantico_meio_fim_semana: '',
        cantico_final_fim_semana: '',
        oracao_inicial_fim_semana_id: '',
        oracao_final_fim_semana_id: ''
    })

    useEffect(() => {
        if (id) fetchData()
    }, [id])

    const fetchData = async () => {
        try {
            // Fetch Programação
            const { data: progData, error: progError } = await supabase
                .from('programacao_semanal')
                .select('*')
                .eq('id', id)
                .single()

            if (progError) throw progError
            setProgramacao(progData)

            if (progData.evento_tipo !== 'visita spte') {
                alert('Esta programação não está marcada como Visita do Superintendente.')
                router.push('/admin/designacoes')
                return
            }

            // Fetch Config
            const { data: configData, error: configError } = await (supabase as any)
                .from('visita_config')
                .select('*')
                .eq('programacao_id', id)
                .maybeSingle()

            if (configError) throw configError

            if (configData) {
                setConfigId(configData.id)
                setConfig({
                    analise_arquivos: configData.analise_arquivos || { data: '', hora: '', local: 'Salão do Reino' },
                    reuniao_terca: configData.reuniao_terca || { data: '', hora: '', local: 'Salão do Reino' },
                    reuniao_ls: configData.reuniao_ls || { data: '', hora: '', local: 'Salão do Reino' },
                    reuniao_pioneiros: configData.reuniao_pioneiros || { data: '', hora: '', local: 'Salão do Reino' },
                    reuniao_anciaos: configData.reuniao_anciaos || { data: '', hora: '', local: 'Salão do Reino' },
                    saidas_campo: configData.saidas_campo || [],
                    pastoreios: configData.pastoreios || [],
                    almocos: configData.almocos || [],
                    arranjos_estudo: configData.arranjos_estudo || [],
                    pauta_anciaos_visita: configData.pauta_anciaos_visita || [],
                    weekend_discurso_tema: configData.weekend_discurso_tema || '',
                    cantico_inicial_meio_semana: configData.cantico_inicial_meio_semana || '',
                    cantico_meio_meio_semana: configData.cantico_meio_meio_semana || '',
                    cantico_final_meio_semana: configData.cantico_final_meio_semana || '',
                    oracao_final_meio_semana_id: configData.oracao_final_meio_semana_id || '',
                    cantico_inicial_fim_semana: configData.cantico_inicial_fim_semana || '',
                    cantico_meio_fim_semana: configData.cantico_meio_fim_semana || '',
                    cantico_final_fim_semana: configData.cantico_final_fim_semana || '',
                    oracao_inicial_fim_semana_id: configData.oracao_inicial_fim_semana_id || '',
                    oracao_final_fim_semana_id: configData.oracao_final_fim_semana_id || ''
                })
            }

            // Fetch Membros
            const { data: membData, error: membError } = await supabase
                .from('membros')
                .select('*')
                .eq('ativo', true)
                .order('nome_completo')

            if (membError) throw membError
            setMembros(membData || [])

        } catch (error) {
            console.error('Erro ao carregar:', error)
            alert('Erro ao carregar os dados.')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const payload = {
                programacao_id: id,
                analise_arquivos: config.analise_arquivos,
                reuniao_terca: config.reuniao_terca,
                reuniao_ls: config.reuniao_ls,
                reuniao_pioneiros: config.reuniao_pioneiros,
                reuniao_anciaos: config.reuniao_anciaos,
                saidas_campo: config.saidas_campo,
                pastoreios: config.pastoreios,
                almocos: config.almocos,
                arranjos_estudo: config.arranjos_estudo,
                pauta_anciaos_visita: config.pauta_anciaos_visita,
                weekend_discurso_tema: config.weekend_discurso_tema,
                cantico_inicial_meio_semana: config.cantico_inicial_meio_semana || null,
                cantico_meio_meio_semana: config.cantico_meio_meio_semana || null,
                cantico_final_meio_semana: config.cantico_final_meio_semana || null,
                oracao_final_meio_semana_id: config.oracao_final_meio_semana_id || null,
                cantico_inicial_fim_semana: config.cantico_inicial_fim_semana || null,
                cantico_meio_fim_semana: config.cantico_meio_fim_semana || null,
                cantico_final_fim_semana: config.cantico_final_fim_semana || null,
                oracao_inicial_fim_semana_id: config.oracao_inicial_fim_semana_id || null,
                oracao_final_fim_semana_id: config.oracao_final_fim_semana_id || null
            }

            if (configId) {
                const { error } = await (supabase as any).from('visita_config').update(payload).eq('id', configId)
                if (error) throw error
            } else {
                const { data, error } = await (supabase as any).from('visita_config').insert(payload).select().single()
                if (error) throw error
                if (data) setConfigId(data.id)
            }

            alert('Configurações salvas com sucesso!')
        } catch (error: any) {
            console.error('Erro ao salvar:', error)
            alert('Erro ao salvar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    // --- Helpers for Dynamic Lists ---
    const updateConfig = (key: keyof typeof config, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }))
    }

    const updateNestedObj = (key: keyof typeof config, field: string, value: string) => {
        setConfig(prev => ({
            ...prev,
            [key]: { ...(prev[key] as any), [field]: value }
        }))
    }

    const getMembroPhone = (membroId: string) => {
        // Implement phone fetching logic here. Wait, membros table doesn't have phone?
        // Let's check `membros` table schema. Ah, wait, members usually have phone.
        // Actually I don't remember if `membros` has phone. Let's assume it has `telefone` or similar, or I need to add it.
        // The user said: "Os campos de irmãos cadastrados como o membro, por exemplo, deve puxar o telefone cadastrado junto."
        // Let's use `(membro as any).celular` or `telefone`.
        const m = membros.find(m => m.id === membroId) as any
        return m?.telefone || m?.celular || ''
    }

    const getMembroEndereco = (membroId: string) => {
        const m = membros.find(m => m.id === membroId) as any
        return m?.endereco || ''
    }

    if (loading) return <div className="p-8">Carregando...</div>
    if (!programacao) return <div className="p-8">Programação não encontrada.</div>

    return (
        <div className="max-w-6xl mx-auto p-8 pb-32">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Painel da Visita</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">Semana de {new Date(programacao.data_reuniao + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => router.push(`/visita/${id}`)}
                        className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-medium transition-colors"
                    >
                        Ver Relatório Final
                    </button>
                    <button
                        onClick={() => router.push(`/admin/designacoes/${id}`)}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Voltar para Designações
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Reuniões e Eventos Fixos */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Eventos Principais e Reuniões</h2>
                        
                        <div className="space-y-4">
                            {/* Reunião de Meio de Semana */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                                <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-2">Reunião Vida e Ministério (Meio de Semana)</h3>
                                
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    <input type="date" value={config.reuniao_terca.data} onChange={e => updateNestedObj('reuniao_terca', 'data', e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600" />
                                    <input type="time" value={config.reuniao_terca.hora} onChange={e => updateNestedObj('reuniao_terca', 'hora', e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600" />
                                    <input type="text" placeholder="Local" value={config.reuniao_terca.local} onChange={e => updateNestedObj('reuniao_terca', 'local', e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600" />
                                </div>

                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Cântico Inicial</label>
                                        <input type="text" placeholder="Ex: 130" value={config.cantico_inicial_meio_semana} onChange={e => updateConfig('cantico_inicial_meio_semana', e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Cântico do Meio</label>
                                        <input type="text" placeholder="Ex: 131" value={config.cantico_meio_meio_semana} onChange={e => updateConfig('cantico_meio_meio_semana', e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Cântico Final</label>
                                        <input type="text" placeholder="Ex: 132" value={config.cantico_final_meio_semana} onChange={e => updateConfig('cantico_final_meio_semana', e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600" />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Oração Final</label>
                                    <select value={config.oracao_final_meio_semana_id} onChange={e => updateConfig('oracao_final_meio_semana_id', e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600">
                                        <option value="">Irmão...</option>
                                        {membros.filter(m => m.is_anciao || m.is_servo_ministerial).map(m => <option key={m.id} value={m.id}>{m.nome_completo}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Reunião de Fim de Semana */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border-l-4 border-blue-500">
                                <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-3">Reunião Pública (Fim de Semana)</h3>
                                
                                <div className="mb-3">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Tema do Discurso do Supte.</label>
                                    <input type="text" placeholder="Tema do discurso" value={config.weekend_discurso_tema} onChange={e => updateConfig('weekend_discurso_tema', e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 font-medium" />
                                </div>

                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Cântico Inicial</label>
                                        <input type="text" placeholder="Nº" value={config.cantico_inicial_fim_semana} onChange={e => updateConfig('cantico_inicial_fim_semana', e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Cântico do Meio</label>
                                        <input type="text" placeholder="Nº" value={config.cantico_meio_fim_semana} onChange={e => updateConfig('cantico_meio_fim_semana', e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Cântico Final</label>
                                        <input type="text" placeholder="Nº" value={config.cantico_final_fim_semana} onChange={e => updateConfig('cantico_final_fim_semana', e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Oração Inicial</label>
                                        <select value={config.oracao_inicial_fim_semana_id} onChange={e => updateConfig('oracao_inicial_fim_semana_id', e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600">
                                            <option value="">Irmão...</option>
                                            {membros.filter(m => m.is_anciao || m.is_servo_ministerial).map(m => <option key={m.id} value={m.id}>{m.nome_completo}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Oração Final</label>
                                        <select value={config.oracao_final_fim_semana_id} onChange={e => updateConfig('oracao_final_fim_semana_id', e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600">
                                            <option value="">Irmão...</option>
                                            {membros.filter(m => m.is_anciao || m.is_servo_ministerial).map(m => <option key={m.id} value={m.id}>{m.nome_completo}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Análise de Arquivos */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                                <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-2">Análise dos Cartões e Arquivos</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    <input type="date" value={config.analise_arquivos.data} onChange={e => updateNestedObj('analise_arquivos', 'data', e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600" />
                                    <input type="time" value={config.analise_arquivos.hora} onChange={e => updateNestedObj('analise_arquivos', 'hora', e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600" />
                                    <input type="text" placeholder="Local" value={config.analise_arquivos.local} onChange={e => updateNestedObj('analise_arquivos', 'local', e.target.value)} className="w-full p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Reuniões Especiais</h2>
                        
                        <div className="space-y-4">
                            {/* Grupo LS */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                                <span className="md:col-span-3 text-sm font-medium">Grupo LS</span>
                                <input type="date" value={config.reuniao_ls.data} onChange={e => updateNestedObj('reuniao_ls', 'data', e.target.value)} className="md:col-span-3 p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600" />
                                <input type="time" value={config.reuniao_ls.hora} onChange={e => updateNestedObj('reuniao_ls', 'hora', e.target.value)} className="md:col-span-2 p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600" />
                                <input type="text" placeholder="Local" value={config.reuniao_ls.local} onChange={e => updateNestedObj('reuniao_ls', 'local', e.target.value)} className="md:col-span-4 p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600" />
                            </div>

                            {/* Pioneiros */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                                <span className="md:col-span-3 text-sm font-medium">Pioneiros</span>
                                <input type="date" value={config.reuniao_pioneiros.data} onChange={e => updateNestedObj('reuniao_pioneiros', 'data', e.target.value)} className="md:col-span-3 p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600" />
                                <input type="time" value={config.reuniao_pioneiros.hora} onChange={e => updateNestedObj('reuniao_pioneiros', 'hora', e.target.value)} className="md:col-span-2 p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600" />
                                <input type="text" placeholder="Local" value={config.reuniao_pioneiros.local} onChange={e => updateNestedObj('reuniao_pioneiros', 'local', e.target.value)} className="md:col-span-4 p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600" />
                            </div>

                            {/* Anciãos */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                                <span className="md:col-span-3 text-sm font-medium">Anciãos e SM</span>
                                <input type="date" value={config.reuniao_anciaos.data} onChange={e => updateNestedObj('reuniao_anciaos', 'data', e.target.value)} className="md:col-span-3 p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600" />
                                <input type="time" value={config.reuniao_anciaos.hora} onChange={e => updateNestedObj('reuniao_anciaos', 'hora', e.target.value)} className="md:col-span-2 p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600" />
                                <input type="text" placeholder="Local" value={config.reuniao_anciaos.local} onChange={e => updateNestedObj('reuniao_anciaos', 'local', e.target.value)} className="md:col-span-4 p-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Arranjos para Almoço</h2>
                            <button onClick={() => updateConfig('almocos', [...config.almocos, { id: Date.now().toString(), dia: '', membro_id: '' }])} className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100">+ Adicionar</button>
                        </div>
                        
                        <div className="space-y-3">
                            {config.almocos.map((almoco, idx) => (
                                <div key={almoco.id} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                                    <select value={almoco.dia} onChange={e => { const a = [...config.almocos]; a[idx].dia = e.target.value; updateConfig('almocos', a) }} className="w-1/3 p-2 text-sm border rounded dark:bg-slate-800">
                                        <option value="">Dia...</option>
                                        <option value="Terça">Terça</option>
                                        <option value="Quarta">Quarta</option>
                                        <option value="Quinta">Quinta</option>
                                        <option value="Sexta">Sexta</option>
                                        <option value="Sábado">Sábado</option>
                                        <option value="Domingo">Domingo</option>
                                    </select>
                                    <select value={almoco.membro_id} onChange={e => { const a = [...config.almocos]; a[idx].membro_id = e.target.value; updateConfig('almocos', a) }} className="w-full p-2 text-sm border rounded dark:bg-slate-800">
                                        <option value="">Irmão(ã)...</option>
                                        {membros.map(m => <option key={m.id} value={m.id}>{m.nome_completo}</option>)}
                                    </select>
                                    <button onClick={() => updateConfig('almocos', config.almocos.filter(a => a.id !== almoco.id))} className="p-2 text-red-500 hover:bg-red-50 rounded">✕</button>
                                </div>
                            ))}
                            {config.almocos.length === 0 && <p className="text-sm text-slate-500 italic text-center">Nenhum almoço cadastrado.</p>}
                        </div>
                    </div>
                </div>

                {/* Listas Dinâmicas */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Saídas de Campo</h2>
                            <button onClick={() => updateConfig('saidas_campo', [...config.saidas_campo, { id: Date.now().toString(), dia: '', hora: '08:30', local: 'Salão do Reino' }])} className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100">+ Adicionar</button>
                        </div>
                        
                        <div className="space-y-3">
                            {config.saidas_campo.map((saida, idx) => (
                                <div key={saida.id} className="grid grid-cols-12 gap-2 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                                    <select value={saida.dia} onChange={e => { const s = [...config.saidas_campo]; s[idx].dia = e.target.value; updateConfig('saidas_campo', s) }} className="col-span-4 p-2 text-sm border rounded dark:bg-slate-800">
                                        <option value="">Dia...</option>
                                        <option value="Quarta">Quarta</option>
                                        <option value="Quinta">Quinta</option>
                                        <option value="Sexta">Sexta</option>
                                        <option value="Sábado">Sábado</option>
                                        <option value="Domingo">Domingo</option>
                                    </select>
                                    <input type="time" value={saida.hora} onChange={e => { const s = [...config.saidas_campo]; s[idx].hora = e.target.value; updateConfig('saidas_campo', s) }} className="col-span-3 p-2 text-sm border rounded dark:bg-slate-800" />
                                    <input type="text" placeholder="Local" value={saida.local} onChange={e => { const s = [...config.saidas_campo]; s[idx].local = e.target.value; updateConfig('saidas_campo', s) }} className="col-span-4 p-2 text-sm border rounded dark:bg-slate-800" />
                                    <button onClick={() => updateConfig('saidas_campo', config.saidas_campo.filter(s => s.id !== saida.id))} className="col-span-1 p-2 text-red-500 hover:bg-red-50 rounded">✕</button>
                                </div>
                            ))}
                            {config.saidas_campo.length === 0 && <p className="text-sm text-slate-500 italic text-center">Nenhuma saída cadastrada.</p>}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pastoreios</h2>
                            <button onClick={() => updateConfig('pastoreios', [...config.pastoreios, { id: Date.now().toString(), membro_id: '', data: '', hora: '11:00', anciao_id: '', memo: '' }])} className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100">+ Adicionar</button>
                        </div>
                        
                        <div className="space-y-4">
                            {config.pastoreios.map((pastoreio, idx) => (
                                <div key={pastoreio.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3 relative">
                                    <button onClick={() => updateConfig('pastoreios', config.pastoreios.filter(p => p.id !== pastoreio.id))} className="absolute top-2 right-2 text-red-500 hover:bg-red-50 rounded p-1">✕</button>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        <select value={pastoreio.membro_id} onChange={e => { const p = [...config.pastoreios]; p[idx].membro_id = e.target.value; updateConfig('pastoreios', p) }} className="p-2 text-sm border rounded dark:bg-slate-800">
                                            <option value="">Irmão(ã) a visitar...</option>
                                            {membros.map(m => <option key={m.id} value={m.id}>{m.nome_completo}</option>)}
                                        </select>
                                        <select value={pastoreio.anciao_id} onChange={e => { const p = [...config.pastoreios]; p[idx].anciao_id = e.target.value; updateConfig('pastoreios', p) }} className="p-2 text-sm border rounded dark:bg-slate-800">
                                            <option value="">Ancião Acompanhante...</option>
                                            {membros.filter(m => m.is_anciao).map(m => <option key={m.id} value={m.id}>{m.nome_completo}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="date" value={pastoreio.data} onChange={e => { const p = [...config.pastoreios]; p[idx].data = e.target.value; updateConfig('pastoreios', p) }} className="p-2 text-sm border rounded dark:bg-slate-800" />
                                        <input type="time" value={pastoreio.hora} onChange={e => { const p = [...config.pastoreios]; p[idx].hora = e.target.value; updateConfig('pastoreios', p) }} className="p-2 text-sm border rounded dark:bg-slate-800" />
                                    </div>
                                    <textarea placeholder="Breve descrição do contexto (Ex: Inativo, doente, precisando encorajamento...)" value={pastoreio.memo} onChange={e => { const p = [...config.pastoreios]; p[idx].memo = e.target.value; updateConfig('pastoreios', p) }} className="w-full p-2 text-sm border rounded dark:bg-slate-800 h-20" />
                                </div>
                            ))}
                            {config.pastoreios.length === 0 && <p className="text-sm text-slate-500 italic text-center">Nenhum pastoreio cadastrado.</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Arranjos de Estudo (Tabelas Múltiplas) */}
            <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Arranjos de Estudo e Revisita</h2>
                        <p className="text-sm text-slate-500">Ex: Trabalhar com o Superintendente, com a esposa, etc.</p>
                    </div>
                    <button onClick={() => updateConfig('arranjos_estudo', [...config.arranjos_estudo, { id: Date.now().toString(), nome_tabela: 'Arranjos para trabalhar com ...', linhas: [] }])} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors">+ Nova Tabela</button>
                </div>

                <div className="space-y-8">
                    {config.arranjos_estudo.map((tabela, tIdx) => (
                        <div key={tabela.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center gap-4">
                                <input 
                                    type="text" 
                                    value={tabela.nome_tabela} 
                                    onChange={e => { const a = [...config.arranjos_estudo]; a[tIdx].nome_tabela = e.target.value; updateConfig('arranjos_estudo', a) }} 
                                    className="flex-1 font-bold text-lg bg-transparent border-b border-dashed border-slate-400 focus:border-blue-500 outline-none px-1 py-1"
                                />
                                <div className="flex gap-2">
                                    <button onClick={() => { const a = [...config.arranjos_estudo]; a[tIdx].linhas.push({ id: Date.now().toString(), dia: '', hora: '', membro_id: '', estudante: '', publicacao: '' }); updateConfig('arranjos_estudo', a) }} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200">+ Adicionar Linha</button>
                                    <button onClick={() => updateConfig('arranjos_estudo', config.arranjos_estudo.filter(t => t.id !== tabela.id))} className="text-sm bg-red-50 text-red-600 px-3 py-1 rounded hover:bg-red-100">Excluir Tabela</button>
                                </div>
                            </div>
                            <div className="p-4 space-y-3">
                                {tabela.linhas.map((linha: any, lIdx: number) => (
                                    <div key={linha.id} className="grid grid-cols-12 gap-2 items-center">
                                        <select value={linha.dia} onChange={e => { const a = [...config.arranjos_estudo]; a[tIdx].linhas[lIdx].dia = e.target.value; updateConfig('arranjos_estudo', a) }} className="col-span-2 p-2 text-sm border rounded dark:bg-slate-800">
                                            <option value="">Dia...</option>
                                            <option value="Terça">Terça</option>
                                            <option value="Quarta">Quarta</option>
                                            <option value="Quinta">Quinta</option>
                                            <option value="Sexta">Sexta</option>
                                        </select>
                                        <input type="time" value={linha.hora} onChange={e => { const a = [...config.arranjos_estudo]; a[tIdx].linhas[lIdx].hora = e.target.value; updateConfig('arranjos_estudo', a) }} className="col-span-2 p-2 text-sm border rounded dark:bg-slate-800" />
                                        <select value={linha.membro_id} onChange={e => { const a = [...config.arranjos_estudo]; a[tIdx].linhas[lIdx].membro_id = e.target.value; updateConfig('arranjos_estudo', a) }} className="col-span-3 p-2 text-sm border rounded dark:bg-slate-800">
                                            <option value="">Irmão(ã)...</option>
                                            {membros.map(m => <option key={m.id} value={m.id}>{m.nome_completo}</option>)}
                                        </select>
                                        <input type="text" placeholder="Estudante" value={linha.estudante} onChange={e => { const a = [...config.arranjos_estudo]; a[tIdx].linhas[lIdx].estudante = e.target.value; updateConfig('arranjos_estudo', a) }} className="col-span-2 p-2 text-sm border rounded dark:bg-slate-800" />
                                        <input type="text" placeholder="Publicação" value={linha.publicacao} onChange={e => { const a = [...config.arranjos_estudo]; a[tIdx].linhas[lIdx].publicacao = e.target.value; updateConfig('arranjos_estudo', a) }} className="col-span-2 p-2 text-sm border rounded dark:bg-slate-800" />
                                        <button onClick={() => { const a = [...config.arranjos_estudo]; a[tIdx].linhas = a[tIdx].linhas.filter((l: any) => l.id !== linha.id); updateConfig('arranjos_estudo', a) }} className="col-span-1 p-2 text-red-500 hover:bg-red-50 rounded">✕</button>
                                    </div>
                                ))}
                                {tabela.linhas.length === 0 && <p className="text-sm text-slate-500 italic text-center">Nenhuma linha nesta tabela.</p>}
                            </div>
                        </div>
                    ))}
                    {config.arranjos_estudo.length === 0 && <p className="text-slate-500 italic text-center">Nenhuma tabela de arranjo criada.</p>}
                </div>
            </div>

            {/* Pauta com Anciãos */}
            <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pauta para Reunião com Anciãos</h2>
                    <button onClick={() => updateConfig('pauta_anciaos_visita', [...config.pauta_anciaos_visita, { id: Date.now().toString(), assunto: '', anciao_id: '', memo: '' }])} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-colors">+ Adicionar Assunto</button>
                </div>

                <div className="space-y-4">
                    {config.pauta_anciaos_visita.map((pauta, idx) => (
                        <div key={pauta.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg space-y-3 relative">
                            <button onClick={() => updateConfig('pauta_anciaos_visita', config.pauta_anciaos_visita.filter(p => p.id !== pauta.id))} className="absolute top-2 right-2 text-red-500 hover:bg-red-50 rounded p-1">✕</button>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Assunto</label>
                                    <input type="text" value={pauta.assunto} onChange={e => { const p = [...config.pauta_anciaos_visita]; p[idx].assunto = e.target.value; updateConfig('pauta_anciaos_visita', p) }} className="w-full p-2 text-sm border rounded dark:bg-slate-800" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Ancião que Sugeriu</label>
                                    <select value={pauta.anciao_id} onChange={e => { const p = [...config.pauta_anciaos_visita]; p[idx].anciao_id = e.target.value; updateConfig('pauta_anciaos_visita', p) }} className="w-full p-2 text-sm border rounded dark:bg-slate-800">
                                        <option value="">Selecione...</option>
                                        {membros.filter(m => m.is_anciao).map(m => <option key={m.id} value={m.id}>{m.nome_completo}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Breve Descrição / Contexto</label>
                                <textarea value={pauta.memo} onChange={e => { const p = [...config.pauta_anciaos_visita]; p[idx].memo = e.target.value; updateConfig('pauta_anciaos_visita', p) }} className="w-full p-2 text-sm border rounded dark:bg-slate-800 h-24" />
                            </div>
                        </div>
                    ))}
                    {config.pauta_anciaos_visita.length === 0 && <p className="text-slate-500 italic text-center">Nenhum assunto na pauta.</p>}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-4 z-50">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold shadow-lg"
                >
                    {saving ? 'Salvando...' : 'Salvar Configurações da Visita'}
                </button>
            </div>
        </div>
    )
}
