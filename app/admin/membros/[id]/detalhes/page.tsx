'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'
import { compareTemas, matchesTemaSearch, temaBadgeTexto, temaCodigo, temaCodigoClass, temaLinha } from '@/lib/temaLabel'
import TemaSearchResults from '@/components/TemaSearchResults'

type MembroUpdate = Database['public']['Tables']['membros']['Update']

export default function DetalhesMembroPage() {
    const router = useRouter()
    const params = useParams()
    const id = params.id as string

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState<MembroUpdate>({})

    const [temasPreparados, setTemasPreparados] = useState<{ id: string, numero: number | null, titulo: string, tipo?: string, ano?: number | null }[]>([])
    const [temasDisponiveis, setTemasDisponiveis] = useState<{ id: string, numero: number | null, titulo: string, tipo?: string, ano?: number | null }[]>([])
    const [temaSelecionadoId, setTemaSelecionadoId] = useState('')
    const [addingTema, setAddingTema] = useState(false)

    // Search states
    const [searchTerm, setSearchTerm] = useState('')
    const [showResults, setShowResults] = useState(false)

    const filteredTemas = temasDisponiveis.filter(t => matchesTemaSearch(t, searchTerm))

    useEffect(() => {
        if (id) {
            fetchMembro()
            fetchTemasPreparados()
            fetchTemasDisponiveis()
        }
    }, [id])

    const fetchTemasPreparados = async () => {
        const { data, error } = await supabase
            .from('membros_temas')
            .select('tema:temas(id, numero, titulo, tipo, ano)')
            .eq('membro_id', id)

        if (error) {
            console.error('Erro ao buscar temas:', error)
        } else {
            const temas = data.map((item: any) => item.tema).filter(Boolean).sort(compareTemas)
            setTemasPreparados(temas)
        }
    }

    const fetchTemasDisponiveis = async () => {
        const { data } = await supabase.from('temas').select('id, numero, titulo, tipo, ano')
        setTemasDisponiveis((data || []).slice().sort(compareTemas))
    }

    const handleAddTema = async () => {
        if (!temaSelecionadoId) return
        setAddingTema(true)
        try {
            // Link theme to member
            const { error: linkError } = await supabase
                .from('membros_temas')
                .insert({ membro_id: id, tema_id: temaSelecionadoId })

            if (linkError) {
                if (linkError.code === '23505') { // Unique violation
                    alert('Este tema já está na lista do orador.')
                } else {
                    throw linkError
                }
            } else {
                setTemaSelecionadoId('')
                setSearchTerm('')
                fetchTemasPreparados()
            }

        } catch (error: any) {
            console.error('Erro ao adicionar tema:', error)
            alert('Erro ao adicionar tema: ' + error.message)
        } finally {
            setAddingTema(false)
        }
    }

    const handleRemoveTema = async (temaId: string) => {
        if (!confirm('Remover este tema da lista do orador?')) return

        try {
            const { error } = await supabase
                .from('membros_temas')
                .delete()
                .eq('membro_id', id)
                .eq('tema_id', temaId)

            if (error) throw error
            fetchTemasPreparados()
        } catch (error) {
            console.error('Erro ao remover tema:', error)
            alert('Erro ao remover tema')
        }
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
            router.back()
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (field: keyof MembroUpdate, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('membros')
                .update(formData)
                .eq('id', id)

            if (error) throw error

            alert('Detalhes atualizados com sucesso!')
            router.back()
        } catch (error: any) {
            console.error(error)
            alert('Erro ao atualizar detalhes: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8">Carregando...</div>

    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Detalhes do Membro</h1>
                <div className="h-1 w-20 bg-primary mx-auto rounded-full"></div>
            </div>

            <div className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-8">

                {/* Dados Pessoais */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b pb-2 border-slate-100 dark:border-slate-800">
                        <span className="text-primary">👤</span> Dados Pessoais
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Data de Nascimento</label>
                            <input
                                type="date"
                                value={formData.data_nascimento || ''}
                                onChange={(e) => handleChange('data_nascimento', e.target.value || null)}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Data de Batismo</label>
                            <input
                                type="date"
                                value={formData.data_batismo || ''}
                                onChange={(e) => handleChange('data_batismo', e.target.value || null)}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Endereço</label>
                            <input
                                type="text"
                                value={formData.endereco || ''}
                                onChange={(e) => handleChange('endereco', e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                                placeholder="Rua, Número, Bairro..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Contato</label>
                            <input
                                type="text"
                                value={formData.contato || ''}
                                onChange={(e) => handleChange('contato', e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                                placeholder="(00) 00000-0000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Contato de Emergência</label>
                            <input
                                type="text"
                                value={formData.contato_emergencia || ''}
                                onChange={(e) => handleChange('contato_emergencia', e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                                placeholder="Nome e Telefone"
                            />
                        </div>
                    </div>
                </div>

                {/* Temas Preparados - Apenas para Anciãos e Servos */}
                {(formData.is_anciao || formData.is_servo_ministerial) && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b pb-2 border-slate-100 dark:border-slate-800">
                            <span className="text-primary">🎤</span> Temas Preparados
                        </h3>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <div className="flex flex-col sm:flex-row gap-4 mb-6 relative z-20">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value)
                                            setShowResults(true)
                                            setTemaSelecionadoId('') // Clear selection when typing
                                        }}
                                        onFocus={() => setShowResults(true)}
                                        placeholder="Número, especial, campanha ou título..."
                                        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                                    />

                                    {/* Dropdown Results */}
                                    {showResults && (
                                        <div className="absolute z-30 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                            <TemaSearchResults
                                                temas={filteredTemas}
                                                onSelect={t => {
                                                    setTemaSelecionadoId(t.id)
                                                    setSearchTerm(temaLinha(t))
                                                    setShowResults(false)
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={handleAddTema}
                                    disabled={addingTema || !temaSelecionadoId}
                                    className="px-6 py-2 bg-primary text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all sm:w-auto w-full"
                                >
                                    {addingTema ? 'Adicionando...' : 'Adicionar'}
                                </button>
                            </div>

                            {/* Overlay to close dropdown when clicking outside */}
                            {showResults && (
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowResults(false)}
                                ></div>
                            )}

                            <div className="grid grid-cols-1 gap-2">
                                {temasPreparados.length === 0 ? (
                                    <p className="text-slate-500 dark:text-slate-400 italic">Nenhum tema cadastrado para este orador.</p>
                                ) : (
                                    temasPreparados.map((tema) => (
                                        <div key={tema.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <span className={`min-w-10 h-10 px-2 flex items-center justify-center font-bold rounded-lg text-xs ${temaCodigoClass(tema)}`}>
                                                    {temaBadgeTexto(tema)}
                                                </span>
                                                <span className="font-medium text-slate-700 dark:text-slate-300">{tema.titulo}</span>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveTema(tema.id)}
                                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Remover tema"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Qualificações Extras */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b pb-2 border-slate-100 dark:border-slate-800">
                        <span className="text-primary">🌟</span> Qualificações e Privilégios Extras
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { id: 'is_ungido', label: 'Ungido' },
                            { id: 'is_discurso_fora', label: 'Faz Discurso Fora' },
                            { id: 'is_leitor_livro', label: 'Leitor do Livro' },
                            { id: 'is_dirigente_campo', label: 'Dirigente de Campo' },
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

                {/* Observações */}
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b pb-2 border-slate-100 dark:border-slate-800">
                        <span className="text-primary">📝</span> Observações
                    </h3>
                    <textarea
                        value={formData.observacoes || ''}
                        onChange={(e) => handleChange('observacoes', e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white h-32 resize-none"
                        placeholder="Observações adicionais sobre o membro..."
                    />
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={() => router.back()}
                        className="px-8 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                        Voltar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <span className="animate-spin">⏳</span> Salvando...
                            </>
                        ) : (
                            'Salvar Detalhes'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
