'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'

type Programacao = Database['public']['Tables']['programacao_semanal']['Row']
type Membro = Database['public']['Tables']['membros']['Row']

function ConfirmarContent() {
    const searchParams = useSearchParams()
    const id = searchParams.get('id')
    const membroId = searchParams.get('membro')
    const role = searchParams.get('role')
    const type = searchParams.get('type') // 'programacao' (default) or 'hospitalidade'

    const [loading, setLoading] = useState(true)
    const [programacao, setProgramacao] = useState<Programacao | null>(null)
    const [membro, setMembro] = useState<Membro | null>(null)
    const [status, setStatus] = useState<string | null>(null)
    const [partName, setPartName] = useState<string>('')
    const [assistantName, setAssistantName] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (id && membroId) {
            fetchData()
        } else {
            setError('Link inválido.')
            setLoading(false)
        }
    }, [id, membroId, role, type])

    const fetchData = async () => {
        try {
            if (!id || !membroId) return

            // Fetch Member
            const { data: membData, error: membError } = await supabase
                .from('membros')
                .select('*')
                .eq('id', membroId)
                .single()

            if (membError) throw membError
            setMembro(membData)

            if (type === 'hospitalidade') {
                // Fetch Hospitality Assignment
                const { data: hospData, error: hospError } = await supabase
                    .from('agenda_discursos_locais')
                    .select('*, orador_visitante:oradores_visitantes(nome)')
                    .eq('id', id)
                    .single()

                if (hospError) throw hospError

                // Mock Programacao structure for date display
                setProgramacao({ data_reuniao: hospData.data } as any)

                setStatus(hospData.hospitalidade_status || 'pending')
                setPartName(`Hospedagem/Lanche - Orador: ${hospData.orador_visitante?.nome}`)

            } else {
                // Default: Programacao Semanal
                if (!role) throw new Error('Role missing for programacao')

                // Fetch Schedule
                const { data: progData, error: progError } = await supabase
                    .from('programacao_semanal')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (progError) throw progError
                setProgramacao(progData)

                // Determine Status and Part Name
                let currentStatus = 'pending'
                let name = ''

                if (role === 'presidente') {
                    currentStatus = progData.presidente_status || 'pending'
                    name = 'Presidente'
                } else if (role === 'oracao_inicial') {
                    currentStatus = progData.oracao_inicial_status || 'pending'
                    name = 'Oração Inicial'
                } else if (role === 'oracao_final') {
                    currentStatus = progData.oracao_final_status || 'pending'
                    name = 'Oração Final'
                } else {
                    // It's a part index or ID
                    const partes = (progData.partes as any[]) || []
                    const index = parseInt(role as string)
                    if (!isNaN(index) && partes[index]) {
                        const p = partes[index]
                        name = p.nome
                        // Check if member is main or assistant
                        if (p.membro_id === membroId) {
                            currentStatus = p.status || 'pending'

                            // If there is an assistant, fetch their name
                            if (p.ajudante_id) {
                                const { data: assistantData } = await supabase
                                    .from('membros')
                                    .select('nome_completo')
                                    .eq('id', p.ajudante_id)
                                    .single()

                                if (assistantData) {
                                    setAssistantName(assistantData.nome_completo)
                                }
                            }

                        } else if (p.ajudante_id === membroId) {
                            currentStatus = p.ajudante_status || 'pending'
                            name += ' (Ajudante)'
                        }
                    }
                }

                setStatus(currentStatus)
                setPartName(name)
            }

        } catch (err: any) {
            console.error(err)
            setError('Erro ao carregar dados.')
        } finally {
            setLoading(false)
        }
    }

    const handleResponse = async (newStatus: 'accepted' | 'declined') => {
        if (!programacao && type !== 'hospitalidade') return
        setLoading(true)

        try {
            let updateData: any = {}

            if (type === 'hospitalidade') {
                updateData = { hospitalidade_status: newStatus }

                const { error } = await supabase
                    .from('agenda_discursos_locais')
                    .update(updateData)
                    .eq('id', id)

                if (error) throw error

            } else {
                if (role === 'presidente') {
                    updateData = { presidente_status: newStatus }
                } else if (role === 'oracao_inicial') {
                    updateData = { oracao_inicial_status: newStatus }
                } else if (role === 'oracao_final') {
                    updateData = { oracao_final_status: newStatus }
                } else {
                    // Update part in JSON
                    const partes = [...(programacao!.partes as any[])]
                    const index = parseInt(role as string)
                    if (!isNaN(index) && partes[index]) {
                        if (partes[index].membro_id === membroId) {
                            partes[index].status = newStatus
                        } else if (partes[index].ajudante_id === membroId) {
                            partes[index].ajudante_status = newStatus
                        }
                        updateData = { partes: partes }
                    }
                }

                if (!id) throw new Error('ID inválido')

                const { error } = await supabase
                    .from('programacao_semanal')
                    .update(updateData)
                    .eq('id', id)

                if (error) throw error
            }
            setStatus(newStatus)
            alert(newStatus === 'accepted' ? 'Designação aceita com sucesso!' : 'Designação recusada.')

        } catch (err: any) {
            console.error(err)
            alert('Erro ao atualizar status.')
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-8 text-center">Carregando...</div>
    if (error) return <div className="p-8 text-center text-red-600">{error}</div>

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Confirmação de Designação</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Olá, <span className="font-semibold">{membro?.nome_completo}</span>!
                </p>

                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 mb-8">
                    <p className="text-sm text-blue-600 dark:text-blue-400 uppercase tracking-wide font-semibold mb-1">Data</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        {programacao?.data_reuniao ? new Date(programacao.data_reuniao + 'T00:00:00').toLocaleDateString('pt-BR') : ''}
                    </p>

                    <p className="text-sm text-blue-600 dark:text-blue-400 uppercase tracking-wide font-semibold mb-1">Parte</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">
                        {partName}
                    </p>
                    {assistantName && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                            <span className="font-semibold text-blue-600 dark:text-blue-400 uppercase text-xs tracking-wide">Ajudante: </span>
                            {assistantName}
                        </p>
                    )}
                </div>

                {status === 'pending' && (
                    <div className="space-y-3">
                        <button
                            onClick={() => handleResponse('accepted')}
                            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            Aceitar Designação
                        </button>
                        <button
                            onClick={() => handleResponse('declined')}
                            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            Não posso cuidar
                        </button>
                    </div>
                )}

                {status === 'accepted' && (
                    <div className="text-green-600 dark:text-green-400 flex flex-col items-center">
                        <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <p className="text-lg font-medium">Designação Aceita!</p>
                        <p className="text-sm mt-1">Obrigado por confirmar.</p>
                    </div>
                )}

                {status === 'declined' && (
                    <div className="text-red-600 dark:text-red-400 flex flex-col items-center">
                        <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <p className="text-lg font-medium">Designação Recusada</p>
                        <p className="text-sm mt-1">O irmão responsável será notificado.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function ConfirmarPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <ConfirmarContent />
        </Suspense>
    )
}
