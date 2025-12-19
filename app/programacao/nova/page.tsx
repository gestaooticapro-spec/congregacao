'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

type TipoParte = 'TESOUROS' | 'MINISTERIO' | 'VIDA_CRISTA'

interface Parte {
    id: string // Temporary ID for UI handling
    tipo: TipoParte
    nome: string
    tempo: number
}

export default function NovaProgramacaoPage() {
    const router = useRouter()
    const [saving, setSaving] = useState(false)

    // Basic Info
    const [dataReuniao, setDataReuniao] = useState('')
    const [semanaDescricao, setSemanaDescricao] = useState('')
    const [temaTesouros, setTemaTesouros] = useState('')



    // Parts
    const [partes, setPartes] = useState<Parte[]>([
        // Default structure
        { id: '1', tipo: 'TESOUROS', nome: 'Discurso', tempo: 10 },
        { id: '2', tipo: 'TESOUROS', nome: 'Joias Espirituais', tempo: 10 },
        { id: '3', tipo: 'TESOUROS', nome: 'Leitura da Bíblia', tempo: 4 },
        { id: '4', tipo: 'MINISTERIO', nome: 'Iniciando Conversas', tempo: 3 },
        { id: '5', tipo: 'VIDA_CRISTA', nome: 'Estudo Bíblico de Congregação', tempo: 30 },
    ])

    const addParte = (tipo: TipoParte) => {
        const newParte: Parte = {
            id: Math.random().toString(36).substr(2, 9),
            tipo,
            nome: '',
            tempo: 0
        }
        setPartes([...partes, newParte])
    }

    const removeParte = (id: string) => {
        setPartes(partes.filter(p => p.id !== id))
    }

    const updateParte = (id: string, field: keyof Parte, value: string | number) => {
        setPartes(partes.map(p => {
            if (p.id === id) {
                return { ...p, [field]: value }
            }
            return p
        }))
    }

    const handleSalvar = async () => {
        if (!dataReuniao) {
            alert('Data da reunião é obrigatória')
            return
        }
        if (!semanaDescricao) {
            alert('Descrição da semana é obrigatória')
            return
        }

        setSaving(true)
        try {
            // Check for existing
            const { data: existing } = await supabase
                .from('programacao_semanal')
                .select('id')
                .eq('data_reuniao', dataReuniao)
                .single()

            if (existing) {
                alert('Já existe uma programação para esta data. Por favor, exclua a anterior antes de criar uma nova.')
                setSaving(false)
                return
            }



            // Clean parts for storage (remove temp ID)
            const partesParaSalvar = partes.map(({ tipo, nome, tempo }) => ({
                tipo,
                nome,
                tempo
            }))

            const { error } = await supabase
                .from('programacao_semanal')
                .insert({
                    data_reuniao: dataReuniao,
                    semana_descricao: semanaDescricao,
                    temas_tesouros: temaTesouros,
                    partes: partesParaSalvar
                })

            if (error) throw error

            alert('Programação salva com sucesso!')
            router.push('/admin/programacao') // Assuming this route exists or will exist
        } catch (error: any) {
            console.error(error)
            alert('Erro ao salvar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const renderSection = (title: string, tipo: TipoParte, colorClass: string) => {
        const sectionPartes = partes.filter(p => p.tipo === tipo)

        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-lg font-semibold ${colorClass}`}>{title}</h3>
                    <button
                        onClick={() => addParte(tipo)}
                        className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                        + Adicionar Parte
                    </button>
                </div>
                <div className="space-y-3">
                    {sectionPartes.map((parte) => (
                        <div key={parte.id} className="flex gap-4 items-center">
                            <input
                                type="text"
                                placeholder="Nome da Parte"
                                value={parte.nome}
                                onChange={(e) => updateParte(parte.id, 'nome', e.target.value)}
                                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded bg-transparent"
                            />
                            <div className="w-24">
                                <input
                                    type="number"
                                    placeholder="Min"
                                    value={parte.tempo}
                                    onChange={(e) => updateParte(parte.id, 'tempo', parseInt(e.target.value) || 0)}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-transparent text-center"
                                />
                            </div>
                            <button
                                onClick={() => removeParte(parte.id)}
                                className="text-red-500 hover:text-red-700 p-2"
                                title="Remover"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    {sectionPartes.length === 0 && (
                        <p className="text-gray-500 text-sm italic text-center py-2">Nenhuma parte adicionada.</p>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-8 pb-24">
            <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
                Nova Programação (Manual)
            </h1>

            {/* Basic Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Informações Gerais</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
                        <input
                            type="date"
                            value={dataReuniao}
                            onChange={(e) => setDataReuniao(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semana (Descrição)</label>
                        <input
                            type="text"
                            placeholder="Ex: Romanos 1-2"
                            value={semanaDescricao}
                            onChange={(e) => setSemanaDescricao(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-transparent"
                        />
                    </div>
                </div>
            </div>

            {/* Treasures Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-600 dark:text-gray-300">Tesouros da Palavra de Deus</h2>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tema do Tesouros</label>
                    <input
                        type="text"
                        placeholder="Ex: Paulo queria ir para Roma"
                        value={temaTesouros}
                        onChange={(e) => setTemaTesouros(e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-transparent"
                    />
                </div>

                {renderSection('Partes do Tesouros', 'TESOUROS', 'text-gray-600')}
            </div>

            {/* Ministry Section */}
            {renderSection('Faça Seu Melhor no Ministério', 'MINISTERIO', 'text-yellow-600')}

            {/* Living as Christians Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 text-red-600">Nossa Vida Cristã</h2>
                {renderSection('Partes da Vida Cristã', 'VIDA_CRISTA', 'text-red-600')}
            </div>



            {/* Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-4 max-w-4xl mx-auto">
                <button
                    onClick={() => router.back()}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSalvar}
                    disabled={saving}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium shadow-sm"
                >
                    {saving ? 'Salvando...' : 'Salvar Programação'}
                </button>
            </div>
        </div>
    )
}
