'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import PageHeader from '@/components/PageHeader'
import Link from 'next/link'
import { checkConflicts, conflictMessage } from '@/lib/conflictCheck'

type DiscursoLocal = Database['public']['Tables']['agenda_discursos_locais']['Row'] & {
    tema: { numero: number, titulo: string },
    orador_local?: { nome_completo: string },
    orador_visitante?: { nome: string, congregacao: string, cidade: string, telefone: string },
    hospitalidade?: { nome_completo: string },
    hospitalidade_id?: string
}

type DiscursoFora = Database['public']['Tables']['agenda_discursos_fora']['Row'] & {
    tema: { numero: number, titulo: string },
    orador: { nome_completo: string }
}

import TemasPreparadosTab from './TemasPreparadosTab'

type FiltroDiscursos = 'proximos' | 'tudo'

function filtrarDiscursos<T extends { data: string }>(itens: T[], filtro: FiltroDiscursos) {
    if (filtro === 'tudo') return itens
    const hoje = format(new Date(), 'yyyy-MM-dd')
    return itens.filter(item => item.data >= hoje)
}

export default function DiscursosPage() {
    const [activeTab, setActiveTab] = useState<'LOCAIS' | 'FORA' | 'TEMAS_PREPARADOS'>('LOCAIS')
    const [loading, setLoading] = useState(true)

    // Data Lists
    const [discursosLocais, setDiscursosLocais] = useState<DiscursoLocal[]>([])
    const [discursosFora, setDiscursosFora] = useState<DiscursoFora[]>([])
    const [oradoresIncompletos, setOradoresIncompletos] = useState(0)

    const fetchOradoresIncompletos = async () => {
        const { data } = await supabase.from('oradores_visitantes').select('id, congregacao')
        const quantidade = (data || []).filter(orador => {
            const congregacao = (orador.congregacao || '').trim()
            return !congregacao || congregacao === 'A definir'
        }).length
        setOradoresIncompletos(quantidade)
    }

    useEffect(() => {
        fetchData()
        fetchOradoresIncompletos()
    }, [activeTab])

    const fetchData = async () => {
        setLoading(true)
        try {
            if (activeTab === 'LOCAIS') {
                const { data, error } = await supabase
                    .from('agenda_discursos_locais')
                    .select(`
                        *,
                        tema:temas(numero, titulo),
                        orador_local:membros!agenda_discursos_locais_orador_local_id_fkey(nome_completo),
                        orador_visitante:oradores_visitantes(nome, congregacao, cidade, telefone),
                        hospitalidade:membros!agenda_discursos_locais_hospitalidade_id_fkey(nome_completo)
                    `)
                    .order('data', { ascending: true })

                if (error) throw error
                setDiscursosLocais(data as any)
            } else {
                const { data, error } = await supabase
                    .from('agenda_discursos_fora')
                    .select(`
                        *,
                        tema:temas(numero, titulo),
                        orador:membros(nome_completo)
                    `)
                    .order('data', { ascending: true })

                if (error) throw error
                setDiscursosFora(data as any)
            }
        } catch (error) {
            console.error('Erro ao buscar dados:', error)
            alert('Erro ao carregar discursos')
        } finally {
            setLoading(false)
            fetchOradoresIncompletos()
        }
    }

    return (
        <div className="w-full min-w-0">
            <PageHeader
                className="mb-6"
                title="Gestão de Discursos"
                backHref="/responsabilidades"
                backLabel="Responsabilidades"
            />

            <div className="w-full min-w-0 grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
                <button
                    type="button"
                    onClick={() => setActiveTab('LOCAIS')}
                    className={`px-1.5 sm:px-4 py-2 rounded-lg font-semibold text-[11px] sm:text-sm leading-tight text-center transition-all ${activeTab === 'LOCAIS'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                >
                    🏠 Na Congregação
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('FORA')}
                    className={`px-1.5 sm:px-4 py-2 rounded-lg font-semibold text-[11px] sm:text-sm leading-tight text-center transition-all ${activeTab === 'FORA'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                >
                    ✈️ Discursos Fora
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('TEMAS_PREPARADOS')}
                    className={`px-1.5 sm:px-4 py-2 rounded-lg font-semibold text-[11px] sm:text-sm leading-tight text-center transition-all ${activeTab === 'TEMAS_PREPARADOS'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                >
                    📚 Temas Preparados
                </button>
            </div>

            {oradoresIncompletos > 0 && (
                <Link
                    href="/admin/cadastros?aba=visitantes"
                    className="mb-6 flex items-start gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100/70 dark:hover:bg-amber-900/30 transition-colors"
                >
                    <span className="text-xl leading-none mt-0.5" aria-hidden>⚠️</span>
                    <div className="min-w-0">
                        <p className="font-semibold text-amber-900 dark:text-amber-200">
                            {oradoresIncompletos} {oradoresIncompletos === 1 ? 'orador com cadastro incompleto' : 'oradores com cadastro incompleto'}
                        </p>
                        <p className="text-sm text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                            Sem congregação cadastrada. Toque para completar em Cadastros.
                        </p>
                    </div>
                </Link>
            )}

            <div className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 overflow-hidden min-w-0">
                {loading ? (
                    <div className="text-center py-12 text-slate-500">Carregando...</div>
                ) : (
                    <>
                        {activeTab === 'LOCAIS' ? (
                            <DiscursosLocaisList discursos={discursosLocais} onUpdate={fetchData} />
                        ) : activeTab === 'FORA' ? (
                            <DiscursosForaList discursos={discursosFora} onUpdate={fetchData} />
                        ) : (
                            <TemasPreparadosTab />
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

function DiscursosLocaisList({ discursos, onUpdate }: { discursos: DiscursoLocal[], onUpdate: () => void }) {
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [filtro, setFiltro] = useState<FiltroDiscursos>('proximos')
    const discursosVisiveis = filtrarDiscursos(discursos, filtro)

    // Form Data
    const [data, setData] = useState('')
    const [tipoOrador, setTipoOrador] = useState<'LOCAL' | 'VISITANTE'>('LOCAL')
    const [oradorLocalId, setOradorLocalId] = useState('')
    const [oradorVisitanteId, setOradorVisitanteId] = useState('')
    const [temaNumero, setTemaNumero] = useState('') // Used for Visitors
    const [temaId, setTemaId] = useState('') // Used for Locals
    const [cantico, setCantico] = useState('')
    const [temMidia, setTemMidia] = useState(false)
    const [hospitalidadeId, setHospitalidadeId] = useState('')
    const [hospitalidadeSearch, setHospitalidadeSearch] = useState('')

    // Search State
    const [temaSearch, setTemaSearch] = useState('')

    // Quick Add Theme State
    const [showThemeModal, setShowThemeModal] = useState(false)
    const [quickThemeSearch, setQuickThemeSearch] = useState('')
    const [quickThemeId, setQuickThemeId] = useState('')

    // Quick Add Visitor State
    const [showVisitorModal, setShowVisitorModal] = useState(false)
    const [visitorSaving, setVisitorSaving] = useState(false)
    const [visitorNome, setVisitorNome] = useState('')
    const [visitorCongregacao, setVisitorCongregacao] = useState('')
    const [visitorCidade, setVisitorCidade] = useState('')
    const [visitorTelefone, setVisitorTelefone] = useState('')


    // Lists
    const [membros, setMembros] = useState<{ id: string, nome_completo: string }[]>([])
    const [todosMembros, setTodosMembros] = useState<{ id: string, nome_completo: string }[]>([])
    const [visitantes, setVisitantes] = useState<{ id: string, nome: string, congregacao: string, cidade: string }[]>([])
    const [temasPreparados, setTemasPreparados] = useState<{ id: string, numero: number, titulo: string }[]>([])
    const [allTemas, setAllTemas] = useState<{ id: string, numero: number, titulo: string }[]>([])

    useEffect(() => {
        if (showModal) {
            fetchOptions()
        }
    }, [showModal])

    useEffect(() => {
        if (oradorLocalId && tipoOrador === 'LOCAL') {
            fetchTemasPreparados(oradorLocalId)
        } else {
            setTemasPreparados([])
        }
    }, [oradorLocalId, tipoOrador])

    const fetchOptions = async () => {
        const { data: m } = await supabase
            .from('membros')
            .select('id, nome_completo')
            .or('is_anciao.eq.true,is_servo_ministerial.eq.true')
            .order('nome_completo')
        setMembros(m || [])

        const { data: allM } = await supabase
            .from('membros')
            .select('id, nome_completo')
            .order('nome_completo')
        setTodosMembros(allM || [])

        const { data: v } = await supabase.from('oradores_visitantes').select('id, nome, congregacao, cidade').order('nome')
        setVisitantes(v || [])
        const { data: t } = await supabase.from('temas').select('id, numero, titulo').order('numero')
        setAllTemas(t || [])
    }

    const fetchTemasPreparados = async (membroId: string) => {
        const { data } = await supabase
            .from('membros_temas')
            .select('tema:temas(id, numero, titulo)')
            .eq('membro_id', membroId)

        if (data) {
            const temas = data.map((item: any) => item.tema).sort((a: any, b: any) => a.numero - b.numero)
            setTemasPreparados(temas)
        }
    }

    const openVisitorModal = () => {
        setVisitorNome('')
        setVisitorCongregacao('')
        setVisitorCidade('')
        setVisitorTelefone('')
        setShowVisitorModal(true)
    }

    const handleQuickAddVisitor = async () => {
        if (!visitorNome.trim() || !visitorCongregacao.trim() || !visitorCidade.trim()) {
            alert('Preencha Nome, Congregação e Cidade')
            return
        }

        setVisitorSaving(true)
        try {
            const { data, error } = await supabase
                .from('oradores_visitantes')
                .insert({
                    nome: visitorNome.trim(),
                    congregacao: visitorCongregacao.trim(),
                    cidade: visitorCidade.trim(),
                    telefone: visitorTelefone.trim() || null
                })
                .select()
                .single()

            if (error) throw error
            setVisitantes(prev => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)))
            setOradorVisitanteId(data.id)
            setTipoOrador('VISITANTE')
            setShowVisitorModal(false)
        } catch (error) {
            console.error(error)
            alert('Erro ao cadastrar visitante')
        } finally {
            setVisitorSaving(false)
        }
    }

    const handleLocalSpeakerChange = async (membroId: string) => {
        if (!membroId) {
            setOradorLocalId('')
            return
        }

        try {
            const conflicts = await checkConflicts(data, membroId, { ignoreLocalTalkId: editingId })
            if (conflicts.length > 0) {
                const memberName = membros.find(member => member.id === membroId)?.nome_completo || 'Este irmão'
                alert(conflictMessage(memberName, conflicts))
                return
            }
        } catch (error: any) {
            alert(error.message || 'Não foi possível verificar os conflitos desta data.')
            return
        }

        setOradorLocalId(membroId)
    }

    const handleSave = async () => {
        if (!data || (!oradorLocalId && !oradorVisitanteId)) {
            alert('Preencha os campos obrigatórios')
            return
        }

        if (tipoOrador === 'LOCAL' && !temaId) {
            alert('Selecione um tema')
            return
        }
        if (tipoOrador === 'VISITANTE' && !temaId) {
            alert('Selecione um tema')
            return
        }

        if (tipoOrador === 'LOCAL' && oradorLocalId) {
            try {
                const conflicts = await checkConflicts(data, oradorLocalId, { ignoreLocalTalkId: editingId })
                if (conflicts.length > 0) {
                    const memberName = membros.find(member => member.id === oradorLocalId)?.nome_completo || 'Este irmão'
                    alert(conflictMessage(memberName, conflicts))
                    return
                }
            } catch (error: any) {
                alert(error.message || 'Não foi possível verificar os conflitos desta data.')
                return
            }
        }

        setSaving(true)
        try {
            // Save Talk
            const payload = {
                data,
                orador_local_id: tipoOrador === 'LOCAL' ? oradorLocalId : null,
                orador_visitante_id: tipoOrador === 'VISITANTE' ? oradorVisitanteId : null,
                tema_id: temaId,
                cantico: cantico ? parseInt(cantico) : null,
                tem_midia: temMidia,
                hospitalidade_id: tipoOrador === 'VISITANTE' && hospitalidadeId ? hospitalidadeId : null
            }

            if (editingId) {
                const { error } = await supabase.from('agenda_discursos_locais').update(payload).eq('id', editingId)
                if (error) throw error
            } else {
                const { error } = await supabase.from('agenda_discursos_locais').insert(payload)
                if (error) throw error
            }



            setShowModal(false)
            resetForm()
            onUpdate()
            alert('Agendamento criado!')

        } catch (error: any) {
            console.error(error)
            alert('Erro ao salvar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este agendamento?')) return

        try {
            const { error } = await supabase.from('agenda_discursos_locais').delete().eq('id', id)
            if (error) throw error
            onUpdate()
        } catch (error) {
            console.error(error)
            alert('Erro ao excluir')
        }
    }

    const handleAssociateTheme = async () => {
        if (!oradorLocalId || !quickThemeId) return

        try {
            const { error } = await supabase
                .from('membros_temas')
                .insert({ membro_id: oradorLocalId, tema_id: quickThemeId })

            if (error) throw error

            await fetchTemasPreparados(oradorLocalId)
            setTemaId(quickThemeId)
            setShowThemeModal(false)
            setQuickThemeId('')
            setQuickThemeSearch('')
            alert('Tema associado com sucesso!')
        } catch (error) {
            console.error(error)
            alert('Erro ao associar tema')
        }
    }

    const handleEdit = (discurso: DiscursoLocal) => {
        setEditingId(discurso.id)
        setData(discurso.data)
        setCantico(discurso.cantico?.toString() || '')
        setTemMidia(discurso.tem_midia || false)

        if (discurso.orador_local_id) {
            setTipoOrador('LOCAL')
            setOradorLocalId(discurso.orador_local_id)
            setTemaId(discurso.tema_id)
        } else {
            setTipoOrador('VISITANTE')
            setOradorVisitanteId(discurso.orador_visitante_id || '')
            setTemaId(discurso.tema_id)
            setTemaSearch(`#${discurso.tema.numero} - ${discurso.tema.titulo}`)
            if (discurso.hospitalidade_id) {
                setHospitalidadeId(discurso.hospitalidade_id)
                setHospitalidadeSearch(discurso.hospitalidade?.nome_completo || '')
            }
        }
        setShowModal(true)
    }

    const handleWhatsApp = async (discurso: DiscursoLocal) => {
        try {
            // 1. Find the meeting chairman
            let presidenteId = null

            // Try designacoes_suporte first (Priority for Weekend/Scales)
            const { data: suporte } = await supabase
                .from('designacoes_suporte')
                .select('membro_id')
                .eq('data', discurso.data)
                .eq('funcao', 'PRESIDENTE')
                .maybeSingle()

            if (suporte?.membro_id) {
                presidenteId = suporte.membro_id
            } else {
                // Fallback to programacao_semanal (Midweek or if not in support scale)
                const { data: programacao } = await supabase
                    .from('programacao_semanal')
                    .select('presidente_id')
                    .eq('data_reuniao', discurso.data)
                    .maybeSingle()

                if (programacao?.presidente_id) {
                    presidenteId = programacao.presidente_id
                }
            }

            let phone = ''
            if (presidenteId) {
                const { data: presidente } = await supabase
                    .from('membros')
                    .select('contato')
                    .eq('id', presidenteId)
                    .single()
                if (presidente?.contato) {
                    phone = presidente.contato.replace(/\D/g, '')
                }
            }

            // 2. Construct message
            const oradorNome = discurso.orador_local ? discurso.orador_local.nome_completo : discurso.orador_visitante?.nome
            const midiaTexto = discurso.tem_midia ? "O irmão terá imagens ou vídeos no discurso" : "O irmão não terá imagens nem vídeos no discurso"

            const message = `*Discurso Público - ${format(new Date(discurso.data + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}*
            
Orador: ${oradorNome}
Tema: #${discurso.tema.numero} - ${discurso.tema.titulo}
Cântico: ${discurso.cantico || 'A definir'}

${midiaTexto}`

            // 3. Open WhatsApp
            const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
            window.open(url, '_blank')

        } catch (error) {
            console.error(error)
            alert('Erro ao preparar mensagem do WhatsApp')
        }
    }

    const resetForm = () => {
        setEditingId(null)
        setData('')
        setOradorLocalId('')
        setOradorVisitanteId('')
        setTemaNumero('')
        setTemaId('')
        setCantico('')
        setTemaSearch('')
        setTemaSearch('')
        setTemMidia(false)
        setHospitalidadeId('')
        setHospitalidadeSearch('')
    }

    const getWhatsAppUrl = (membroId: string, nome: string, data: string, id: string) => {
        if (!membroId) return ''
        const date = new Date(data).toLocaleDateString('pt-BR')
        let message = `Olá ${nome}!\nVocê foi designado(a) para cuidar da hospedagem/lanche do orador visitante no dia: ${date}`

        // Add confirmation link
        // We need the ID of the discourse assignment. 
        // If it's a new assignment (not saved yet), we can't generate the link properly without saving first.
        // But for existing ones in the list, we can.

        if (id) {
            const link = `${window.location.origin}/confirmar?id=${id}&membro=${membroId}&type=hospitalidade`
            message += `\n\nClique no link pra confirmar:\n\n${link}`
        }

        return `https://wa.me/?text=${encodeURIComponent(message)}`
    }

    return (
        <div>
            <div className="flex flex-col gap-3 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
                        {filtro === 'proximos' ? 'Próximos Discursos' : 'Todos os Discursos'}
                    </h2>
                    <button
                        type="button"
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto"
                    >
                        + Novo Agendamento
                    </button>
                </div>
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-full sm:w-fit">
                    <button
                        type="button"
                        onClick={() => setFiltro('proximos')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filtro === 'proximos'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                    >
                        Próximos
                    </button>
                    <button
                        type="button"
                        onClick={() => setFiltro('tudo')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filtro === 'tudo'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                    >
                        Mostrar Tudo
                    </button>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
                        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">{editingId ? 'Editar Discurso (Local)' : 'Novo Discurso (Local)'}</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Data</label>
                                <input type="date" value={data} onChange={e => setData(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1">Tipo de Orador</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2">
                                        <input type="radio" checked={tipoOrador === 'LOCAL'} onChange={() => setTipoOrador('LOCAL')} />
                                        Local
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="radio" checked={tipoOrador === 'VISITANTE'} onChange={() => setTipoOrador('VISITANTE')} />
                                        Visitante
                                    </label>
                                </div>
                            </div>

                            {tipoOrador === 'LOCAL' ? (
                                <div>
                                    <label className="block text-sm font-bold mb-1">Orador</label>
                                    <select value={oradorLocalId} onChange={e => void handleLocalSpeakerChange(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700">
                                        <option value="">Selecione...</option>
                                        {membros.map(m => <option key={m.id} value={m.id}>{m.nome_completo}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-bold mb-1">Visitante</label>
                                    <div className="flex gap-2">
                                        <select value={oradorVisitanteId} onChange={e => setOradorVisitanteId(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700">
                                            <option value="">Selecione...</option>
                                            {visitantes.map(v => <option key={v.id} value={v.id}>{v.nome} ({v.congregacao} - {v.cidade})</option>)}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={openVisitorModal}
                                            className="px-3 py-2 bg-green-100 text-green-700 rounded-lg font-bold hover:bg-green-200"
                                            title="Cadastrar novo visitante"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            )}



                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold mb-1">Tema</label>
                                    {tipoOrador === 'LOCAL' ? (
                                        <div className="flex gap-2">
                                            <select
                                                value={temaId}
                                                onChange={e => setTemaId(e.target.value)}
                                                className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                                disabled={!oradorLocalId}
                                            >
                                                <option value="">Selecione...</option>
                                                {temasPreparados.map(t => (
                                                    <option key={t.id} value={t.id}>#{t.numero} - {t.titulo}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    console.log('Opening Quick Theme Modal')
                                                    setShowThemeModal(true)
                                                }}
                                                disabled={!oradorLocalId}
                                                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
                                                title="Adicionar tema para este orador"
                                                type="button"
                                            >
                                                +
                                            </button>
                                            {!oradorLocalId && <p className="text-xs text-slate-500 mt-1">Selecione um orador primeiro.</p>}
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={temaSearch}
                                                onChange={e => setTemaSearch(e.target.value)}
                                                placeholder="Buscar tema (nº ou título)..."
                                                className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                            />
                                            {temaSearch && !temaId && (
                                                <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto z-10 mt-1">
                                                    {allTemas
                                                        .filter(t => t.numero.toString().includes(temaSearch) || t.titulo.toLowerCase().includes(temaSearch.toLowerCase()))
                                                        .map(t => (
                                                            <button
                                                                key={t.id}
                                                                onClick={() => {
                                                                    setTemaId(t.id)
                                                                    setTemaSearch(`#${t.numero} - ${t.titulo}`)
                                                                }}
                                                                className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
                                                            >
                                                                <span className="font-bold text-primary">#{t.numero}</span> - {t.titulo}
                                                            </button>
                                                        ))}
                                                    {allTemas.filter(t => t.numero.toString().includes(temaSearch) || t.titulo.toLowerCase().includes(temaSearch.toLowerCase())).length === 0 && (
                                                        <div className="p-3 text-sm text-slate-500 text-center">Nenhum tema encontrado.</div>
                                                    )}
                                                </div>
                                            )}
                                            {temaId && (
                                                <button
                                                    onClick={() => {
                                                        setTemaId('')
                                                        setTemaSearch('')
                                                    }}
                                                    className="absolute right-2 top-2 text-slate-400 hover:text-red-500"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="w-24">
                                    <label className="block text-sm font-bold mb-1">Cântico</label>
                                    <input type="number" value={cantico} onChange={e => setCantico(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-transparent hover:border-primary/20 transition-all cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={temMidia}
                                        onChange={(e) => setTemMidia(e.target.checked)}
                                        className="h-5 w-5 text-primary border-slate-300 rounded-md focus:ring-primary transition-all"
                                    />
                                    <span className="text-slate-700 dark:text-slate-300 font-medium">Tem imagens ou vídeos?</span>
                                </label>
                            </div>

                            {tipoOrador === 'VISITANTE' && (
                                <div>
                                    <label className="block text-sm font-bold mb-1">Lanche (Hospitalidade)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={hospitalidadeSearch}
                                            onChange={e => {
                                                setHospitalidadeSearch(e.target.value)
                                                if (!e.target.value) setHospitalidadeId('')
                                            }}
                                            placeholder="Buscar irmão(ã) para o lanche..."
                                            className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                        />
                                        {hospitalidadeSearch && !hospitalidadeId && (
                                            <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto z-10 mt-1">
                                                {todosMembros
                                                    .filter(m => m.nome_completo.toLowerCase().includes(hospitalidadeSearch.toLowerCase()))
                                                    .map(m => (
                                                        <button
                                                            key={m.id}
                                                            onClick={() => {
                                                                setHospitalidadeId(m.id)
                                                                setHospitalidadeSearch(m.nome_completo)
                                                            }}
                                                            className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
                                                        >
                                                            {m.nome_completo}
                                                        </button>
                                                    ))}
                                                {todosMembros.filter(m => m.nome_completo.toLowerCase().includes(hospitalidadeSearch.toLowerCase())).length === 0 && (
                                                    <div className="p-3 text-sm text-slate-500 text-center">Nenhum membro encontrado.</div>
                                                )}
                                            </div>
                                        )}
                                        {hospitalidadeId && (
                                            <button
                                                onClick={() => {
                                                    setHospitalidadeId('')
                                                    setHospitalidadeSearch('')
                                                }}
                                                className="absolute right-2 top-2 text-slate-400 hover:text-red-500"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* Quick Add Visitor Modal */}
            {showVisitorModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800">
                        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Novo Orador</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Nome</label>
                                <input autoFocus type="text" value={visitorNome} onChange={e => setVisitorNome(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Congregação</label>
                                <input type="text" value={visitorCongregacao} onChange={e => setVisitorCongregacao(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Cidade</label>
                                <input type="text" value={visitorCidade} onChange={e => setVisitorCidade(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Telefone</label>
                                <input type="tel" value={visitorTelefone} onChange={e => setVisitorTelefone(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button type="button" onClick={() => setShowVisitorModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                            <button type="button" onClick={handleQuickAddVisitor} disabled={visitorSaving} className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
                                {visitorSaving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Add Theme Modal */}
            {showThemeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800">
                        <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Adicionar Tema ao Orador</h3>
                        <p className="text-sm text-slate-500 mb-4">Selecione um tema para adicionar à lista de temas preparados deste orador.</p>

                        <div className="mb-6 relative">
                            <input
                                type="text"
                                value={quickThemeSearch}
                                onChange={e => setQuickThemeSearch(e.target.value)}
                                placeholder="Buscar tema (nº ou título)..."
                                className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                autoFocus
                            />
                            {quickThemeSearch && !quickThemeId && (
                                <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto z-10 mt-1">
                                    {allTemas
                                        .filter(t => t.numero.toString().includes(quickThemeSearch) || t.titulo.toLowerCase().includes(quickThemeSearch.toLowerCase()))
                                        .map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => {
                                                    setQuickThemeId(t.id)
                                                    setQuickThemeSearch(`#${t.numero} - ${t.titulo}`)
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm"
                                            >
                                                <span className="font-bold text-primary">#{t.numero}</span> - {t.titulo}
                                            </button>
                                        ))}
                                    {allTemas.filter(t => t.numero.toString().includes(quickThemeSearch) || t.titulo.toLowerCase().includes(quickThemeSearch.toLowerCase())).length === 0 && (
                                        <div className="p-3 text-sm text-slate-500 text-center">Nenhum tema encontrado.</div>
                                    )}
                                </div>
                            )}
                            {quickThemeId && (
                                <button
                                    onClick={() => {
                                        setQuickThemeId('')
                                        setQuickThemeSearch('')
                                    }}
                                    className="absolute right-2 top-2 text-slate-400 hover:text-red-500"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowThemeModal(false)
                                    setQuickThemeId('')
                                    setQuickThemeSearch('')
                                }}
                                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAssociateTheme}
                                disabled={!quickThemeId}
                                className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                            >
                                Adicionar
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 -mx-4">
                {discursosVisiveis.map(d => {
                    const visitanteIncompleto = !!(d.orador_visitante && (
                        !d.orador_visitante.congregacao || d.orador_visitante.congregacao === 'A definir' ||
                        !d.orador_visitante.cidade || d.orador_visitante.cidade === 'A definir' ||
                        !d.orador_visitante.telefone
                    ))
                    return (
                        <div key={d.id} className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {format(new Date(d.data + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                                </p>
                                <div className="flex items-center shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleWhatsApp(d)}
                                        className="text-green-500 p-2"
                                        title="Enviar WhatsApp para o Presidente"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                            <path fillRule="evenodd" clipRule="evenodd" d="M18.403 5.633A8.919 8.919 0 0 0 12.053 3c-4.948 0-8.976 4.027-8.978 8.977 0 1.582.413 3.126 1.198 4.488L3 21.116l4.759-1.249a8.981 8.981 0 0 0 4.29 1.093h.004c4.947 0 8.975-4.027 8.977-8.977a8.926 8.926 0 0 0-2.627-6.35m-6.35 13.812h-.003a7.446 7.446 0 0 1-3.798-1.041l-.272-.162-2.824.741.753-2.753-.177-.282a7.448 7.448 0 0 1-1.141-3.971c.002-4.114 3.349-7.461 7.465-7.461a7.413 7.413 0 0 1 5.275 2.188 7.42 7.42 0 0 1 2.183 5.279c-.002 4.114-3.349 7.462-7.461 7.462m4.093-5.589c-.225-.113-1.327-.655-1.533-.73-.205-.075-.354-.112-.504.112-.15.224-.579.73-.71.88-.131.149-.262.168-.486.056-.224-.112-.954-.352-1.817-1.122-.673-.6-1.125-1.34-1.257-1.565-.132-.224-.014-.345.098-.458.101-.101.224-.263.336-.395.112-.131.149-.224.224-.374.075-.149.038-.281-.019-.393-.056-.113-.505-1.217-.692-1.666-.181-.435-.366-.377-.504-.383-.13-.006-.28-.006-.429-.006-.15 0-.393.056-.6.28-.206.225-.787.769-.787 1.876 0 1.106.805 2.174.917 2.323.112.15 1.582 2.415 3.832 3.387.536.231.954.369 1.279.473.537.171 1.026.146 1.413.089.431-.064 1.327-.542 1.514-1.066.187-.524.187-.973.131-1.066-.056-.094-.206-.15-.43-.263" />
                                        </svg>
                                    </button>
                                    <button type="button" onClick={() => handleEdit(d)} className="p-2" title="Editar">✏️</button>
                                    <button type="button" onClick={() => handleDelete(d.id)} className="p-2" title="Excluir">🗑️</button>
                                </div>
                            </div>
                            {d.orador_local ? (
                                <p className="font-medium text-slate-800 dark:text-slate-200 leading-tight">{d.orador_local.nome_completo}</p>
                            ) : (
                                <div>
                                    <p className={`font-medium leading-tight ${visitanteIncompleto ? 'text-orange-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                        {d.orador_visitante?.nome}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">{d.orador_visitante?.congregacao} - {d.orador_visitante?.cidade}</p>
                                </div>
                            )}
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                                <span className="font-bold text-primary">#{d.tema.numero}</span>{' '}
                                {d.tema.titulo}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {d.cantico ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                        Cântico {d.cantico}
                                    </span>
                                ) : null}
                                {d.hospitalidade && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                                        ☕ {d.hospitalidade.nome_completo}
                                        <a
                                            href={getWhatsAppUrl(d.hospitalidade_id!, d.hospitalidade.nome_completo, d.data, d.id)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-green-500"
                                            title="Enviar WhatsApp"
                                        >
                                            WA
                                        </a>
                                        {(d as any).hospitalidade_status === 'accepted' && <span title="Aceito">✅</span>}
                                        {(d as any).hospitalidade_status === 'declined' && <span title="Recusado">❌</span>}
                                        {(!(d as any).hospitalidade_status || (d as any).hospitalidade_status === 'pending') && <span title="Pendente">⏳</span>}
                                    </span>
                                )}
                            </div>
                        </div>
                    )
                })}
                {discursosVisiveis.length === 0 && (
                    <div className="p-8 text-center text-slate-500">{filtro === 'proximos' ? 'Nenhum discurso futuro. Use “Mostrar Tudo” para ver o histórico.' : 'Nenhum discurso agendado.'}</div>
                )}
            </div>

            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-slate-500 dark:text-slate-400 text-sm border-b border-slate-100 dark:border-slate-800">
                            <th className="py-3 px-4 font-bold">Data</th>
                            <th className="py-3 px-4 font-bold">Orador</th>
                            <th className="py-3 px-4 font-bold">Tema</th>
                            <th className="py-3 px-4 font-bold">Cântico</th>
                            <th className="py-3 px-4 font-bold text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {discursosVisiveis.map(d => (
                            <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="py-3 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                    {format(new Date(d.data + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                                </td>
                                <td className="py-3 px-4">
                                    {d.orador_local ? (
                                        <span className="font-semibold text-slate-900 dark:text-white">{d.orador_local.nome_completo}</span>
                                    ) : (
                                        <div>
                                            <span className={`font-semibold ${d.orador_visitante && (
                                                !d.orador_visitante.congregacao || d.orador_visitante.congregacao === 'A definir' ||
                                                !d.orador_visitante.cidade || d.orador_visitante.cidade === 'A definir' ||
                                                !d.orador_visitante.telefone
                                            ) ? 'text-orange-500' : 'text-slate-900 dark:text-white'
                                                }`}>
                                                {d.orador_visitante?.nome}
                                            </span>
                                            <span className="block text-xs text-slate-500">{d.orador_visitante?.congregacao} - {d.orador_visitante?.cidade}</span>
                                            {d.hospitalidade && (
                                                <div className="mt-1 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full w-fit">
                                                    <span>☕</span>
                                                    <span className="font-medium">Lanche: {d.hospitalidade.nome_completo}</span>
                                                    <a
                                                        href={getWhatsAppUrl(d.hospitalidade_id!, d.hospitalidade.nome_completo, d.data, d.id)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="ml-2 text-green-500 hover:text-green-600 transition-colors"
                                                        title="Enviar WhatsApp"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                        </svg>
                                                    </a>
                                                    {(d as any).hospitalidade_status === 'accepted' && <span title="Aceito" className="text-green-500 ml-1">✅</span>}
                                                    {(d as any).hospitalidade_status === 'declined' && <span title="Recusado" className="text-red-500 ml-1">❌</span>}
                                                    {(!(d as any).hospitalidade_status || (d as any).hospitalidade_status === 'pending') && <span title="Pendente" className="text-gray-400 ml-1">⏳</span>}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td className="py-3 px-4">
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-primary">#{d.tema.numero}</span>
                                        <span className="text-sm text-slate-600 dark:text-slate-400 break-words">{d.tema.titulo}</span>
                                    </div>
                                </td>
                                <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                                    {d.cantico || '-'}
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => handleWhatsApp(d)}
                                            className="text-green-500 hover:text-green-700 p-2 hover:bg-green-50 rounded-lg transition-colors"
                                            title="Enviar WhatsApp para o Presidente"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                                <path fillRule="evenodd" clipRule="evenodd" d="M18.403 5.633A8.919 8.919 0 0 0 12.053 3c-4.948 0-8.976 4.027-8.978 8.977 0 1.582.413 3.126 1.198 4.488L3 21.116l4.759-1.249a8.981 8.981 0 0 0 4.29 1.093h.004c4.947 0 8.975-4.027 8.977-8.977a8.926 8.926 0 0 0-2.627-6.35m-6.35 13.812h-.003a7.446 7.446 0 0 1-3.798-1.041l-.272-.162-2.824.741.753-2.753-.177-.282a7.448 7.448 0 0 1-1.141-3.971c.002-4.114 3.349-7.461 7.465-7.461a7.413 7.413 0 0 1 5.275 2.188 7.42 7.42 0 0 1 2.183 5.279c-.002 4.114-3.349 7.462-7.461 7.462m4.093-5.589c-.225-.113-1.327-.655-1.533-.73-.205-.075-.354-.112-.504.112-.15.224-.579.73-.71.88-.131.149-.262.168-.486.056-.224-.112-.954-.352-1.817-1.122-.673-.6-1.125-1.34-1.257-1.565-.132-.224-.014-.345.098-.458.101-.101.224-.263.336-.395.112-.131.149-.224.224-.374.075-.149.038-.281-.019-.393-.056-.113-.505-1.217-.692-1.666-.181-.435-.366-.377-.504-.383-.13-.006-.28-.006-.429-.006-.15 0-.393.056-.6.28-.206.225-.787.769-.787 1.876 0 1.106.805 2.174.917 2.323.112.15 1.582 2.415 3.832 3.387.536.231.954.369 1.279.473.537.171 1.026.146 1.413.089.431-.064 1.327-.542 1.514-1.066.187-.524.187-.973.131-1.066-.056-.094-.206-.15-.43-.263" />
                                            </svg>
                                        </button>
                                        <button onClick={() => handleEdit(d)} className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors">✏️</button>
                                        <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {discursosVisiveis.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-500">{filtro === 'proximos' ? 'Nenhum discurso futuro. Use “Mostrar Tudo” para ver o histórico.' : 'Nenhum discurso agendado.'}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div >
    )
}

function DiscursosForaList({ discursos, onUpdate }: { discursos: DiscursoFora[], onUpdate: () => void }) {
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [filtro, setFiltro] = useState<FiltroDiscursos>('proximos')
    const discursosVisiveis = filtrarDiscursos(discursos, filtro)

    // Form Data
    const [data, setData] = useState('')
    const [horario, setHorario] = useState('')
    const [oradorId, setOradorId] = useState('')
    const [temaId, setTemaId] = useState('')
    const [cidade, setCidade] = useState('')
    const [congregacao, setCongregacao] = useState('')

    // Lists
    const [oradores, setOradores] = useState<{ id: string, nome_completo: string }[]>([])
    const [temasOrador, setTemasOrador] = useState<{ id: string, numero: number, titulo: string }[]>([])

    useEffect(() => {
        if (showModal) {
            fetchOradores()
        }
    }, [showModal])

    useEffect(() => {
        if (oradorId) {
            fetchTemasOrador(oradorId)
        } else {
            setTemasOrador([])
        }
    }, [oradorId])

    const fetchOradores = async () => {
        const { data } = await supabase
            .from('membros')
            .select('id, nome_completo')
            .eq('is_discurso_fora', true)
            .order('nome_completo')
        setOradores(data || [])
    }

    const fetchTemasOrador = async (membroId: string) => {
        const { data } = await supabase
            .from('membros_temas')
            .select('tema:temas(id, numero, titulo)')
            .eq('membro_id', membroId)

        if (data) {
            const temas = data.map((item: any) => item.tema).sort((a: any, b: any) => a.numero - b.numero)
            setTemasOrador(temas)
        }
    }

    const handleSave = async () => {
        if (!data || !horario || !oradorId || !temaId || !cidade || !congregacao) {
            alert('Preencha os campos obrigatórios')
            return
        }

        try {
            const conflicts = await checkConflicts(data, oradorId, { ignoreAwayTalkId: editingId })
            if (conflicts.length > 0) {
                const memberName = oradores.find(orador => orador.id === oradorId)?.nome_completo || 'Este irmão'
                alert(conflictMessage(memberName, conflicts))
                return
            }
        } catch (error: any) {
            alert(error.message || 'Não foi possível verificar os conflitos desta data.')
            return
        }

        setSaving(true)
        try {
            const payload = {
                data,
                horario,
                orador_id: oradorId,
                tema_id: temaId,
                destino_cidade: cidade,
                destino_congregacao: congregacao
            }

            if (editingId) {
                const { error } = await supabase.from('agenda_discursos_fora').update(payload).eq('id', editingId)
                if (error) throw error
            } else {
                const { error } = await supabase.from('agenda_discursos_fora').insert(payload)
                if (error) throw error
            }



            setShowModal(false)
            resetForm()
            onUpdate()
            alert('Agendamento salvo!')

        } catch (error: any) {
            console.error(error)
            alert('Erro ao salvar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este agendamento?')) return

        try {
            const { error } = await supabase.from('agenda_discursos_fora').delete().eq('id', id)
            if (error) throw error
            onUpdate()
        } catch (error) {
            console.error(error)
            alert('Erro ao excluir')
        }
    }

    const handleEdit = (discurso: DiscursoFora) => {
        setEditingId(discurso.id)
        setData(discurso.data)
        setHorario(discurso.horario)
        setOradorId(discurso.orador_id)
        setTemaId(discurso.tema_id)
        setCidade(discurso.destino_cidade)
        setCongregacao(discurso.destino_congregacao)
        setShowModal(true)
    }

    const resetForm = () => {
        setEditingId(null)
        setData('')
        setHorario('')
        setOradorId('')
        setTemaId('')
        setCidade('')
        setCongregacao('')
    }

    return (
        <div>
            <div className="flex flex-col gap-3 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
                        {filtro === 'proximos' ? 'Próximos Discursos Fora' : 'Todos os Discursos Fora'}
                    </h2>
                    <button
                        type="button"
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto"
                    >
                        + Novo Agendamento
                    </button>
                </div>
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-full sm:w-fit">
                    <button
                        type="button"
                        onClick={() => setFiltro('proximos')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filtro === 'proximos'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                    >
                        Próximos
                    </button>
                    <button
                        type="button"
                        onClick={() => setFiltro('tudo')}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filtro === 'tudo'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                            }`}
                    >
                        Mostrar Tudo
                    </button>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">{editingId ? 'Editar Discurso (Fora)' : 'Novo Discurso (Fora)'}</h3>

                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold mb-1">Data</label>
                                    <input type="date" value={data} onChange={e => setData(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
                                </div>
                                <div className="w-32">
                                    <label className="block text-sm font-bold mb-1">Horário</label>
                                    <input type="time" value={horario} onChange={e => setHorario(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1">Orador</label>
                                <select value={oradorId} onChange={e => setOradorId(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700">
                                    <option value="">Selecione...</option>
                                    {oradores.map(o => <option key={o.id} value={o.id}>{o.nome_completo}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1">Tema</label>
                                <select value={temaId} onChange={e => setTemaId(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" disabled={!oradorId}>
                                    <option value="">Selecione...</option>
                                    {temasOrador.map(t => <option key={t.id} value={t.id}>#{t.numero} - {t.titulo}</option>)}
                                </select>
                                {!oradorId && <p className="text-xs text-slate-500 mt-1">Selecione um orador primeiro.</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">Cidade</label>
                                    <input type="text" value={cidade} onChange={e => setCidade(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">Congregação</label>
                                    <input type="text" value={congregacao} onChange={e => setCongregacao(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 -mx-4">
                {discursosVisiveis.map(d => (
                    <div key={d.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {format(new Date(d.data + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                                </p>
                                <p className="text-xs text-slate-500">{d.horario.slice(0, 5)}</p>
                            </div>
                            <div className="flex items-center shrink-0">
                                <button type="button" onClick={() => handleEdit(d)} className="p-2" title="Editar">✏️</button>
                                <button type="button" onClick={() => handleDelete(d.id)} className="p-2" title="Excluir">🗑️</button>
                            </div>
                        </div>
                        <p className="font-medium text-slate-800 dark:text-slate-200 leading-tight">{d.orador.nome_completo}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {d.destino_congregacao}
                            {d.destino_cidade ? ` · ${d.destino_cidade}` : ''}
                        </p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                            <span className="font-bold text-primary">#{d.tema.numero}</span>{' '}
                            {d.tema.titulo}
                        </p>
                    </div>
                ))}
                {discursosVisiveis.length === 0 && (
                    <div className="p-8 text-center text-slate-500">{filtro === 'proximos' ? 'Nenhum discurso futuro. Use “Mostrar Tudo” para ver o histórico.' : 'Nenhum discurso agendado.'}</div>
                )}
            </div>

            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-slate-500 dark:text-slate-400 text-sm border-b border-slate-100 dark:border-slate-800">
                            <th className="py-3 px-4 font-bold">Data/Hora</th>
                            <th className="py-3 px-4 font-bold">Orador</th>
                            <th className="py-3 px-4 font-bold">Destino</th>
                            <th className="py-3 px-4 font-bold">Tema</th>
                            <th className="py-3 px-4 font-bold text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {discursosVisiveis.map(d => (
                            <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="py-3 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                    <div className="font-medium">{format(new Date(d.data + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}</div>
                                    <div className="text-xs text-slate-500">{d.horario.slice(0, 5)}</div>
                                </td>
                                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                                    {d.orador.nome_completo}
                                </td>
                                <td className="py-3 px-4">
                                    <div className="text-slate-900 dark:text-white">{d.destino_congregacao}</div>
                                    <div className="text-xs text-slate-500">{d.destino_cidade}</div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-bold text-primary">#{d.tema.numero}</span>
                                        <span className="text-sm text-slate-600 dark:text-slate-400 break-words">{d.tema.titulo}</span>
                                    </div>
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <button onClick={() => handleEdit(d)} className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors">✏️</button>
                                    <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors">🗑️</button>
                                </td>
                            </tr>
                        ))}
                        {discursosVisiveis.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-500">{filtro === 'proximos' ? 'Nenhum discurso futuro. Use “Mostrar Tudo” para ver o histórico.' : 'Nenhum discurso agendado.'}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
