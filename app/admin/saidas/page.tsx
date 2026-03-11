'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSaidas, createSaida, updateSaida, deleteSaida, Saida } from '@/app/actions/saidas.actions'

const DIAS_DA_SEMANA = [
    { nome: 'Segunda', ordem: 1 },
    { nome: 'Terça', ordem: 2 },
    { nome: 'Quarta', ordem: 3 },
    { nome: 'Quinta', ordem: 4 },
    { nome: 'Sexta', ordem: 5 },
    { nome: 'Sábado', ordem: 6 },
    { nome: 'Domingo', ordem: 7 },
]

export default function AdminSaidasPage() {
    const router = useRouter()
    const [saidas, setSaidas] = useState<Saida[]>([])
    const [loading, setLoading] = useState(true)

    const [isEditing, setIsEditing] = useState(false)
    const [currentId, setCurrentId] = useState<string | null>(null)
    const [formData, setFormData] = useState({ dia: 'Segunda', hora: '08:00', local: 'Salão', obs: '', ordem: 1 })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        const { data, error } = await getSaidas()
        if (error) {
            alert(error)
        } else {
            setSaidas(data || [])
        }
        setLoading(false)
    }

    const resetForm = () => {
        setIsEditing(false)
        setCurrentId(null)
        setFormData({ dia: 'Segunda', hora: '08:00', local: 'Salão', obs: '', ordem: 1 })
    }

    const handleEdit = (saida: Saida) => {
        setIsEditing(true)
        setCurrentId(saida.id)
        setFormData({
            dia: saida.dia,
            hora: saida.hora,
            local: saida.local,
            obs: saida.obs || '',
            ordem: saida.ordem
        })
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja realmente excluir este horário?')) return
        const { error } = await deleteSaida(id)
        if (error) {
            alert(error)
        } else {
            loadData()
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        // Find the correct ordem for the selected day
        const selectedDia = DIAS_DA_SEMANA.find(d => d.nome === formData.dia)
        const dataToSave = { ...formData, ordem: selectedDia?.ordem || 1 }

        if (isEditing && currentId) {
            const { error } = await updateSaida(currentId, dataToSave)
            if (error) alert(error)
            else {
                resetForm()
                loadData()
            }
        } else {
            const { error } = await createSaida(dataToSave)
            if (error) alert(error)
            else {
                resetForm()
                loadData()
            }
        }
        setSaving(false)
    }

    if (loading) return <div className="p-8">Carregando horários...</div>

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Gerenciar Horários de Campo</h1>
                    <p className="text-slate-500 text-sm mt-1">Adicione, edite ou remova horários fixos de campo.</p>
                </div>
                <button
                    onClick={() => router.push('/saidas')}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                    Voltar
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* FORM */}
                <div className="md:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-6 h-fit">
                    <h2 className="text-lg font-bold mb-4 text-slate-800 dark:text-white">{isEditing ? 'Editar Horário' : 'Novo Horário'}</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-600 dark:text-slate-400">Dia da Semana</label>
                            <select
                                value={formData.dia}
                                onChange={(e) => setFormData({ ...formData, dia: e.target.value })}
                                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                            >
                                {DIAS_DA_SEMANA.map(d => (
                                    <option key={d.ordem} value={d.nome}>{d.nome}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-600 dark:text-slate-400">Horário</label>
                            <input
                                type="time"
                                required
                                value={formData.hora}
                                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-600 dark:text-slate-400">Local</label>
                            <input
                                type="text"
                                required
                                placeholder="Ex: Salão, Zoom"
                                value={formData.local}
                                onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-600 dark:text-slate-400">Observação (Opcional)</label>
                            <textarea
                                placeholder="Detalhes, grupos responsáveis, etc."
                                value={formData.obs}
                                onChange={(e) => setFormData({ ...formData, obs: e.target.value })}
                                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg py-2.5 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* TABLE LIST */}
                <div className="md:col-span-2">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[500px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm border-b border-slate-100 dark:border-slate-800">
                                        <th className="py-3 px-4 font-bold">Dia</th>
                                        <th className="py-3 px-4 font-bold">Hora</th>
                                        <th className="py-3 px-4 font-bold">Local</th>
                                        <th className="py-3 px-4 font-bold text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {saidas.map((saida) => (
                                        <tr key={saida.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">{saida.dia}</td>
                                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{saida.hora}</td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${saida.local.toLowerCase() === 'zoom'
                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                    }`}>
                                                    {saida.local}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <button
                                                    onClick={() => handleEdit(saida)}
                                                    className="text-blue-500 hover:text-blue-700 p-1 mx-1"
                                                    title="Editar"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(saida.id)}
                                                    className="text-red-500 hover:text-red-700 p-1 mx-1"
                                                    title="Excluir"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {saidas.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-slate-500">Nenhum horário cadastrado.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
