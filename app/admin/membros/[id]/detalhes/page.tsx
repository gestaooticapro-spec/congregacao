'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'

type MembroUpdate = Database['public']['Tables']['membros']['Update']

export default function DetalhesMembroPage() {
    const router = useRouter()
    const params = useParams()
    const id = params.id as string

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState<MembroUpdate>({})

    useEffect(() => {
        if (id) {
            fetchMembro()
        }
    }, [id])

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
