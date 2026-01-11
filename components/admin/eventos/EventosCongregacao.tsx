'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function EventosCongregacao() {
    const [loading, setLoading] = useState(true)
    const [events, setEvents] = useState<any[]>([])
    const [formData, setFormData] = useState({
        titulo: '',
        tipo: 'assembleia',
        data_inicio: '',
        data_fim: '',
        descricao: ''
    })
    const [message, setMessage] = useState('')

    useEffect(() => {
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        try {
            const { data, error } = await supabase
                .from('eventos')
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        const finalDataFim = formData.data_fim || formData.data_inicio

        try {
            const { error } = await supabase
                .from('eventos')
                .insert([{
                    ...formData,
                    data_fim: finalDataFim
                }] as any)

            if (error) throw error

            setMessage('Evento criado com sucesso!')
            setFormData({
                titulo: '',
                tipo: 'assembleia',
                data_inicio: '',
                data_fim: '',
                descricao: ''
            })
            fetchEvents()
        } catch (error: any) {
            console.error('Error creating event:', error)
            setMessage(`Erro ao criar evento: ${error.message || 'Erro desconhecido'}`)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este evento?')) return

        try {
            const { error } = await supabase
                .from('eventos')
                .delete()
                .eq('id', id)

            if (error) throw error
            fetchEvents()
        } catch (error) {
            console.error('Error deleting event:', error)
            alert('Erro ao excluir evento.')
        }
    }

    return (
        <div>
            {/* Form */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
                <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Novo Evento (Congregação)</h2>
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
                                placeholder="Ex: Visita do Superintendente"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
                            <select
                                value={formData.tipo}
                                onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent dark:text-white dark:bg-slate-800"
                            >
                                <option value="assembleia">Assembleia</option>
                                <option value="congresso">Congresso</option>
                                <option value="especial">Especial</option>
                                <option value="limpeza">Limpeza</option>
                                <option value="visita">Visita</option>
                            </select>
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
                            {loading ? 'Salvando...' : 'Salvar Evento'}
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
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Eventos Cadastrados</h2>
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
                                        Nenhum evento cadastrado.
                                    </td>
                                </tr>
                            ) : (
                                events.map(event => (
                                    <tr key={event.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="p-4 whitespace-nowrap">
                                            {format(new Date(event.data_inicio + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                                            {event.data_fim && event.data_fim !== event.data_inicio && (
                                                <> - {format(new Date(event.data_fim + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}</>
                                            )}
                                        </td>
                                        <td className="p-4 font-medium text-slate-900 dark:text-white">
                                            {event.titulo}
                                        </td>
                                        <td className="p-4 capitalize">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium
                                                ${event.tipo === 'assembleia' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                    event.tipo === 'congresso' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        event.tipo === 'limpeza' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                            event.tipo === 'visita' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' :
                                                                'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                }
                                            `}>
                                                {event.tipo}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleDelete(event.id)}
                                                className="text-red-600 hover:text-red-800 dark:hover:text-red-400 transition-colors"
                                            >
                                                Excluir
                                            </button>
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
