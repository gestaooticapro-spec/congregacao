'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Typed client for new table not yet in generated types
const db = supabase as any

interface PautaItem {
    id: string
    assunto: string
    detalhes: string | null
    sugerido_por: string
    na_pauta: boolean
    arquivado: boolean
    created_at: string
}

interface Anciao {
    id: string
    nome_completo: string
    nome_civil: string | null
}

export default function PautaAnciaosPage() {
    const [loading, setLoading] = useState(true)
    const [items, setItems] = useState<PautaItem[]>([])
    const [anciaos, setAnciaos] = useState<Anciao[]>([])
    const [showArchived, setShowArchived] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formOpen, setFormOpen] = useState(false)
    const [formData, setFormData] = useState({
        assunto: '',
        detalhes: '',
        sugerido_por: ''
    })
    const [message, setMessage] = useState('')

    useEffect(() => {
        fetchAnciaos()
    }, [])

    useEffect(() => {
        fetchItems()
    }, [showArchived])

    const fetchAnciaos = async () => {
        try {
            const { data, error } = await supabase
                .from('membros')
                .select('id, nome_completo, nome_civil')
                .eq('is_anciao', true)
                .order('nome_completo')

            if (error) {
                console.error('Error fetching elders:', error.message, error.details, error.hint)
                return
            }
            setAnciaos(data || [])
        } catch (error: any) {
            console.error('Error fetching elders:', error?.message || error)
        }
    }

    const fetchItems = async () => {
        try {
            let query = db
                .from('pauta_anciaos')
                .select('*')
                .order('created_at', { ascending: false })

            if (!showArchived) {
                query = query.eq('arquivado', false)
            }

            const { data, error } = await query

            if (error) throw error
            setItems(data || [])
        } catch (error) {
            console.error('Error fetching items:', error)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setFormData({
            assunto: '',
            detalhes: '',
            sugerido_por: ''
        })
        setEditingId(null)
    }

    const handleEdit = (item: PautaItem) => {
        setEditingId(item.id)
        setFormData({
            assunto: item.assunto,
            detalhes: item.detalhes || '',
            sugerido_por: item.sugerido_por
        })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        try {
            if (editingId) {
                const { error } = await db
                    .from('pauta_anciaos')
                    .update(formData)
                    .eq('id', editingId)

                if (error) throw error
                setMessage('Item atualizado com sucesso!')
            } else {
                const { error } = await db
                    .from('pauta_anciaos')
                    .insert([formData])

                if (error) throw error
                setMessage('Sugestão adicionada com sucesso!')
            }

            resetForm()
            fetchItems()
        } catch (error: any) {
            console.error('Error saving item:', error)
            setMessage(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`)
        } finally {
            setLoading(false)
        }
    }

    const toggleNaPauta = async (id: string, currentValue: boolean) => {
        try {
            const { error } = await db
                .from('pauta_anciaos')
                .update({ na_pauta: !currentValue })
                .eq('id', id)

            if (error) throw error
            fetchItems()
        } catch (error) {
            console.error('Error updating item:', error)
        }
    }

    const toggleArchived = async (id: string, currentValue: boolean) => {
        try {
            const { error } = await db
                .from('pauta_anciaos')
                .update({ arquivado: !currentValue })
                .eq('id', id)

            if (error) throw error
            fetchItems()
        } catch (error) {
            console.error('Error archiving item:', error)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este item?')) return

        try {
            const { error } = await db
                .from('pauta_anciaos')
                .delete()
                .eq('id', id)

            if (error) throw error
            if (editingId === id) resetForm()
            fetchItems()
        } catch (error) {
            console.error('Error deleting item:', error)
            alert('Erro ao excluir item.')
        }
    }

    // Separate items by status
    const itemsNaPauta = items.filter(i => i.na_pauta && !i.arquivado)
    const itemsSugeridos = items.filter(i => !i.na_pauta && !i.arquivado)
    const itemsArquivados = items.filter(i => i.arquivado)

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
                📋 Pauta de Reunião de Anciãos
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
                Sugestões de assuntos para as reuniões trimestrais. Qualquer ancião pode adicionar sugestões.
            </p>

            {/* Collapsible Form */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-8 overflow-hidden">
                <button
                    type="button"
                    onClick={() => {
                        setFormOpen(!formOpen)
                        if (!formOpen && !editingId) {
                            resetForm()
                        }
                    }}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        {editingId ? '✏️ Editar Sugestão' : '➕ Nova Sugestão'}
                    </h2>
                    <svg
                        className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${formOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {(formOpen || editingId) && (
                    <div className="p-6 pt-2 border-t border-slate-100 dark:border-slate-700">
                        {editingId && (
                            <div className="flex justify-end mb-4">
                                <button
                                    type="button"
                                    onClick={() => { resetForm(); setFormOpen(false); }}
                                    className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                >
                                    Cancelar Edição
                                </button>
                            </div>
                        )}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Assunto *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.assunto}
                                        onChange={e => setFormData({ ...formData, assunto: e.target.value })}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
                                        placeholder="Ex: Revisar escala de som"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Detalhes (opcional)
                                    </label>
                                    <textarea
                                        value={formData.detalhes}
                                        onChange={e => setFormData({ ...formData, detalhes: e.target.value })}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
                                        rows={2}
                                        placeholder="Mais informações sobre o assunto..."
                                    />
                                </div>
                                <div className="relative">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Sugerido por *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.sugerido_por}
                                        onChange={e => setFormData({ ...formData, sugerido_por: e.target.value })}
                                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
                                        placeholder="Digite para buscar..."
                                    />
                                    {formData.sugerido_por && anciaos.filter(a => {
                                        const search = formData.sugerido_por.toLowerCase()
                                        return (a.nome_completo.toLowerCase().includes(search) ||
                                            (a.nome_civil?.toLowerCase().includes(search) ?? false)) &&
                                            a.nome_completo !== formData.sugerido_por
                                    }).length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {anciaos
                                                    .filter(a => {
                                                        const search = formData.sugerido_por.toLowerCase()
                                                        return a.nome_completo.toLowerCase().includes(search) ||
                                                            (a.nome_civil?.toLowerCase().includes(search) ?? false)
                                                    })
                                                    .map(anciao => (
                                                        <button
                                                            key={anciao.id}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, sugerido_por: anciao.nome_completo })}
                                                            className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white"
                                                        >
                                                            {anciao.nome_completo}
                                                            {anciao.nome_civil && anciao.nome_civil !== anciao.nome_completo && (
                                                                <span className="text-xs text-slate-500 ml-2">({anciao.nome_civil})</span>
                                                            )}
                                                        </button>
                                                    ))
                                                }
                                            </div>
                                        )}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Salvando...' : (editingId ? 'Atualizar' : 'Adicionar Sugestão')}
                                </button>
                                {message && (
                                    <span className={`text-sm ${message.includes('Erro') ? 'text-red-500' : 'text-green-500'}`}>
                                        {message}
                                    </span>
                                )}
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Items on Agenda */}
            {itemsNaPauta.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        ✅ Na Pauta ({itemsNaPauta.length})
                    </h2>
                    <div className="space-y-3">
                        {itemsNaPauta.map(item => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                onEdit={handleEdit}
                                onTogglePauta={toggleNaPauta}
                                onToggleArchived={toggleArchived}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Suggested Items */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    💡 Sugestões ({itemsSugeridos.length})
                </h2>
                {itemsSugeridos.length === 0 ? (
                    <p className="text-slate-500 dark:text-slate-400 text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        Nenhuma sugestão ainda. Seja o primeiro a adicionar!
                    </p>
                ) : (
                    <div className="space-y-3">
                        {itemsSugeridos.map(item => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                onEdit={handleEdit}
                                onTogglePauta={toggleNaPauta}
                                onToggleArchived={toggleArchived}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Toggle Archived */}
            <div className="flex items-center justify-center mb-4">
                <button
                    onClick={() => setShowArchived(!showArchived)}
                    className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-2"
                >
                    📦 {showArchived ? 'Ocultar Arquivados' : `Ver Arquivados (${itemsArquivados.length})`}
                </button>
            </div>

            {/* Archived Items */}
            {showArchived && itemsArquivados.length > 0 && (
                <div className="opacity-60">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        📦 Arquivados ({itemsArquivados.length})
                    </h2>
                    <div className="space-y-3">
                        {itemsArquivados.map(item => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                onEdit={handleEdit}
                                onTogglePauta={toggleNaPauta}
                                onToggleArchived={toggleArchived}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// Item Card Component
function ItemCard({
    item,
    onEdit,
    onTogglePauta,
    onToggleArchived,
    onDelete
}: {
    item: PautaItem
    onEdit: (item: PautaItem) => void
    onTogglePauta: (id: string, value: boolean) => void
    onToggleArchived: (id: string, value: boolean) => void
    onDelete: (id: string) => void
}) {
    return (
        <div className={`
            bg-white dark:bg-slate-800 p-4 rounded-xl border shadow-sm transition-all
            ${item.na_pauta
                ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10'
                : 'border-slate-200 dark:border-slate-700'}
        `}>
            <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                    onClick={() => onTogglePauta(item.id, item.na_pauta)}
                    className={`
                        mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0
                        ${item.na_pauta
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-slate-300 dark:border-slate-600 hover:border-green-400'}
                    `}
                    title={item.na_pauta ? 'Remover da pauta' : 'Adicionar à pauta'}
                >
                    {item.na_pauta && (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h3 className={`font-medium text-slate-900 dark:text-white ${item.na_pauta ? 'line-through opacity-70' : ''}`}>
                        {item.assunto}
                    </h3>
                    {item.detalhes && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {item.detalhes}
                        </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span>👤 {item.sugerido_por}</span>
                        <span>📅 {format(new Date(item.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => onEdit(item)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="Editar"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => onToggleArchived(item.id, item.arquivado)}
                        className="p-1.5 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 rounded transition-colors"
                        title={item.arquivado ? 'Desarquivar' : 'Arquivar'}
                    >
                        📦
                    </button>
                    <button
                        onClick={() => onDelete(item.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Excluir"
                    >
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    )
}
