'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'

type Membro = Database['public']['Tables']['membros']['Row']

export default function CampoEditorPage({ params }: { params: Promise<{ date: string }> }) {
    const { date } = use(params)
    const router = useRouter()
    const dateParam = date === 'nova' ? new Date().toISOString().split('T')[0] : date

    const [selectedDate, setSelectedDate] = useState(dateParam)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [dirigentes, setDirigentes] = useState<Membro[]>([])
    const [selectedDirigenteId, setSelectedDirigenteId] = useState<string | null>(null)
    const [currentEscalaId, setCurrentEscalaId] = useState<string | null>(null)

    useEffect(() => {
        fetchDirigentes()
    }, [])

    useEffect(() => {
        if (selectedDate && date !== 'nova') {
            fetchEscala(selectedDate)
        }
    }, [selectedDate])

    const fetchDirigentes = async () => {
        try {
            const { data, error } = await supabase
                .from('membros')
                .select('*')
                .or('is_anciao.eq.true,is_servo_ministerial.eq.true')
                .order('nome_completo')

            if (error) throw error
            setDirigentes(data || [])
        } catch (error) {
            console.error('Erro ao carregar dirigentes:', error)
            alert('Erro ao carregar lista de dirigentes.')
        }
    }

    const fetchEscala = async (dateStr: string) => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('escalas_campo')
                .select('*')
                .eq('data', dateStr)
                .maybeSingle()

            if (error) throw error

            if (data) {
                setCurrentEscalaId(data.id)
                setSelectedDirigenteId(data.dirigente_id)
            } else {
                setCurrentEscalaId(null)
                setSelectedDirigenteId(null)
            }
        } catch (error) {
            console.error('Erro ao carregar escala:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!selectedDate) {
            alert('Selecione uma data.')
            return
        }
        if (!selectedDirigenteId) {
            alert('Selecione um dirigente.')
            return
        }

        setSaving(true)
        try {
            if (currentEscalaId) {
                const { error } = await supabase
                    .from('escalas_campo')
                    .update({
                        data: selectedDate,
                        dirigente_id: selectedDirigenteId,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', currentEscalaId)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('escalas_campo')
                    .insert({
                        data: selectedDate,
                        dirigente_id: selectedDirigenteId
                    })
                if (error) throw error
            }

            alert('Escala salva com sucesso!')
            router.push('/admin/campo')
        } catch (error: any) {
            console.error('Erro ao salvar:', error)
            alert('Erro ao salvar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!currentEscalaId || !confirm('Tem certeza que deseja excluir esta escala?')) return

        try {
            const { error } = await supabase
                .from('escalas_campo')
                .delete()
                .eq('id', currentEscalaId)

            if (error) throw error
            router.push('/admin/campo')
        } catch (error: any) {
            console.error('Erro ao excluir:', error)
            alert('Erro ao excluir: ' + error.message)
        }
    }

    if (loading && date !== 'nova') return <div className="p-8">Carregando...</div>

    return (
        <div className="max-w-2xl mx-auto p-8">
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => router.back()}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    ← Voltar
                </button>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {date === 'nova' ? 'Nova Escala de Campo' : 'Editar Escala de Campo'}
                </h1>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Data
                    </label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        disabled={date !== 'nova'}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Dirigente
                    </label>
                    <select
                        value={selectedDirigenteId || ''}
                        onChange={(e) => setSelectedDirigenteId(e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        <option value="">Selecione um dirigente...</option>
                        {dirigentes.map(d => (
                            <option key={d.id} value={d.id}>
                                {d.nome_completo} {d.is_anciao ? '(Ancião)' : '(Servo Ministerial)'}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex justify-between pt-4">
                    {currentEscalaId ? (
                        <button
                            onClick={handleDelete}
                            className="px-4 py-2 text-red-600 hover:text-red-800 font-medium"
                        >
                            Excluir
                        </button>
                    ) : <div></div>}

                    <div className="flex gap-3">
                        <button
                            onClick={() => router.back()}
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
        </div>
    )
}
