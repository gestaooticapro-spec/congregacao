'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'
import { checkConflicts } from '@/lib/conflictCheck'
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Programacao = Database['public']['Tables']['programacao_semanal']['Row']
type Membro = Database['public']['Tables']['membros']['Row']

interface Parte {
    tipo: 'TESOUROS' | 'MINISTERIO' | 'VIDA_CRISTA' | 'PRESIDENTE' | 'ORACAO'
    nome: string
    tempo: number
    membro_id?: string
    ajudante_id?: string
}

interface Historico {
    membro_id: string
    data_reuniao: string
}

export default function EditarDesignacoesPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [programacao, setProgramacao] = useState<Programacao | null>(null)
    const [membros, setMembros] = useState<Membro[]>([])
    const [partes, setPartes] = useState<Parte[]>([])
    const [presidenteId, setPresidenteId] = useState<string>('')
    const [oracaoInicialId, setOracaoInicialId] = useState<string>('')
    const [oracaoFinalId, setOracaoFinalId] = useState<string>('')
    const [lastAssignments, setLastAssignments] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (id) {
            fetchData()
        }
    }, [id])

    const fetchData = async () => {
        console.log('Fetching data for ID:', id)
        try {
            // Fetch Schedule
            const { data: progData, error: progError } = await supabase
                .from('programacao_semanal')
                .select('*')
                .eq('id', id)
                .single()

            console.log('Fetch result:', { progData, progError })

            if (progError) throw progError
            setProgramacao(progData)
            if (progData?.partes) {
                setPartes(progData.partes as any)
                setPresidenteId(progData.presidente_id || '')
                setOracaoInicialId(progData.oracao_inicial_id || '')
                setOracaoFinalId(progData.oracao_final_id || '')
            }

            // Fetch Members
            const { data: membData, error: membError } = await supabase
                .from('membros')
                .select('*')
                .order('nome_completo')

            if (membError) throw membError
            setMembros(membData || [])

            // Fetch Last Assignments
            const { data: histData, error: histError } = await supabase
                .from('historico_designacoes')
                .select('membro_id, data_reuniao')
                .order('data_reuniao', { ascending: false })

            if (!histError && histData) {
                const last: Record<string, string> = {}
                histData.forEach((h: any) => {
                    if (!last[h.membro_id]) {
                        last[h.membro_id] = h.data_reuniao
                    }
                })
                setLastAssignments(last)
            }

        } catch (error) {
            console.error('Erro ao carregar dados:', error)
            alert('Erro ao carregar dados.')
        } finally {
            setLoading(false)
        }
    }

    const getQualifiedMembers = (parte: Parte, isAssistant = false) => {
        // Filter out inactive members first
        const activeMembros = membros.filter(m => m.ativo !== false)

        if (isAssistant) {
            if (parte.tipo === 'VIDA_CRISTA' && parte.nome.includes('Estudo Bíblico')) {
                return activeMembros.filter(m => m.is_leitor_estudo_biblico)
            }
            return activeMembros.filter(m => m.is_ajudante)
        }

        // Chairman
        if (parte.tipo === 'PRESIDENTE') {
            return activeMembros.filter(m => m.is_presidente)
        }

        // Prayers
        if (parte.tipo === 'ORACAO') {
            return activeMembros.filter(m => m.is_anciao || m.is_servo_ministerial)
        }

        if (parte.tipo === 'TESOUROS') {
            if (parte.nome.includes('Leitura da Bíblia')) return activeMembros.filter(m => m.is_leitor_biblia)
            // Talks/Gems -> Elders or Servants
            return activeMembros.filter(m => m.is_anciao || m.is_servo_ministerial)
        }

        if (parte.tipo === 'MINISTERIO') {
            // General publishers
            return activeMembros.filter(m => m.is_publicador)
        }

        if (parte.tipo === 'VIDA_CRISTA') {
            if (parte.nome.includes('Estudo Bíblico de Congregação')) return activeMembros.filter(m => m.is_anciao) // Conductor
            if (parte.nome.includes('Leitura do Estudo')) return activeMembros.filter(m => m.is_leitor_estudo_biblico) // Reader

            // Fix: Restrict other parts to Elders or Ministerial Servants
            return activeMembros.filter(m => m.is_anciao || m.is_servo_ministerial)
        }

        return activeMembros
    }

    const getStatusIcon = (status: string | undefined) => {
        if (status === 'accepted') return <span title="Aceito" className="text-green-500 ml-1">✅</span>
        if (status === 'declined') return <span title="Recusado" className="text-red-500 ml-1">❌</span>
        return <span title="Pendente" className="text-gray-400 ml-1">⏳</span>
    }

    const getWhatsAppUrl = (membroId: string | undefined, parteNome: string, roleIdentifier: string, ajudanteId?: string) => {
        if (!membroId || !programacao) return ''

        const date = new Date(programacao.data_reuniao).toLocaleDateString('pt-BR')
        let message = `Olá!\nVocê terá parte no dia: ${date}\nParte: ${parteNome}`

        if (ajudanteId) {
            const ajudante = membros.find(m => m.id === ajudanteId)
            if (ajudante) {
                message += `\nAjudante: ${ajudante.nome_completo}`
            }
        }

        const link = `${window.location.origin}/confirmar?id=${id}&membro=${membroId}&role=${roleIdentifier}`
        message += `\n\nClique no link pra confirmar:\n\n${link}`

        return `https://wa.me/?text=${encodeURIComponent(message)}`
    }

    const handleAssignmentChange = async (index: number, field: 'membro_id' | 'ajudante_id', value: string) => {
        if (value) {
            const allConflicts: string[] = []

            // 1. Local Conflict Check (Same Page)
            // Check top-level roles
            if (presidenteId === value) allConflicts.push('Presidente')
            if (oracaoInicialId === value) allConflicts.push('Oração Inicial')
            if (oracaoFinalId === value) allConflicts.push('Oração Final')

            // Check other parts
            const existingPart = partes.find((p, i) => i !== index && (p.membro_id === value || p.ajudante_id === value))
            if (existingPart) {
                if (existingPart.membro_id === value) allConflicts.push(`Parte: ${existingPart.nome}`)
                if (existingPart.ajudante_id === value) allConflicts.push(`Ajudante: ${existingPart.nome}`)
            }

            // 2. Database Conflict Check
            if (programacao) {
                const dbConflicts = await checkConflicts(programacao.data_reuniao, value)
                allConflicts.push(...dbConflicts)
            }

            // 3. Deduplicate and Show Alert
            const uniqueConflicts = Array.from(new Set(allConflicts))

            if (uniqueConflicts.length > 0) {
                const proceed = confirm(`Este irmão já tem outras designações nesta data: ${uniqueConflicts.join(', ')}. Deseja continuar?`)
                if (!proceed) return
            }
        }

        const newPartes = [...partes]
        newPartes[index] = { ...newPartes[index], [field]: value || null }
        setPartes(newPartes)
    }

    const handleRoleChange = async (role: 'presidente_id' | 'oracao_inicial_id' | 'oracao_final_id', value: string) => {
        if (value) {
            const allConflicts: string[] = []

            // 1. Local Conflict Check
            if (role !== 'presidente_id' && presidenteId === value) allConflicts.push('Presidente')
            if (role !== 'oracao_inicial_id' && oracaoInicialId === value) allConflicts.push('Oração Inicial')
            if (role !== 'oracao_final_id' && oracaoFinalId === value) allConflicts.push('Oração Final')

            const existingPart = partes.find(p => p.membro_id === value || p.ajudante_id === value)
            if (existingPart) {
                if (existingPart.membro_id === value) allConflicts.push(`Parte: ${existingPart.nome}`)
                if (existingPart.ajudante_id === value) allConflicts.push(`Ajudante: ${existingPart.nome}`)
            }

            // 2. Database Conflict Check
            if (programacao) {
                const dbConflicts = await checkConflicts(programacao.data_reuniao, value)
                allConflicts.push(...dbConflicts)
            }

            // 3. Deduplicate and Show Alert
            const uniqueConflicts = Array.from(new Set(allConflicts))

            if (uniqueConflicts.length > 0) {
                const proceed = confirm(`Este irmão já tem outras designações nesta data: ${uniqueConflicts.join(', ')}. Deseja continuar?`)
                if (!proceed) return
            }
        }

        if (role === 'presidente_id') setPresidenteId(value)
        if (role === 'oracao_inicial_id') setOracaoInicialId(value)
        if (role === 'oracao_final_id') setOracaoFinalId(value)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('programacao_semanal')
                .update({
                    partes: partes as any,
                    presidente_id: presidenteId || null,
                    oracao_inicial_id: oracaoInicialId || null,
                    oracao_final_id: oracaoFinalId || null
                })
                .eq('id', id)

            if (error) throw error

            // Update History
            // 1. Delete existing history for this schedule
            await supabase.from('historico_designacoes').delete().eq('programacao_id', id)

            // 2. Insert new history
            const historyEntries: any[] = []
            const dataReuniao = programacao?.data_reuniao || new Date().toISOString().split('T')[0]

            if (presidenteId) historyEntries.push({ membro_id: presidenteId, programacao_id: id, data_reuniao: dataReuniao, parte_descricao: 'Presidente' })
            if (oracaoInicialId) historyEntries.push({ membro_id: oracaoInicialId, programacao_id: id, data_reuniao: dataReuniao, parte_descricao: 'Oração Inicial' })
            if (oracaoFinalId) historyEntries.push({ membro_id: oracaoFinalId, programacao_id: id, data_reuniao: dataReuniao, parte_descricao: 'Oração Final' })

            partes.forEach(p => {
                if (p.membro_id) historyEntries.push({ membro_id: p.membro_id, programacao_id: id, data_reuniao: dataReuniao, parte_descricao: p.nome })
                if (p.ajudante_id) historyEntries.push({ membro_id: p.ajudante_id, programacao_id: id, data_reuniao: dataReuniao, parte_descricao: p.nome + ' (Ajudante)' })
            })

            if (historyEntries.length > 0) {
                await supabase.from('historico_designacoes').insert(historyEntries)
            }

            alert('Designações salvas com sucesso!')
            router.push('/admin/designacoes')
        } catch (error: any) {
            console.error(error)
            alert('Erro ao salvar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const getWeekRange = (dateString: string) => {
        if (!dateString) return ''
        const date = parseISO(dateString)
        const start = startOfWeek(date, { weekStartsOn: 1 }) // Monday
        const end = endOfWeek(date, { weekStartsOn: 1 }) // Sunday

        const startStr = format(start, "d 'de' MMMM", { locale: ptBR })
        const endStr = format(end, "d 'de' MMMM", { locale: ptBR })

        return `Semana de ${startStr} a ${endStr}`
    }

    const renderPartSection = (title: string, tipo: string, colorClass: string) => {
        const sectionParts = partes.map((p, i) => ({ ...p, originalIndex: i })).filter(p => p.tipo === tipo)

        // Enforce Bible Study as last item for VIDA_CRISTA
        if (tipo === 'VIDA_CRISTA') {
            sectionParts.sort((a, b) => {
                const aIsStudy = a.nome.includes('Estudo Bíblico');
                const bIsStudy = b.nome.includes('Estudo Bíblico');
                if (aIsStudy && !bIsStudy) return 1;
                if (!aIsStudy && bIsStudy) return -1;
                return 0;
            });
        }

        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <h3 className={`text-lg font-semibold mb-4 ${colorClass}`}>{title}</h3>
                <div className="space-y-4">
                    {sectionParts.map((parte) => (
                        <div key={parte.originalIndex} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <div className="md:col-span-4">
                                <p className="font-medium text-gray-900 dark:text-white">{parte.nome}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{parte.tempo} min</p>
                            </div>

                            <div className="md:col-span-4">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Designado</label>
                                <select
                                    value={parte.membro_id || ''}
                                    onChange={(e) => handleAssignmentChange(parte.originalIndex, 'membro_id', e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
                                >
                                    <option value="">Selecione...</option>
                                    {getQualifiedMembers(parte).map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.nome_completo} {lastAssignments[m.id] ? `(Última: ${new Date(lastAssignments[m.id]).toLocaleDateString('pt-BR')})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <div className="flex items-center mt-1">
                                    {parte.membro_id && (
                                        <a
                                            href={getWhatsAppUrl(parte.membro_id, parte.nome, parte.originalIndex.toString(), parte.ajudante_id)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-green-500 hover:text-green-600 transition-colors mr-2"
                                            title="Enviar WhatsApp"
                                        >
                                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                            </svg>
                                        </a>
                                    )}
                                    {parte.membro_id && getStatusIcon((parte as any).status)}
                                </div>
                            </div>

                            {(parte.tipo === 'MINISTERIO' || (parte.tipo === 'VIDA_CRISTA' && parte.nome.includes('Estudo Bíblico'))) && (
                                <div className="md:col-span-4">
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                        {parte.nome.includes('Estudo Bíblico') ? 'Leitor' : 'Ajudante'}
                                    </label>
                                    <select
                                        value={parte.ajudante_id || ''}
                                        onChange={(e) => handleAssignmentChange(parte.originalIndex, 'ajudante_id', e.target.value)}
                                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
                                    >
                                        <option value="">Selecione...</option>
                                        {getQualifiedMembers(parte, true).map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.nome_completo} {lastAssignments[m.id] ? `(Última: ${new Date(lastAssignments[m.id]).toLocaleDateString('pt-BR')})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    ))}
                    {sectionParts.length === 0 && <p className="text-gray-500 italic">Nenhuma parte nesta seção.</p>}
                </div>
            </div>
        )
    }

    if (loading) return <div className="p-8">Carregando...</div>
    if (!programacao) return <div className="p-8">Programação não encontrada.</div>

    return (
        <div className="max-w-5xl mx-auto p-8 pb-24">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Designações</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {new Date(programacao.data_reuniao + 'T00:00:00').toLocaleDateString('pt-BR')} - {programacao.semana_descricao}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2 border border-blue-300 dark:border-blue-600 rounded-md text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                        Imprimir
                    </button>
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        Voltar
                    </button>
                </div>
            </div>

            {/* Print View */}
            <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-0 overflow-y-auto text-slate-900">
                <div className="max-w-[210mm] mx-auto p-[15mm]">
                    <div className="text-center mb-8 border-b border-slate-300 pb-4">
                        <h2 className="text-2xl font-bold uppercase mb-1">Nossa Vida e Ministério Cristão</h2>

                        {/* Print Only Header Info */}
                        <div className="hidden print:block mb-2">
                            <p className="text-xl font-bold text-slate-800 capitalize">
                                {programacao?.data_reuniao ? format(parseISO(programacao.data_reuniao), "d 'de' MMMM 'de' yyyy", { locale: ptBR }) : ''}
                            </p>
                            <p className="text-md text-slate-600 capitalize">
                                {programacao?.data_reuniao ? getWeekRange(programacao.data_reuniao) : ''}
                            </p>
                        </div>

                        <p className="text-lg font-medium text-slate-600">
                            {programacao?.semana_descricao}
                        </p>
                    </div>

                    {/* Top Roles */}
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <span className="block text-xs font-bold uppercase text-slate-500 mb-1">Presidente</span>
                            <span className="text-lg font-bold text-slate-900">{membros.find(m => m.id === presidenteId)?.nome_completo || '______________________'}</span>
                        </div>
                        <div className="text-right">
                            <span className="block text-xs font-bold uppercase text-slate-500 mb-1">Oração Inicial</span>
                            <span className="text-lg font-bold text-slate-900">{membros.find(m => m.id === oracaoInicialId)?.nome_completo || '______________________'}</span>
                        </div>
                    </div>

                    {/* Sections */}
                    {['TESOUROS', 'MINISTERIO', 'VIDA_CRISTA'].map((tipo) => {
                        const sectionParts = partes.map((p, i) => ({ ...p, originalIndex: i })).filter(p => p.tipo === tipo)

                        if (tipo === 'VIDA_CRISTA') {
                            sectionParts.sort((a, b) => {
                                const aIsStudy = a.nome.includes('Estudo Bíblico');
                                const bIsStudy = b.nome.includes('Estudo Bíblico');
                                if (aIsStudy && !bIsStudy) return 1;
                                if (!aIsStudy && bIsStudy) return -1;
                                return 0;
                            });
                        }

                        if (sectionParts.length === 0) return null

                        const titles: Record<string, string> = {
                            'TESOUROS': 'Tesouros da Palavra de Deus',
                            'MINISTERIO': 'Faça Seu Melhor no Ministério',
                            'VIDA_CRISTA': 'Nossa Vida Cristã'
                        }

                        const colors: Record<string, string> = {
                            'TESOUROS': 'text-slate-700',
                            'MINISTERIO': 'text-yellow-700',
                            'VIDA_CRISTA': 'text-red-700'
                        }

                        const colorClass = colors[tipo]

                        return (
                            <div key={tipo} className="mb-6 break-inside-avoid">
                                <h3 className={`text-lg font-bold uppercase mb-2 border-b-2 ${colorClass.replace('text-', 'border-')} pb-1 ${colorClass}`}>
                                    {titles[tipo]}
                                </h3>
                                <div className="space-y-3">
                                    {sectionParts.map((parte) => (
                                        <div key={parte.originalIndex} className="grid grid-cols-12 gap-2 items-start text-sm">
                                            <div className="col-span-2 font-bold text-slate-500">
                                                {parte.tempo} min
                                            </div>
                                            <div className="col-span-6 font-medium">
                                                {parte.nome}
                                            </div>
                                            <div className="col-span-4 text-right">
                                                <div className="font-bold text-slate-900">
                                                    {membros.find(m => m.id === parte.membro_id)?.nome_completo || '______________________'}
                                                </div>
                                                {(parte.ajudante_id || (parte.tipo === 'VIDA_CRISTA' && parte.nome.includes('Estudo Bíblico') && parte.ajudante_id)) && (
                                                    <div className="text-xs text-slate-500 italic">
                                                        {parte.nome.includes('Estudo Bíblico') ? 'Leitor: ' : 'Ajudante: '}
                                                        {membros.find(m => m.id === parte.ajudante_id)?.nome_completo}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}

                    {/* Closing Prayer */}
                    <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between items-center">
                        <span className="font-bold uppercase text-sm text-slate-500">Oração Final</span>
                        <span className="text-lg font-bold text-slate-900">{membros.find(m => m.id === oracaoFinalId)?.nome_completo || '______________________'}</span>
                    </div>

                    <div className="mt-12 text-sm text-slate-500 text-center italic">
                        "A tua palavra é lâmpada para o meu pé, e luz para o meu caminho." - Salmo 119:105
                    </div>
                </div>

                <style jsx global>{`
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 0;
                        }
                        body {
                            background: white;
                            -webkit-print-color-adjust: exact;
                        }
                        /* Hide scrollbars in print */
                        ::-webkit-scrollbar {
                            display: none;
                        }
                    }
                `}</style>
            </div>

            {/* Editor View (Hidden on Print) */}
            <div className="print:hidden">

                {/* Roles Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4 text-purple-600">Designações Principais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Presidente</label>
                            <div className="flex items-center">
                                <select
                                    value={presidenteId}
                                    onChange={(e) => handleRoleChange('presidente_id', e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                                >
                                    <option value="">Selecione...</option>
                                    {getQualifiedMembers({ tipo: 'PRESIDENTE', nome: '', tempo: 0 }).map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.nome_completo} {lastAssignments[m.id] ? `(Última: ${new Date(lastAssignments[m.id]).toLocaleDateString('pt-BR')})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {presidenteId && (
                                    <a
                                        href={getWhatsAppUrl(presidenteId, 'Presidente', 'presidente')}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-2 text-green-500 hover:text-green-600 transition-colors"
                                        title="Enviar WhatsApp"
                                    >
                                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                        </svg>
                                    </a>
                                )}
                                {presidenteId && getStatusIcon(programacao?.presidente_status || 'pending')}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Oração Inicial</label>
                            <div className="flex items-center">
                                <select
                                    value={oracaoInicialId}
                                    onChange={(e) => handleRoleChange('oracao_inicial_id', e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                                >
                                    <option value="">Selecione...</option>
                                    {getQualifiedMembers({ tipo: 'ORACAO', nome: '', tempo: 0 }).map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.nome_completo} {lastAssignments[m.id] ? `(Última: ${new Date(lastAssignments[m.id]).toLocaleDateString('pt-BR')})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {oracaoInicialId && (
                                    <a
                                        href={getWhatsAppUrl(oracaoInicialId, 'Oração Inicial', 'oracao_inicial')}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-2 text-green-500 hover:text-green-600 transition-colors"
                                        title="Enviar WhatsApp"
                                    >
                                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                        </svg>
                                    </a>
                                )}
                                {oracaoInicialId && getStatusIcon(programacao?.oracao_inicial_status || 'pending')}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Oração Final</label>
                            <div className="flex items-center">
                                <select
                                    value={oracaoFinalId}
                                    onChange={(e) => handleRoleChange('oracao_final_id', e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                                >
                                    <option value="">Selecione...</option>
                                    {getQualifiedMembers({ tipo: 'ORACAO', nome: '', tempo: 0 }).map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.nome_completo} {lastAssignments[m.id] ? `(Última: ${new Date(lastAssignments[m.id]).toLocaleDateString('pt-BR')})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {oracaoFinalId && (
                                    <a
                                        href={getWhatsAppUrl(oracaoFinalId, 'Oração Final', 'oracao_final')}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-2 text-green-500 hover:text-green-600 transition-colors"
                                        title="Enviar WhatsApp"
                                    >
                                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                        </svg>
                                    </a>
                                )}
                                {oracaoFinalId && getStatusIcon(programacao?.oracao_final_status || 'pending')}
                            </div>
                        </div>
                    </div>

                    {renderPartSection('Tesouros da Palavra de Deus', 'TESOUROS', 'text-gray-600')}
                    {renderPartSection('Faça Seu Melhor no Ministério', 'MINISTERIO', 'text-yellow-600')}
                    {renderPartSection('Nossa Vida Cristã', 'VIDA_CRISTA', 'text-red-600')}

                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-4 max-w-5xl mx-auto print:hidden">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-8 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium shadow-lg text-lg"
                        >
                            {saving ? 'Salvando...' : 'Salvar Designações'}
                        </button>
                    </div>
                </div >
            </div >
        </div >
    )
}
