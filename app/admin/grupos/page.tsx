'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'

type Grupo = Database['public']['Tables']['grupos_servico']['Row']
type Membro = Database['public']['Tables']['membros']['Row']

export default function GruposPage() {
    const [grupos, setGrupos] = useState<Grupo[]>([])
    const [membros, setMembros] = useState<Membro[]>([])
    const [loading, setLoading] = useState(true)
    const [editingGrupo, setEditingGrupo] = useState<Partial<Grupo> | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const { data: gruposData, error: gruposError } = await supabase
                .from('grupos_servico')
                .select('*')
                .order('nome')

            if (gruposError) throw gruposError
            setGrupos(gruposData || [])

            const { data: membrosData, error: membrosError } = await supabase
                .from('membros')
                .select('*')
                .order('nome_completo')

            if (membrosError) throw membrosError
            setMembros(membrosData || [])

        } catch (error) {
            console.error('Erro ao carregar dados:', error)
            alert('Erro ao carregar dados.')
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (grupo: Grupo) => {
        setEditingGrupo(grupo)
        setIsModalOpen(true)
    }

    const handleNew = () => {
        setEditingGrupo({ nome: '', superintendente_id: null, ajudante_id: null })
        setIsModalOpen(true)
    }

    const handleSave = async () => {
        if (!editingGrupo?.nome) {
            alert('Nome é obrigatório')
            return
        }
        setSaving(true)
        try {
            if (editingGrupo.id) {
                const { error } = await supabase
                    .from('grupos_servico')
                    .update(editingGrupo)
                    .eq('id', editingGrupo.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('grupos_servico')
                    .insert(editingGrupo as any)
                if (error) throw error
            }

            await fetchData()
            setIsModalOpen(false)
            setEditingGrupo(null)
        } catch (error: any) {
            console.error(error)
            alert('Erro ao salvar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este grupo?')) return
        try {
            const { error } = await supabase
                .from('grupos_servico')
                .delete()
                .eq('id', id)
            if (error) throw error
            fetchData()
        } catch (error: any) {
            console.error(error)
            alert('Erro ao excluir: ' + error.message)
        }
    }

    const getMembroName = (id: string | null) => {
        if (!id) return '-'
        return membros.find(m => m.id === id)?.nome_completo || '-'
    }

    const [viewingMembersGrupo, setViewingMembersGrupo] = useState<Grupo | null>(null)

    const handleViewMembers = (grupo: Grupo) => {
        setViewingMembersGrupo(grupo)
    }

    const handleUpdateMemberGroup = async (membroId: string, newGrupoId: string | null) => {
        try {
            const { error } = await supabase
                .from('membros')
                .update({ grupo_id: newGrupoId })
                .eq('id', membroId)

            if (error) throw error

            // Update local state
            setMembros(prev => prev.map(m =>
                m.id === membroId ? { ...m, grupo_id: newGrupoId } : m
            ))

        } catch (error: any) {
            console.error(error)
            alert('Erro ao atualizar grupo do membro: ' + error.message)
        }
    }

    if (loading) return <div className="p-8">Carregando...</div>

    return (
        <div className="max-w-6xl mx-auto p-8">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Grupos de Serviço</h1>
                <div className="h-1 w-20 bg-primary mx-auto rounded-full"></div>
            </div>

            <div className="flex justify-end mb-8">
                <button
                    onClick={handleNew}
                    className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2"
                >
                    <span>+</span> Novo Grupo
                </button>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {grupos.map(grupo => (
                    <div key={grupo.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-none p-6 border border-slate-200 dark:border-slate-800 flex flex-col transition-all hover:scale-[1.02]">
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{grupo.nome}</h2>
                            <div className="flex gap-3">
                                <button onClick={() => handleEdit(grupo)} className="p-2 text-primary hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Editar">
                                    ✏️
                                </button>
                                <button onClick={() => handleDelete(grupo.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Excluir">
                                    🗑️
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 text-sm mb-8 flex-1">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                <span className="font-bold text-slate-500 dark:text-slate-400 block uppercase text-[10px] tracking-wider mb-1">Superintendente</span>
                                <span className="text-slate-900 dark:text-white font-semibold text-base">{getMembroName(grupo.superintendente_id)}</span>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                <span className="font-bold text-slate-500 dark:text-slate-400 block uppercase text-[10px] tracking-wider mb-1">Ajudante</span>
                                <span className="text-slate-900 dark:text-white font-semibold text-base">{getMembroName(grupo.ajudante_id)}</span>
                            </div>
                            <div className="flex items-center gap-2 px-1">
                                <span className="text-slate-500 dark:text-slate-400">👥</span>
                                <span className="text-slate-700 dark:text-slate-300 font-medium">
                                    {membros.filter(m => m.grupo_id === grupo.id).length} membros cadastrados
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => handleViewMembers(grupo)}
                            className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-bold shadow-sm"
                        >
                            Gerenciar Membros
                        </button>
                    </div>
                ))}
            </div>

            {/* Edit/Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                            {editingGrupo?.id ? 'Editar Grupo' : 'Novo Grupo'}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Grupo</label>
                                <input
                                    type="text"
                                    value={editingGrupo?.nome || ''}
                                    onChange={e => setEditingGrupo(prev => ({ ...prev!, nome: e.target.value }))}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Superintendente</label>
                                <select
                                    value={editingGrupo?.superintendente_id || ''}
                                    onChange={e => setEditingGrupo(prev => ({ ...prev!, superintendente_id: e.target.value || null }))}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                                >
                                    <option value="">Selecione...</option>
                                    {membros.map(m => (
                                        <option key={m.id} value={m.id}>{m.nome_completo}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ajudante</label>
                                <select
                                    value={editingGrupo?.ajudante_id || ''}
                                    onChange={e => setEditingGrupo(prev => ({ ...prev!, ajudante_id: e.target.value || null }))}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                                >
                                    <option value="">Selecione...</option>
                                    {membros.map(m => (
                                        <option key={m.id} value={m.id}>{m.nome_completo}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Members Modal */}
            {viewingMembersGrupo && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Membros do {viewingMembersGrupo.nome}
                            </h2>
                            <button
                                onClick={() => setViewingMembersGrupo(null)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-2">
                            {membros.filter(m => m.grupo_id === viewingMembersGrupo.id).length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">Nenhum membro neste grupo.</p>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {membros
                                        .filter(m => m.grupo_id === viewingMembersGrupo.id)
                                        .sort((a, b) => {
                                            // 1. Superintendent
                                            if (a.id === viewingMembersGrupo.superintendente_id) return -1
                                            if (b.id === viewingMembersGrupo.superintendente_id) return 1

                                            // 2. Assistant
                                            if (a.id === viewingMembersGrupo.ajudante_id) return -1
                                            if (b.id === viewingMembersGrupo.ajudante_id) return 1

                                            // 3. Alphabetical
                                            return a.nome_completo.localeCompare(b.nome_completo)
                                        })
                                        .map(membro => (
                                            <div key={membro.id} className="py-3 flex justify-between items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        {membro.nome_completo}
                                                    </span>
                                                    {membro.id === viewingMembersGrupo.superintendente_id && (
                                                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-200">
                                                            Superintendente
                                                        </span>
                                                    )}
                                                    {membro.id === viewingMembersGrupo.ajudante_id && (
                                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full dark:bg-green-900 dark:text-green-200">
                                                            Ajudante
                                                        </span>
                                                    )}
                                                </div>
                                                <select
                                                    value={membro.grupo_id || ''}
                                                    onChange={(e) => handleUpdateMemberGroup(membro.id, e.target.value || null)}
                                                    className="p-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[150px]"
                                                >
                                                    {grupos.map(g => (
                                                        <option key={g.id} value={g.id}>{g.nome}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">Adicionar Membro ao Grupo</h3>
                            <div className="flex gap-2">
                                <select
                                    className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleUpdateMemberGroup(e.target.value, viewingMembersGrupo.id)
                                            e.target.value = '' // Reset select
                                        }
                                    }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Selecione um membro para adicionar...</option>
                                    {membros
                                        .filter(m => m.grupo_id !== viewingMembersGrupo.id)
                                        .map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.nome_completo} ({grupos.find(g => g.id === m.grupo_id)?.nome || 'Sem Grupo'})
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end mt-6">
                            <button
                                onClick={() => setViewingMembersGrupo(null)}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
