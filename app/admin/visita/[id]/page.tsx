'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'
import TabEventosEspeciais from '@/components/visita/TabEventosEspeciais'
import TabVidaMinisterio from '@/components/visita/TabVidaMinisterio'
import TabReuniaoPublica from '@/components/visita/TabReuniaoPublica'
import TabMinisterio from '@/components/visita/TabMinisterio'
import TabArranjos from '@/components/visita/TabArranjos'

type Membro = Database['public']['Tables']['membros']['Row']

const TABS = [
    { id: 'eventos', label: 'Eventos Especiais', icon: '⭐', sub: ['Análise dos Cartões', 'Reuniões especiais', 'Pauta com Anciãos'] },
    { id: 'vida', label: 'Vida e Ministério', icon: '📖', sub: [] },
    { id: 'publica', label: 'Reunião Pública', icon: '🎤', sub: [] },
    { id: 'ministerio', label: 'Ministério', icon: '🚶', sub: ['Saída de Campo', 'Estudos e Revisitas'] },
    { id: 'arranjos', label: 'Arranjos', icon: '📋', sub: ['Almoço', 'Pastoreio'] },
] as const

type TabId = typeof TABS[number]['id']

export default function PainelVisitaPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [programacao, setProgramacao] = useState<any>(null)
    const [membros, setMembros] = useState<Membro[]>([])
    const [colaboradores, setColaboradores] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState<TabId>('eventos')

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
        midweek_discurso_tema: '',
        cantico_inicial_meio_semana: '',
        cantico_meio_meio_semana: '',
        cantico_final_meio_semana: '',
        oracao_final_meio_semana_id: '',
        cantico_inicial_fim_semana: '',
        cantico_meio_fim_semana: '',
        cantico_final_fim_semana: '',
        oracao_inicial_fim_semana_id: '',
        oracao_final_fim_semana_id: '',
        dirigente_sentinela_fim_semana_id: '',
        weekend_discurso_final_tema: ''
    })

    const [weekendPresidente, setWeekendPresidente] = useState<string | null>(null)

    useEffect(() => {
        if (id) fetchData()
    }, [id])

    useEffect(() => {
        const fetchPresidente = async () => {
            if (config.reuniao_ls?.data) {
                const { data } = await (supabase as any)
                    .from('designacoes_suporte')
                    .select('membro_id, membros(nome_completo)')
                    .eq('data', config.reuniao_ls.data)
                    .eq('funcao', 'PRESIDENTE')
                    .maybeSingle()
                
                if (data?.membros?.nome_completo) {
                    setWeekendPresidente(data.membros.nome_completo)
                } else {
                    setWeekendPresidente(null)
                }
            }
        }
        fetchPresidente()
    }, [config.reuniao_ls?.data])

    const fetchData = async () => {
        try {
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
                    midweek_discurso_tema: configData.midweek_discurso_tema || '',
                    cantico_inicial_meio_semana: configData.cantico_inicial_meio_semana || '',
                    cantico_meio_meio_semana: configData.cantico_meio_meio_semana || '',
                    cantico_final_meio_semana: configData.cantico_final_meio_semana || '',
                    oracao_final_meio_semana_id: configData.oracao_final_meio_semana_id || '',
                    cantico_inicial_fim_semana: configData.cantico_inicial_fim_semana || '',
                    cantico_meio_fim_semana: configData.cantico_meio_fim_semana || '',
                    cantico_final_fim_semana: configData.cantico_final_fim_semana || '',
                    oracao_inicial_fim_semana_id: configData.oracao_inicial_fim_semana_id || '',
                    oracao_final_fim_semana_id: configData.oracao_final_fim_semana_id || '',
                    dirigente_sentinela_fim_semana_id: configData.dirigente_sentinela_fim_semana_id || '',
                    weekend_discurso_final_tema: configData.weekend_discurso_final_tema || ''
                })
            }

            const { data: membData, error: membError } = await supabase
                .from('membros')
                .select('*')
                .eq('ativo', true)
                .order('nome_completo')

            if (membError) throw membError
            setMembros(membData || [])

            const { data: colabData } = await (supabase as any)
                .from('colaboradores_externos')
                .select('id, nome, funcao')
            
            if (colabData) {
                setColaboradores(colabData.filter((c: any) => 
                    c.funcao?.toLowerCase().includes('superintendente') || 
                    c.funcao?.toLowerCase().includes('circuito')
                ))
            }

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
                midweek_discurso_tema: config.midweek_discurso_tema || null,
                cantico_inicial_meio_semana: config.cantico_inicial_meio_semana || null,
                cantico_meio_meio_semana: config.cantico_meio_meio_semana || null,
                cantico_final_meio_semana: config.cantico_final_meio_semana || null,
                oracao_final_meio_semana_id: config.oracao_final_meio_semana_id || null,
                cantico_inicial_fim_semana: config.cantico_inicial_fim_semana || null,
                cantico_meio_fim_semana: config.cantico_meio_fim_semana || null,
                cantico_final_fim_semana: config.cantico_final_fim_semana || null,
                oracao_inicial_fim_semana_id: config.oracao_inicial_fim_semana_id || null,
                oracao_final_fim_semana_id: config.oracao_final_fim_semana_id || null,
                dirigente_sentinela_fim_semana_id: config.dirigente_sentinela_fim_semana_id || null,
                weekend_discurso_final_tema: config.weekend_discurso_final_tema || null
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

    const updateConfig = (key: string, value: any) => {
        setConfig(prev => ({ ...prev, [key]: value }))
    }

    const updateNestedObj = (key: string, field: string, value: string) => {
        setConfig(prev => ({
            ...prev,
            [key]: { ...(prev as any)[key], [field]: value }
        }))
    }

    if (loading) return <div className="p-8">Carregando...</div>
    if (!programacao) return <div className="p-8">Programação não encontrada.</div>

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 pb-32">
            {/* Header */}
            <div className="mb-6">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Painel da Visita</p>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Semana de {new Date(programacao.data_reuniao + 'T00:00:00').toLocaleDateString('pt-BR')}</h1>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
                <nav className="flex flex-wrap gap-1" role="tablist">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`group relative px-4 py-3 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 border-b-white dark:border-b-slate-800 -mb-px shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </span>
                            {tab.sub.length > 0 && (
                                <span className={`block text-[10px] mt-0.5 font-normal ${activeTab === tab.id ? 'text-blue-400' : 'text-slate-400'}`}>
                                    {tab.sub.join(' · ')}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'eventos' && (
                    <TabEventosEspeciais config={config} membros={membros} updateConfig={updateConfig} updateNestedObj={updateNestedObj} />
                )}
                {activeTab === 'vida' && (
                    <TabVidaMinisterio config={config} membros={membros} colaboradores={colaboradores} programacao={programacao} updateConfig={updateConfig} updateNestedObj={updateNestedObj} />
                )}
                {activeTab === 'publica' && (
                    <TabReuniaoPublica config={config} membros={membros} colaboradores={colaboradores} weekendPresidente={weekendPresidente} updateConfig={updateConfig} />
                )}
                {activeTab === 'ministerio' && (
                    <TabMinisterio config={config} membros={membros} updateConfig={updateConfig} />
                )}
                {activeTab === 'arranjos' && (
                    <TabArranjos config={config} membros={membros} updateConfig={updateConfig} />
                )}
            </div>

            {/* Fixed Save Bar */}
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
