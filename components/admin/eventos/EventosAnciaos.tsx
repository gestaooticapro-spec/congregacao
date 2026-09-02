'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Pencil, Trash2 } from 'lucide-react'

const INITIAL_PAST = 3
const LOAD_MORE = 5

function eventEndDate(event: { data_inicio: string; data_fim?: string | null }) {
    return event.data_fim || event.data_inicio
}

export default function EventosAnciaos() {
    const [loading, setLoading] = useState(true)
    const [events, setEvents] = useState<any[]>([])
    const [extraPast, setExtraPast] = useState(0)
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
            setExtraPast(0)
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

    const { visibleEvents, hasMorePast } = useMemo(() => {
        const today = format(new Date(), 'yyyy-MM-dd')
        const byDesc = (a: any, b: any) => eventEndDate(b).localeCompare(eventEndDate(a))
        const upcoming = events.filter(event => eventEndDate(event) >= today).sort(byDesc)
        const past = events.filter(event => eventEndDate(event) < today).sort(byDesc)
        const pastLimit = INITIAL_PAST + extraPast
        return {
            visibleEvents: [...upcoming, ...past.slice(0, pastLimit)],
            hasMorePast: past.length > pastLimit,
        }
    }, [events, extraPast])

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
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-w-0">
                <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Compromissos Cadastrados</h2>
                </div>
                <div className="w-full min-w-0 overflow-x-clip">
                    <table className="w-full max-w-full table-fixed text-left text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white font-semibold">
                            <tr>
                                <th className="p-2 sm:p-4 w-[28%] sm:w-[22%]">Data</th>
                                <th className="p-2 sm:p-4">Título</th>
                                <th className="p-2 sm:p-4 w-[18%] hidden sm:table-cell">Tipo</th>
                                <th className="p-2 sm:p-4 w-[22%] sm:w-[18%] text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {visibleEvents.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-500">
                                        Nenhum compromisso cadastrado.
                                    </td>
                                </tr>
                            ) : (
                                visibleEvents.map(event => (
                                    <tr key={event.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="p-2 sm:p-4 align-top">
                                            <div className="leading-tight break-words">
                                                {format(new Date(event.data_inicio + 'T12:00:00'), "dd/MM/yy", { locale: ptBR })}
                                                {event.data_fim && event.data_fim !== event.data_inicio && (
                                                    <> – {format(new Date(event.data_fim + 'T12:00:00'), "dd/MM/yy", { locale: ptBR })}</>
                                                )}
                                            </div>
                                            {event.hora_inicio && (
                                                <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                                                    {event.hora_inicio.substring(0, 5)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-2 sm:p-4 font-medium text-slate-900 dark:text-white align-top break-words leading-tight">
                                            {event.titulo}
                                            <span className={`sm:hidden mt-1 block w-fit px-2 py-0.5 rounded-full text-[10px] font-medium capitalize
                                                ${event.tipo === 'reuniao' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                    event.tipo === 'anuncio' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                                }
                                            `}>
                                                {event.tipo}
                                            </span>
                                        </td>
                                        <td className="p-2 sm:p-4 capitalize hidden sm:table-cell align-top">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium
                                                ${event.tipo === 'reuniao' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                    event.tipo === 'anuncio' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                                }
                                            `}>
                                                {event.tipo}
                                            </span>
                                        </td>
                                        <td className="p-2 sm:p-4 text-right align-top">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(event)}
                                                    className="p-1 text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(event.id)}
                                                    className="p-1 text-red-600 hover:text-red-800 dark:hover:text-red-400 transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {hasMorePast && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-center">
                        <button
                            type="button"
                            onClick={() => setExtraPast(count => count + LOAD_MORE)}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                            Carregar mais 5 eventos
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
