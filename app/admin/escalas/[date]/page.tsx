'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'
import { useRouter } from 'next/navigation'
import { checkConflicts } from '@/lib/conflictCheck'

type Membro = Database['public']['Tables']['membros']['Row']
type DesignacaoSuporte = Database['public']['Tables']['designacoes_suporte']['Row']

const ROLES = [
    { id: 'PRESIDENTE', label: 'Presidente', required: 'is_presidente' },
    { id: 'SOM', label: 'Som', required: 'is_som' },
    { id: 'MICROFONE_1', label: 'Microfone 1', required: 'is_microfone' },
    { id: 'MICROFONE_2', label: 'Microfone 2', required: 'is_microfone' },
    { id: 'INDICADOR_ENTRADA', label: 'Indicador Entrada', required: 'is_indicador' },
    { id: 'INDICADOR_AUDITORIO', label: 'Indicador Auditório', required: 'is_indicador' },
    { id: 'LEITOR_SENTINELA', label: 'Leitor da Sentinela', required: 'is_leitor_sentinela' },
] as const

export default function EscalaEditorPage({ params }: { params: Promise<{ date: string }> }) {
    const { date } = use(params)
    const router = useRouter()
    const dateParam = date === 'nova' ? new Date().toISOString().split('T')[0] : date

    const [selectedDate, setSelectedDate] = useState(dateParam)
    const [isNew, setIsNew] = useState(date === 'nova')

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [membros, setMembros] = useState<Membro[]>([])
    const [assignments, setAssignments] = useState<Record<string, string>>({})

    useEffect(() => {
        if (selectedDate) {
            fetchData(selectedDate)
        }
    }, [selectedDate])

    const fetchMembers = async () => {
        const { data: membData, error: membError } = await supabase
            .from('membros')
            .select('*')
            .order('nome_completo')

        if (membError) throw membError
        setMembros(membData || [])
    }

    const fetchData = async (date: string) => {
        setLoading(true)
        try {
            await fetchMembers()

            const { data: assignData, error: assignError } = await supabase
                .from('designacoes_suporte')
                .select('*')
                .eq('data', date)

            if (assignError) throw assignError

            const newAssignments: Record<string, string> = {}
            assignData?.forEach(a => {
                if (a.membro_id) {
                    newAssignments[a.funcao] = a.membro_id
                }
            })
            setAssignments(newAssignments)

        } catch (error: any) {
            console.error('Erro ao carregar dados:', error)
            alert('Erro ao carregar dados: ' + (error.message || error))
        } finally {
            setLoading(false)
        }
    }

    const handleAssignmentChange = async (role: string, membroId: string) => {
        if (membroId) {
            // 1. Local Conflict Check (Same Page)
            const existingRole = Object.entries(assignments).find(([r, mId]) => mId === membroId && r !== role)
            if (existingRole) {
                const roleLabel = ROLES.find(r => r.id === existingRole[0])?.label || existingRole[0]
                alert(`Este irmão já está designado para: ${roleLabel} nesta mesma data.`)
                return
            }

            // 2. Database Conflict Check (Other Schedules)
            const conflicts = await checkConflicts(selectedDate, membroId)
            if (conflicts.length > 0) {
                const confirmed = confirm(
                    `Este irmão já está designado para:\n\n${conflicts.join('\n')}\n\nDeseja continuar mesmo assim?`
                )
                if (!confirmed) return
            }
        }

        setAssignments(prev => ({
            ...prev,
            [role]: membroId
        }))
    }

    const handleSave = async () => {
        if (!selectedDate) {
            alert('Selecione uma data.')
            return
        }
        setSaving(true)
        try {
            // 1. Get programacao_id if exists for this date
            const { data: progData, error: progError } = await supabase
                .from('programacao_semanal')
                .select('id')
                .eq('data_reuniao', selectedDate)
                .maybeSingle()

            if (progError) throw progError

            const programacaoId = progData?.id || null

            // 2. Prepare upsert data
            const upsertData: any[] = []

            // Filter roles based on weekend logic
            const isWknd = isWeekend(selectedDate)
            const validRoles = ROLES.filter(r => (r.id !== 'PRESIDENTE' && r.id !== 'LEITOR_SENTINELA') || isWknd)

            validRoles.forEach(role => {
                const membroId = assignments[role.id]
                if (membroId) {
                    upsertData.push({
                        data: selectedDate,
                        programacao_id: programacaoId,
                        funcao: role.id,
                        membro_id: membroId
                    })
                }
            })

            // 3. Upsert to designacoes_suporte
            // Delete existing for this date first to ensure clean state (handle removals)
            const { error: deleteError } = await supabase
                .from('designacoes_suporte')
                .delete()
                .eq('data', selectedDate)

            if (deleteError) throw deleteError

            if (upsertData.length > 0) {
                const { error } = await supabase
                    .from('designacoes_suporte')
                    .insert(upsertData)

                if (error) throw error
            }

            // 4. Sync Presidente to programacao_semanal if exists
            if (programacaoId && assignments['PRESIDENTE'] && isWknd) {
                await supabase
                    .from('programacao_semanal')
                    .update({ presidente_id: assignments['PRESIDENTE'] })
                    .eq('id', programacaoId)
            }

            alert('Escala salva com sucesso!')
            router.push('/admin/escalas')
        } catch (error: any) {
            console.error('Erro ao salvar:', error)
            alert('Erro ao salvar: ' + (error.message || error))
        } finally {
            setSaving(false)
        }
    }

    const getQualifiedMembers = (roleRequired: string) => {
        return membros.filter(m => (m as any)[roleRequired])
    }

    const isWeekend = (dateString: string) => {
        if (!dateString) return false
        const [year, month, day] = dateString.split('-').map(Number)
        const date = new Date(year, month - 1, day)
        const dayOfWeek = date.getDay()
        return dayOfWeek === 0 || dayOfWeek === 6
    }

    if (loading && !isNew) return <div className="p-8">Carregando...</div>

    const isWknd = isWeekend(selectedDate)

    return (
        <div className="max-w-3xl mx-auto p-8 pb-24">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {isNew ? 'Nova Escala' : 'Editar Escala'}
                </h1>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Data da Reunião
                    </label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                            setSelectedDate(e.target.value)
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                    />
                </div>

                <div className="space-y-4">
                    {ROLES.map(role => {
                        if ((role.id === 'PRESIDENTE' || role.id === 'LEITOR_SENTINELA') && !isWknd) return null

                        return (
                            <div key={role.id}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {role.label}
                                </label>
                                <select
                                    value={assignments[role.id] || ''}
                                    onChange={(e) => handleAssignmentChange(role.id, e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                                >
                                    <option value="">Selecione...</option>
                                    {getQualifiedMembers(role.required).map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.nome_completo}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="flex justify-end gap-4">
                <button
                    onClick={() => router.back()}
                    className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium shadow-lg"
                >
                    {saving ? 'Salvando...' : 'Salvar'}
                </button>
            </div>
        </div>
    )
}
