'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'
import PageHeader from '@/components/PageHeader'

type Programacao = Database['public']['Tables']['programacao_semanal']['Row']

type TipoParte = 'TESOUROS' | 'MINISTERIO' | 'VIDA_CRISTA'

interface Parte {
    id: string // Temporary ID for UI handling
    tipo: TipoParte
    nome: string
    tempo: number
}

interface ProgramacaoFormProps {
    initialData?: Programacao
    isEditing?: boolean
}

export default function ProgramacaoForm({ initialData, isEditing = false }: ProgramacaoFormProps) {
    const router = useRouter()
    const [saving, setSaving] = useState(false)

    // Basic Info
    const [dataReuniao, setDataReuniao] = useState(initialData?.data_reuniao || '')
    const [semanaDescricao, setSemanaDescricao] = useState(initialData?.semana_descricao || '')
    const [eventoTipo, setEventoTipo] = useState(initialData?.evento_tipo || 'normal')


    // Parts
    const [partes, setPartes] = useState<Parte[]>([])

    useEffect(() => {
        if (initialData?.partes) {
            // If editing, load parts from initialData
            // We need to ensure they have IDs for UI handling
            const loadedPartes = (initialData.partes as any[]).map((p, index) => ({
                ...p,
                id: p.id || Math.random().toString(36).substr(2, 9)
            }))
            setPartes(loadedPartes)
        } else {
            // Default structure for new schedule
            setPartes([
                { id: '1', tipo: 'TESOUROS', nome: '1. Discurso', tempo: 10 },
                { id: '2', tipo: 'TESOUROS', nome: '2. Pérolas Espirituais', tempo: 10 },
                { id: '3', tipo: 'TESOUROS', nome: '3. Leitura da Bíblia', tempo: 4 },
                { id: '4', tipo: 'MINISTERIO', nome: 'Iniciando Conversas', tempo: 3 },
                { id: '5', tipo: 'VIDA_CRISTA', nome: 'Estudo Bíblico de Congregação', tempo: 30 },
            ])
        }
    }, [initialData])

    const handleEventoTipoChange = (novoTipo: string) => {
        setEventoTipo(novoTipo as any);
        if (novoTipo === 'visita spte') {
            setPartes(prev => prev.filter(p => !p.nome.toLowerCase().includes('estudo bíblico')));
        } else if (eventoTipo === 'visita spte' && novoTipo !== 'visita spte') {
            // Se voltar para normal, adiciona o estudo bíblico se não existir
            setPartes(prev => {
                if (!prev.some(p => p.nome.toLowerCase().includes('estudo bíblico'))) {
                    return [...prev, { id: Math.random().toString(36).substr(2, 9), tipo: 'VIDA_CRISTA', nome: 'Estudo Bíblico de Congregação', tempo: 30 }];
                }
                return prev;
            });
        }
    }

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

        const isSemanaObrigatoria = !['assembleia', 'congresso', 'celebração'].includes(eventoTipo);

        if (isSemanaObrigatoria && !semanaDescricao) {
            alert('Descrição da semana é obrigatória')
            return
        }

        setSaving(true)
        try {
            // Check for existing if creating new
            if (!isEditing) {
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
            }

            // Clean parts for storage (remove temp ID)
            const partesParaSalvar = partes.map((parte) => {
                const { id, ...rest } = parte
                return rest
            })

            const payload = {
                data_reuniao: dataReuniao,
                semana_descricao: semanaDescricao,
                evento_tipo: eventoTipo,
                temas_tesouros: '',
                partes: partesParaSalvar
            }

            let error;

            if (isEditing && initialData) {
                const { error: updateError } = await supabase
                    .from('programacao_semanal')
                    .update(payload)
                    .eq('id', initialData.id)
                error = updateError
            } else {
                const { error: insertError } = await supabase
                    .from('programacao_semanal')
                    .insert(payload)
                error = insertError
            }

            if (error) throw error

            alert('Programação salva com sucesso!')
            router.push('/programacao')
            router.refresh()
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
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6 mb-6 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <h3 className={`text-lg font-semibold leading-tight ${colorClass}`}>{title}</h3>
                    <button
                        type="button"
                        onClick={() => addParte(tipo)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto shrink-0"
                    >
                        + Adicionar Parte
                    </button>
                </div>
                <div className="space-y-3">
                    {sectionPartes.map((parte) => (
                        <div key={parte.id} className="flex items-center gap-2 min-w-0">
                            <input
                                type="text"
                                placeholder="Nome da parte"
                                value={parte.nome}
                                onChange={(e) => updateParte(parte.id, 'nome', e.target.value)}
                                className="flex-1 min-w-0 p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent text-slate-900 dark:text-white"
                            />
                            <div className="flex items-center gap-1 shrink-0">
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    placeholder="min"
                                    value={parte.tempo}
                                    onChange={(e) => updateParte(parte.id, 'tempo', parseInt(e.target.value) || 0)}
                                    className="w-14 p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent text-center text-slate-900 dark:text-white"
                                    aria-label="Minutos"
                                />
                                <span className="text-xs text-slate-400 w-7">min</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeParte(parte.id)}
                                className="shrink-0 text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Remover"
                                aria-label="Remover parte"
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    {sectionPartes.length === 0 && (
                        <p className="text-slate-500 text-sm italic text-center py-2">Nenhuma parte adicionada.</p>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 pb-32 overflow-x-clip">
            <PageHeader
                title={isEditing ? 'Editar Programação' : 'Nova Programação'}
                backHref="/programacao"
                backLabel="Reunião de Meio de Semana"
            />

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Informações Gerais</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
                        <input
                            type="date"
                            value={dataReuniao}
                            onChange={(e) => setDataReuniao(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent text-slate-900 dark:text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Semana (Descrição)</label>
                        <input
                            type="text"
                            placeholder="Ex: Romanos 1-2"
                            value={semanaDescricao}
                            onChange={(e) => setSemanaDescricao(e.target.value)}
                            className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent text-slate-900 dark:text-white"
                        />
                    </div>
                </div>
                <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de Evento</label>
                    <select
                        value={eventoTipo}
                        onChange={(e) => handleEventoTipoChange(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                        <option value="normal">Normal</option>
                        <option value="assembleia">Assembleia</option>
                        <option value="congresso">Congresso</option>
                        <option value="celebração">Celebração</option>
                        <option value="visita spte">Visita Supte.</option>
                    </select>
                </div>
            </div>

            {eventoTipo === 'visita spte' && (
                <div className="mb-6 p-4 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 rounded-xl flex items-start gap-3">
                    <span className="text-teal-600 dark:text-teal-400 text-xl">📌</span>
                    <div>
                        <h3 className="text-teal-800 dark:text-teal-300 font-bold">Semana de Visita do Superintendente</h3>
                        <p className="text-teal-700 dark:text-teal-400 text-sm mt-1">
                            O Estudo Bíblico de Congregação foi removido automaticamente. Após salvar a programação, o Coordenador poderá usar o <strong>Painel da Visita</strong> para configurar os horários especiais de campo, pastoreios e almoços.
                        </p>
                    </div>
                </div>
            )}

            {renderSection('Tesouros da Palavra de Deus', 'TESOUROS', 'text-slate-600 dark:text-slate-300')}
            {renderSection('Faça Seu Melhor no Ministério', 'MINISTERIO', 'text-yellow-600')}
            {renderSection('Nossa Vida Cristã', 'VIDA_CRISTA', 'text-red-600')}

            <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 z-40">
                <div className="max-w-4xl mx-auto flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSalvar}
                        disabled={saving}
                        className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-sm shadow-sm"
                    >
                        {saving ? 'Salvando...' : 'Salvar Programação'}
                    </button>
                </div>
            </div>
        </div>
    )
}
