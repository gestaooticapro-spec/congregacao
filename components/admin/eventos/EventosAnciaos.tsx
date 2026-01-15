'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function EventosAnciaos() {
    const [loading, setLoading] = useState(true)
    const [events, setEvents] = useState<any[]>([])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        titulo: '',
        tipo: 'reuniao',
        data_inicio: '',
        data_fim: '',
        hora_inicio: '',
        descricao: ''
    })
    const [message, setMessage] = useState('')

    useEffect(() => {
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        try {
            const { data, error } = await supabase
                .from('agenda_anciaos')
                .select('*')
                .order('data_inicio', { ascending: true })

            if (error) throw error
            setEvents(data || [])
        } catch (error) {
            console.error('Error fetching events:', error)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setFormData({
            titulo: '',
            tipo: 'reuniao',
            data_inicio: '',
            data_fim: '',
            hora_inicio: '',
            descricao: ''
        })
        setEditingId(null)
    }

    const handleEdit = (event: any) => {
        setEditingId(event.id)
        setFormData({
            titulo: event.titulo || '',
            tipo: event.tipo || 'reuniao',
            data_inicio: event.data_inicio || '',
            data_fim: event.data_fim || '',
            hora_inicio: event.hora_inicio ? event.hora_inicio.substring(0, 5) : '',
            descricao: event.descricao || ''
        })
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        const finalDataFim = formData.data_fim || formData.data_inicio
        const dataToSave = {
            ...formData,
            data_fim: finalDataFim,
            hora_inicio: formData.hora_inicio || null
        }

        try {
            if (editingId) {
                // Update existing event
                const { error } = await supabase
                    .from('agenda_anciaos')
                    .update(dataToSave as any)
                    .eq('id', editingId)

                if (error) throw error
                setMessage('Compromisso atualizado com sucesso!')
            } else {
                // Insert new event
                const { error } = await supabase
                    .from('agenda_anciaos')
                    .insert([dataToSave] as any)

                if (error) throw error
                setMessage('Compromisso criado com sucesso!')
            }

            resetForm()
            fetchEvents()
        } catch (error: any) {
            console.error('Error saving event:', error)
            setMessage(`Erro ao salvar compromisso: ${error.message || 'Erro desconhecido'}`)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este compromisso?')) return

        try {
            const { error } = await supabase
                .from('agenda_anciaos')
                .delete()
                .eq('id', id)

            if (error) throw error
            if (editingId === id) {
                resetForm()
            }
            fetchEvents()
        } catch (error) {
            console.error('Error deleting event:', error)
            alert('Erro ao excluir compromisso.')
        }
    }

    return (
        <div>
            {/* Form */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        {editingId ? 'Editar Compromisso (Anciãos)' : 'Novo Compromisso (Anciãos)'}
                    </h2>
                    {editingId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        >
                            Cancelar Edição
                        </button>
                    )}
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título</label>
                            <input
                                type="text"
                                required
                                value={formData.titulo}
                                onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
                                placeholder="Ex: Reunião com Superintendente"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                            <select
                                value={formData.tipo}
                                onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white dark:bg-slate-800"
                            >
                                <option value="reuniao">Reunião</option>
                                <option value="anuncio">Anúncio</option>
                                <option value="outro">Outro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Hora Início (Opcional)</label>
                            <input
                                type="time"
                                value={formData.hora_inicio}
                                onChange={e => setFormData({ ...formData, hora_inicio: e.target.value })}
                                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data Início</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.data_inicio}
                                    onChange={e => setFormData({ ...formData, data_inicio: e.target.value })}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data Fim</label>
                                <input
                                    type="date"
                                    value={formData.data_fim}
                                    onChange={e => setFormData({ ...formData, data_fim: e.target.value })}
                                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
                                    placeholder="Opcional"
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                        <textarea
                            value={formData.descricao}
                            onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white"
                            rows={3}
                            placeholder="Detalhes adicionais..."
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Salvando...' : (editingId ? 'Atualizar Compromisso' : 'Salvar Compromisso')}
                        </button>
                        {message && (
                            <span className={`text-sm ${message.includes('Erro') ? 'text-red-500' : 'text-green-500'}`}>
                                {message}
                            </span>
                        )}
                    </div>
                </form>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Compromissos Cadastrados</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white font-semibold">
                            <tr>
                                <th className="p-4">Data</th>
                                <th className="p-4">Título</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {events.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-500">
                                        Nenhum compromisso cadastrado.
                                    </td>
                                </tr>
                            ) : (
                                events.map(event => (
                                    <tr key={event.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="p-4 whitespace-nowrap">
                                            <div>
                                                {format(new Date(event.data_inicio + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                                                {event.data_fim && event.data_fim !== event.data_inicio && (
                                                    <> - {format(new Date(event.data_fim + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}</>
                                                )}
                                            </div>
                                            {event.hora_inicio && (
                                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                                    às {event.hora_inicio.substring(0, 5)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 font-medium text-slate-900 dark:text-white">
                                            {event.titulo}
                                        </td>
                                        <td className="p-4 capitalize">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium
                                                ${event.tipo === 'reuniao' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                    event.tipo === 'anuncio' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                                }
                                            `}>
                                                {event.tipo}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => handleEdit(event)}
                                                    className="text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 transition-colors"
                                                    title="Editar"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(event.id)}
                                                    className="text-red-600 hover:text-red-800 dark:hover:text-red-400 transition-colors"
                                                    title="Excluir"
                                                >
                                                    Excluir
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
