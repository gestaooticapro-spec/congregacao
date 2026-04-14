'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'

type MembroUpdate = Database['public']['Tables']['membros']['Update']

export default function EditarMembroPage() {
    const router = useRouter()
    const params = useParams()
    const id = params.id as string

    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('dados')

    // Form Data
    const [formData, setFormData] = useState<MembroUpdate>({})

    // Auxiliary Data
    const [grupos, setGrupos] = useState<Database['public']['Tables']['grupos_servico']['Row'][]>([])

    // Navigation Data
    const [prevMemberId, setPrevMemberId] = useState<string | null>(null)
    const [nextMemberId, setNextMemberId] = useState<string | null>(null)



    useEffect(() => {
        if (id) {
            fetchData()
        }
    }, [id])

    const fetchData = async () => {
        setLoading(true)
        try {
            await Promise.all([
                fetchMembro(),
                fetchGrupos(),
                fetchNavigation()
            ])
        } catch (error) {
            console.error('Erro ao carregar dados:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchNavigation = async () => {
        const { data } = await supabase
            .from('membros')
            .select('id')
            .order('nome_completo')

        if (data) {
            const currentIndex = data.findIndex(m => m.id === id)
            if (currentIndex !== -1) {
                setPrevMemberId(currentIndex > 0 ? data[currentIndex - 1].id : null)
                setNextMemberId(currentIndex < data.length - 1 ? data[currentIndex + 1].id : null)
            }
        }
    }

    const fetchGrupos = async () => {
        const { data } = await supabase.from('grupos_servico').select('*').order('nome')
        setGrupos(data || [])
    }

    const fetchMembro = async () => {
        try {
            const { data, error } = await supabase
                .from('membros')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            if (data) {
                setFormData(data)
            }
        } catch (error) {
            console.error('Erro ao buscar membro:', error)
            alert('Erro ao carregar membro')
            router.push('/admin/membros')
        }
    }



    const handleChange = (field: keyof MembroUpdate, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSave = async () => {
        if (!formData.nome_completo) {
            alert('Nome é obrigatório')
            return
        }

        setSaving(true)
        try {
            const { error } = await supabase
                .from('membros')
                .update(formData)
                .eq('id', id)

            if (error) throw error

            // alert('Membro atualizado com sucesso!') - Removed for speed
            // Optional: router.push('/admin/membros') or stay on page
        } catch (error: any) {
            console.error(error)
            alert('Erro ao atualizar membro: ' + error.message)
        } finally {
            setSaving(false)
        }
    }



    if (loading) return <div className="p-8">Carregando...</div>

    const tabs = [
        { id: 'dados', label: 'Dados' },
        { id: 'qualificacoes', label: 'Qualificações' },
        { id: 'designacoes', label: 'Designações' },
        { id: 'privilegios', label: 'Privilégios' },
    ]

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-8 pb-32">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Editar Membro</h1>
                <div className="h-1 w-20 bg-primary mx-auto rounded-full"></div>
            </div>

            <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">

                {/* Persistent Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="flex flex-col md:flex-row gap-6 items-end justify-between">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Nome usual</label>
                            <input
                                type="text"
                                value={formData.nome_completo || ''}
                                onChange={(e) => handleChange('nome_completo', e.target.value)}
                                className="w-full px-4 py-2 text-lg font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                                placeholder="Nome do Membro"
                            />
                        </div>
                        <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 h-[46px]">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 pl-2">Status:</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.ativo ?? true}
                                    onChange={(e) => handleChange('ativo', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                <span className="ml-2 text-sm font-medium text-slate-900 dark:text-slate-300 min-w-[3rem]">
                                    {formData.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex overflow-x-auto border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-4 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="p-6 min-h-[400px]">

                    {/* DADOS */}
                    {activeTab === 'dados' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Grupo de Serviço</label>
                                    <select
                                        value={formData.grupo_id || ''}
                                        onChange={(e) => handleChange('grupo_id', e.target.value || null)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                                    >
                                        <option value="">Nenhum</option>
                                        {grupos.map(g => (
                                            <option key={g.id} value={g.id}>{g.nome}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nome Civil (Completo)</label>
                                    <input
                                        type="text"
                                        value={formData.nome_civil || ''}
                                        onChange={(e) => handleChange('nome_civil', e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                                        placeholder="Nome completo de registro"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Gênero</label>
                                    <select
                                        value={formData.genero || ''}
                                        onChange={(e) => handleChange('genero', e.target.value || null)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="M">Masculino</option>
                                        <option value="F">Feminino</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Data de Nascimento</label>
                                    <input
                                        type="date"
                                        value={formData.data_nascimento || ''}
                                        onChange={(e) => handleChange('data_nascimento', e.target.value || null)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Data de Batismo</label>
                                    <input
                                        type="date"
                                        value={formData.data_batismo || ''}
                                        onChange={(e) => handleChange('data_batismo', e.target.value || null)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Endereço</label>
                                    <input
                                        type="text"
                                        value={formData.endereco || ''}
                                        onChange={(e) => handleChange('endereco', e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                                        placeholder="Rua, Número, Bairro..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Contato</label>
                                    <input
                                        type="text"
                                        value={formData.contato || ''}
                                        onChange={(e) => handleChange('contato', e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Contato de Emergência</label>
                                    <input
                                        type="text"
                                        value={formData.contato_emergencia || ''}
                                        onChange={(e) => handleChange('contato_emergencia', e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                                        placeholder="Nome e Telefone"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Observações</label>
                                    <textarea
                                        value={formData.observacoes || ''}
                                        onChange={(e) => handleChange('observacoes', e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white h-24 resize-none"
                                        placeholder="Observações adicionais..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* QUALIFICAÇÕES */}
                    {activeTab === 'qualificacoes' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    { id: 'is_anciao', label: 'Ancião' },
                                    { id: 'is_servo_ministerial', label: 'Servo Ministerial' },
                                    { id: 'is_pioneiro', label: 'Pioneiro' },
                                    { id: 'is_publicador', label: 'Publicador' },
                                    { id: 'is_batizado', label: 'Batizado' },
                                    { id: 'is_ungido', label: 'Ungido' },
                                ].map((item) => (
                                    <label key={item.id} className="flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 rounded-xl border border-transparent hover:border-primary/20 transition-all cursor-pointer group shadow-sm">
                                        <input
                                            type="checkbox"
                                            checked={(formData as any)[item.id] || false}
                                            onChange={(e) => handleChange(item.id as any, e.target.checked)}
                                            className="h-5 w-5 text-primary border-slate-300 rounded-md focus:ring-primary transition-all"
                                        />
                                        <span className="text-slate-700 dark:text-slate-300 font-medium group-hover:text-primary transition-colors">{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DESIGNAÇÕES */}
                    {activeTab === 'designacoes' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[
                                    { id: 'is_presidente', label: 'Presidente' },
                                    { id: 'is_leitor_biblia', label: 'Leitor da Bíblia' },
                                    { id: 'is_leitor_sentinela', label: 'Leitor de A Sentinela' },
                                    { id: 'is_som', label: 'Som' },
                                    { id: 'is_microfone', label: 'Microfone' },
                                    { id: 'is_indicador', label: 'Indicador' },
                                    { id: 'is_balcao', label: 'Balcão' },
                                    { id: 'is_leitor_estudo_biblico', label: 'Leitor do Estudo Bíblico' },
                                    { id: 'is_parte_vida_ministerio', label: 'Partes Vida e Ministério' },
                                    { id: 'is_ajudante', label: 'Ajudante' },
                                    { id: 'is_dirigente_campo', label: 'Dirigente de Campo' },
                                    { id: 'is_leitor_livro', label: 'Leitor do Livro' },
                                ].map((item) => (
                                    <label key={item.id} className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 rounded-xl border border-transparent hover:border-primary/20 transition-all cursor-pointer group shadow-sm">
                                        <input
                                            type="checkbox"
                                            checked={(formData as any)[item.id] || false}
                                            onChange={(e) => handleChange(item.id as any, e.target.checked)}
                                            className="h-5 w-5 text-primary border-slate-300 rounded-md focus:ring-primary transition-all"
                                        />
                                        <span className="text-slate-700 dark:text-slate-300 font-medium group-hover:text-primary transition-colors">{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* PRIVILÉGIOS */}
                    {activeTab === 'privilegios' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[
                                    { id: 'is_discurso_fora', label: 'Faz Discurso Fora' },
                                    { id: 'is_sg', label: 'Superintendente de Grupo' },
                                    { id: 'is_conselheiro_assistente', label: 'Conselheiro Assistente' },
                                    { id: 'is_spte_vida_ministerio', label: 'Sup. Vida e Ministério' },
                                    { id: 'is_contato_manutencao', label: 'Contato Manutenção' },
                                    { id: 'is_contas', label: 'Contas' },
                                    { id: 'is_balcao_publicacao', label: 'Balcão de Publicações' },
                                ].map((item) => (
                                    <label key={item.id} className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 rounded-xl border border-transparent hover:border-primary/20 transition-all cursor-pointer group shadow-sm">
                                        <input
                                            type="checkbox"
                                            checked={(formData as any)[item.id] || false}
                                            onChange={(e) => handleChange(item.id as any, e.target.checked)}
                                            className="h-5 w-5 text-primary border-slate-300 rounded-md focus:ring-primary transition-all"
                                        />
                                        <span className="text-slate-700 dark:text-slate-300 font-medium group-hover:text-primary transition-colors">{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}



                </div>
            </div>

            {/* Fixed Footer Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-50">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">

                    {/* Navigation Arrows */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => prevMemberId && router.push(`/admin/membros/${prevMemberId}`)}
                            disabled={!prevMemberId}
                            className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            title="Membro Anterior"
                        >
                            ⬅️
                        </button>
                        <button
                            onClick={() => nextMemberId && router.push(`/admin/membros/${nextMemberId}`)}
                            disabled={!nextMemberId}
                            className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            title="Próximo Membro"
                        >
                            ➡️
                        </button>
                    </div>

                    <div className="flex gap-4 w-full sm:w-auto">
                        <button
                            onClick={() => router.push('/admin/membros')}
                            className="flex-1 sm:flex-none px-8 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 sm:flex-none px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <span className="animate-spin">⏳</span> Salvando...
                                </>
                            ) : (
                                'Salvar'
                            )}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    )
}
