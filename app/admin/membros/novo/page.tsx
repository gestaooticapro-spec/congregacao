'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'

type MembroInsert = Database['public']['Tables']['membros']['Insert']

export default function NovoMembroPage() {
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState<MembroInsert>({
        nome_completo: '',
        is_anciao: false,
        is_servo_ministerial: false,
        is_pioneiro: false,
        is_publicador: true, // Default true?
        is_batizado: true, // Default true?
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
    }, [])

    const fetchGrupos = async () => {
        const { data } = await supabase.from('grupos_servico').select('*').order('nome')
        setGrupos(data || [])
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
                .insert(formData)

            if (error) throw error

            alert('Membro criado com sucesso!')
            router.push('/admin/membros')
        } catch (error: any) {
            console.error(error)
            alert('Erro ao criar membro: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Novo Membro</h1>
                <div className="h-1 w-20 bg-primary mx-auto rounded-full"></div>
            </div>

            <div className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nome Completo</label>
                            <input
                                type="text"
                                value={formData.nome_completo}
                                onChange={(e) => handleChange('nome_completo', e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                                placeholder="Ex: João Silva"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Grupo de Serviço</label>
                            <select
                                value={formData.grupo_id || ''}
                                onChange={(e) => handleChange('grupo_id', e.target.value || null)}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                            >
                                <option value="">Nenhum</option>
                                {grupos.map(g => (
                                    <option key={g.id} value={g.id}>{g.nome}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="text-primary">🏅</span> Qualificações
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { id: 'is_anciao', label: 'Ancião' },
                                { id: 'is_servo_ministerial', label: 'Servo Ministerial' },
                                { id: 'is_pioneiro', label: 'Pioneiro' },
                                { id: 'is_publicador', label: 'Publicador' },
                                { id: 'is_batizado', label: 'Batizado' },
                            ].map((item) => (
                                <label key={item.id} className="flex items-center space-x-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer group">
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
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <span className="text-primary">📋</span> Designações Possíveis
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { id: 'is_presidente', label: 'Presidente' },
                            { id: 'is_leitor_biblia', label: 'Leitor da Bíblia' },
                            { id: 'is_leitor_sentinela', label: 'Leitor de A Sentinela' },
                            { id: 'is_som', label: 'Som' },
                            { id: 'is_microfone', label: 'Microfone' },
                            { id: 'is_indicador', label: 'Indicador' },
                            { id: 'is_balcao', label: 'Balcão' },
                            { id: 'is_leitor_estudo_biblico', label: 'Leitor do Estudo Bíblico' },
                            { id: 'is_parte_vida_ministerio', label: 'Partes Vida e Ministério' },
                            { id: 'is_ajudante', label: 'Ajudante' },
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

                <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8">
                    <button
                        onClick={() => router.back()}
                        className="px-8 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                    >
                        Cancelar
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
                            'Salvar Membro'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
