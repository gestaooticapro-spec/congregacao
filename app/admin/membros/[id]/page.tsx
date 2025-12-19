'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'

type MembroInsert = Database['public']['Tables']['membros']['Insert']

export default function EditarMembroPage() {
    const router = useRouter()
    const params = useParams()
    const id = params.id as string

    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)
    const [formData, setFormData] = useState<MembroInsert>({
        nome_completo: '',
        is_anciao: false,
        is_servo_ministerial: false,
        is_pioneiro: false,
        is_publicador: true,
        is_batizado: true,
        is_presidente: false,
        is_leitor_biblia: false,
        is_leitor_sentinela: false,
        is_som: false,
        is_microfone: false,
        is_indicador: false,
        is_balcao: false,
        is_leitor_estudo_biblico: false,
        is_parte_vida_ministerio: false,
        is_ajudante: false
    })

    const [grupos, setGrupos] = useState<Database['public']['Tables']['grupos_servico']['Row'][]>([])

    useEffect(() => {
        fetchGrupos()
        if (id) {
            fetchMembro()
        }
    }, [id])

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
                setFormData({
                    nome_completo: data.nome_completo,
                    grupo_id: data.grupo_id,
                    is_anciao: data.is_anciao,
                    is_servo_ministerial: data.is_servo_ministerial,
                    is_pioneiro: data.is_pioneiro,
                    is_publicador: data.is_publicador,
                    is_batizado: data.is_batizado,
                    is_presidente: data.is_presidente,
                    is_leitor_biblia: data.is_leitor_biblia,
                    is_leitor_sentinela: data.is_leitor_sentinela,
                    is_som: data.is_som,
                    is_microfone: data.is_microfone,
                    is_indicador: data.is_indicador,
                    is_balcao: data.is_balcao,
                    is_leitor_estudo_biblico: data.is_leitor_estudo_biblico,
                    is_parte_vida_ministerio: data.is_parte_vida_ministerio,
                    is_ajudante: data.is_ajudante
                })
            }
        } catch (error) {
            console.error('Erro ao buscar membro:', error)
            alert('Erro ao carregar membro')
            router.push('/admin/membros')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (field: keyof MembroInsert, value: any) => {
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

            alert('Membro atualizado com sucesso!')
            router.push('/admin/membros')
        } catch (error: any) {
            console.error(error)
            alert('Erro ao atualizar membro: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8">Carregando...</div>

    return (
        <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Editar Membro</h1>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Completo</label>
                    <input
                        type="text"
                        value={formData.nome_completo}
                        onChange={(e) => handleChange('nome_completo', e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-transparent"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grupo de Serviço</label>
                    <select
                        value={formData.grupo_id || ''}
                        onChange={(e) => handleChange('grupo_id', e.target.value || null)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        <option value="">Nenhum</option>
                        {grupos.map(g => (
                            <option key={g.id} value={g.id}>{g.nome}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <h3 className="col-span-full text-lg font-medium text-gray-900 dark:text-white border-b pb-2 mt-4">Qualificações</h3>

                    <label className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            checked={formData.is_anciao || false}
                            onChange={(e) => handleChange('is_anciao', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Ancião</span>
                    </label>

                    <label className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            checked={formData.is_servo_ministerial || false}
                            onChange={(e) => handleChange('is_servo_ministerial', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Servo Ministerial</span>
                    </label>

                    <label className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            checked={formData.is_pioneiro || false}
                            onChange={(e) => handleChange('is_pioneiro', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Pioneiro</span>
                    </label>

                    <label className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            checked={formData.is_publicador || false}
                            onChange={(e) => handleChange('is_publicador', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Publicador</span>
                    </label>

                    <label className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            checked={formData.is_batizado || false}
                            onChange={(e) => handleChange('is_batizado', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Batizado</span>
                    </label>

                    <h3 className="col-span-full text-lg font-medium text-gray-900 dark:text-white border-b pb-2 mt-4">Designações Possíveis</h3>

                    <label className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            checked={formData.is_presidente || false}
                            onChange={(e) => handleChange('is_presidente', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Presidente</span>
                    </label>

                    <label className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            checked={formData.is_leitor_biblia || false}
                            onChange={(e) => handleChange('is_leitor_biblia', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Leitor da Bíblia</span>
                    </label>

                    <label className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            checked={formData.is_leitor_sentinela || false}
                            onChange={(e) => handleChange('is_leitor_sentinela', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Leitor de A Sentinela</span>
                    </label>

                    <label className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            checked={formData.is_som || false}
                            onChange={(e) => handleChange('is_som', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Som</span>
                    </label>

                    <label className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            checked={formData.is_microfone || false}
                            onChange={(e) => handleChange('is_microfone', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Microfone</span>
                    </label>

                    <label className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            checked={formData.is_indicador || false}
                            onChange={(e) => handleChange('is_indicador', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Indicador</span>
                    </label>

                    <label className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            checked={formData.is_balcao || false}
                            onChange={(e) => handleChange('is_balcao', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Balcão</span>
                    </label>

                    <label className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            checked={formData.is_leitor_estudo_biblico || false}
                            onChange={(e) => handleChange('is_leitor_estudo_biblico', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Leitor do Estudo Bíblico</span>
                    </label>

                    <label className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            checked={formData.is_parte_vida_ministerio || false}
                            onChange={(e) => handleChange('is_parte_vida_ministerio', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Partes Vida e Ministério</span>
                    </label>

                    <label className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            checked={formData.is_ajudante || false}
                            onChange={(e) => handleChange('is_ajudante', e.target.checked)}
                            className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Ajudante</span>
                    </label>
                </div>

                <div className="flex justify-end gap-4 mt-8">
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium shadow-sm"
                    >
                        {saving ? 'Salvar Alterações' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    )
}
