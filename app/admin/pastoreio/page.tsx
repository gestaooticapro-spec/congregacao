'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'
import { useRouter } from 'next/navigation'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { Info, AlertTriangle, Loader2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import PastoreioCalendar from '@/components/pastoreio/PastoreioCalendar'
import PastoreioDayModal from '@/components/pastoreio/PastoreioDayModal'
import { getCongregationDate } from '@/lib/dateUtils'
import { isVisitaAtrasada, isYmd, situacaoVisita, type SituacaoVisita } from '@/lib/pastoreioDates'

type Membro = Database['public']['Tables']['membros']['Row']
type AbaPastoreio = 'calendario' | 'grupo'

function formatDateBR(dateStr: string | null): string {
    if (!dateStr) return '—'
    const d = parseISO(dateStr)
    if (!isValid(d)) return '—'
    return format(d, 'dd/MM/yyyy', { locale: ptBR })
}

const COR_DO_NOME: Record<SituacaoVisita, string> = {
    marcada: 'text-blue-600 dark:text-blue-400',
    recente: 'text-green-600 dark:text-green-400',
    seisMeses: 'text-yellow-600 dark:text-yellow-300',
    umAno: 'text-red-600 dark:text-red-400',
}

const LEGENDA_DO_NOME: Record<SituacaoVisita, string> = {
    marcada: 'Visita marcada',
    recente: 'Visitado há menos de 6 meses',
    seisMeses: 'Visitado há mais de 6 meses',
    umAno: 'Sem visita há mais de 1 ano, ou nunca visitado',
}

function mesDaCongregacao(): { year: number, month: number } {
    const [year, month] = getCongregationDate().split('-').map(Number)
    return { year, month }
}

export default function PastoreioPage() {
    const router = useRouter()
    const hoje = getCongregationDate()
    const [membros, setMembros] = useState<Membro[]>([])
    const [membrosSalvos, setMembrosSalvos] = useState<Membro[]>([])
    const [loading, setLoading] = useState(true)
    const [savingId, setSavingId] = useState<string | null>(null)
    const [observacoes, setObservacoes] = useState<Record<string, string>>({})
    const [sgNome, setSgNome] = useState<string>('')
    const [papel, setPapel] = useState<'Superintendente' | 'Ajudante'>('Superintendente')
    const [popoverOpen, setPopoverOpen] = useState<string | null>(null)
    const [mes, setMes] = useState(mesDaCongregacao)
    const [aba, setAba] = useState<AbaPastoreio>('calendario')
    const [diaAberto, setDiaAberto] = useState<string | null>(null)
    const [scrollParaId, setScrollParaId] = useState<string | null>(null)

    useEffect(() => {
        fetchMembros()
    }, [])

    const fetchMembros = async () => {
        setLoading(true)
        try {
            // Identifica o SG logado
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            const { data: sgData, error: sgError } = await supabase
                .from('membros')
                .select('id, nome_completo, grupo_id, is_sg, is_ajudante')
                .eq('user_id', user.id)
                .single()

            if (sgError || !sgData) {
                toast.error('Não foi possível identificar o membro logado.', { duration: 4000 })
                router.push('/')
                return
            }

            const { data: grupo } = await supabase
                .from('grupos_servico')
                .select('id, nome, superintendente_id, ajudante_id')
                .or(`superintendente_id.eq.${sgData.id},ajudante_id.eq.${sgData.id}`)
                .maybeSingle()

            const isOverseer = !!(sgData.is_sg || grupo?.superintendente_id === sgData.id)
            const isAssistant = !!(sgData.is_ajudante || grupo?.ajudante_id === sgData.id)

            if (!isOverseer && !isAssistant) {
                toast.error('Acesso restrito a Superintendentes de Grupo e ajudantes.', { duration: 4000 })
                router.push('/')
                return
            }

            setPapel(isOverseer ? 'Superintendente' : 'Ajudante')
            setSgNome(sgData.nome_completo)

            const grupoId = sgData.grupo_id || grupo?.id
            if (!grupoId) {
                toast.error('Este irmão não possui grupo de serviço vinculado.', { duration: 4000 })
                setLoading(false)
                return
            }

            const { data: membrosData, error: membrosError } = await supabase
                .from('membros')
                .select('*')
                .eq('grupo_id', grupoId)
                .eq('ativo', true)
                .eq('is_anciao', false)
                .neq('id', sgData.id)
                .order('nome_completo')

            if (membrosError) throw membrosError
            const lista = membrosData || []
            setMembros(lista)
            setMembrosSalvos(lista)

        } catch (error) {
            console.error('Erro ao buscar membros:', error)
            toast.error('Erro ao carregar dados.')
        } finally {
            setLoading(false)
        }
    }

    const handleSalvarVisita = async (membro: Membro) => {
        const obs = observacoes[membro.id] || ''
        if (!obs.trim()) {
            toast.error('Preencha as observações para confirmar a visita.')
            return
        }

        setSavingId(membro.id)
        try {
            // Atualiza: proxima_visita = null, ultima_visita = hoje, ultima_visita_obs = texto
            const hoje = getCongregationDate()
            const { error } = await supabase
                .from('membros')
                .update({
                    ultima_visita: hoje,
                    ultima_visita_obs: obs,
                    ...(membro.proxima_visita ? { proxima_visita: null } : {}),
                })
                .eq('id', membro.id)

            if (error) throw error
            toast.success(`Visita de ${membro.nome_civil || membro.nome_completo} confirmada!`)
            setObservacoes(prev => {
                const next = { ...prev }
                delete next[membro.id]
                return next
            })
            // Recarrega a lista
            await fetchMembros()
        } catch (error) {
            console.error('Erro ao confirmar visita:', error)
            toast.error('Erro ao salvar.')
        } finally {
            setSavingId(null)
        }
    }

    const handleDateChange = (membroId: string, newDate: string) => {
        setMembros(prev =>
            prev.map(m => m.id === membroId ? { ...m, proxima_visita: newDate || null } : m)
        )
    }

    const handleSaveDate = async (membro: Membro) => {
        setSavingId(membro.id)
        try {
            const { error } = await supabase
                .from('membros')
                .update({ proxima_visita: membro.proxima_visita || null })
                .eq('id', membro.id)

            if (error) throw error
            toast.success('Data atualizada!')
            await fetchMembros()
        } catch (error) {
            console.error('Erro ao atualizar data:', error)
            toast.error('Erro ao salvar data.')
        } finally {
            setSavingId(null)
        }
    }

    useEffect(() => {
        if (aba !== 'grupo' || !scrollParaId) return
        const targetId = window.matchMedia('(min-width: 768px)').matches
            ? `pastoreio-row-${scrollParaId}`
            : `pastoreio-card-${scrollParaId}`
        const frame = requestAnimationFrame(() => {
            document.getElementById(targetId)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
            setScrollParaId(null)
        })
        return () => cancelAnimationFrame(frame)
    }, [aba, scrollParaId])

    const overdueMembers = useMemo(
        () => membrosSalvos.filter(membro => isVisitaAtrasada(membro.proxima_visita, membro.ultima_visita, hoje)),
        [membrosSalvos, hoje],
    )

    const visitasDoMes = useMemo(
        () => membrosSalvos.flatMap(membro => {
            if (!isYmd(membro.proxima_visita)) return []
            const [year, month] = membro.proxima_visita.split('-').map(Number)
            if (year !== mes.year || month !== mes.month) return []
            return [{
                id: membro.id,
                nome: membro.nome_civil || membro.nome_completo,
                data: membro.proxima_visita,
                atrasada: isVisitaAtrasada(membro.proxima_visita, membro.ultima_visita, hoje),
            }]
        }),
        [membrosSalvos, mes, hoje],
    )

    const visitasDoDia = useMemo(
        () => membrosSalvos.flatMap(membro => {
            if (!diaAberto || membro.proxima_visita !== diaAberto || !isYmd(membro.proxima_visita)) return []
            return [{
                id: membro.id,
                nome: membro.nome_civil || membro.nome_completo,
                atrasada: isVisitaAtrasada(membro.proxima_visita, membro.ultima_visita, hoje),
            }]
        }),
        [membrosSalvos, diaAberto, hoje],
    )

    const semData = useMemo(
        () => membrosSalvos.filter(membro => !isYmd(membro.proxima_visita)).length,
        [membrosSalvos],
    )

    const mudarMes = (delta: number) => {
        setMes(atual => {
            const cursor = new Date(atual.year, atual.month - 1 + delta, 1)
            return { year: cursor.getFullYear(), month: cursor.getMonth() + 1 }
        })
    }

    const verNaLista = (id: string) => {
        setAba('grupo')
        setScrollParaId(id)
        setDiaAberto(null)
    }

    const abaAtiva = 'px-4 py-2 rounded-md text-sm font-medium transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
    const abaInativa = 'px-4 py-2 rounded-md text-sm font-medium transition-all text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'

    const atrasadaSalva = (id: string) => {
        const salvo = membrosSalvos.find(item => item.id === id)
        if (!salvo) return false
        return isVisitaAtrasada(salvo.proxima_visita, salvo.ultima_visita, hoje)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 p-4">
            <PageHeader
                className="mb-2"
                title="Gestão de Pastoreio"
                subtitle={
                    <>
                        {papel}:{' '}
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{sgNome}</span>
                        {' · '}
                        {membros.length} membro{membros.length !== 1 ? 's' : ''} no grupo
                    </>
                }
                backHref="/anciaos"
                backLabel="Anciãos"
                actions={
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setAba('calendario')}
                            className={aba === 'calendario' ? abaAtiva : abaInativa}
                        >
                            Calendário
                        </button>
                        <button
                            type="button"
                            onClick={() => setAba('grupo')}
                            className={aba === 'grupo' ? abaAtiva : abaInativa}
                        >
                            Grupo
                        </button>
                    </div>
                }
            />

            {/* Aviso */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                    <strong>Atenção:</strong> Não inclua dados confidenciais nas observações.
                    Registre apenas informações gerais sobre a conversa e o bem-estar espiritual do membro.
                </p>
            </div>

            {/* Alerta de visitas atrasadas */}
            {overdueMembers.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                        <h3 className="font-semibold text-red-800">Visitas pendentes (D+2 ou mais)</h3>
                    </div>
                    <p className="text-sm text-red-700 mb-2">
                        As visitas abaixo estão com data agendada há mais de 2 dias e ainda não foram registradas.
                        Por favor, remarque a data ou confirme a visita.
                    </p>
                    <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                        {overdueMembers.map(m => (
                            <li key={m.id}>
                                <span className="font-medium">{m.nome_civil || m.nome_completo}</span>
                                {' — '}Agendada: {formatDateBR(m.proxima_visita)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {aba === 'calendario' ? (
                <PastoreioCalendar
                    year={mes.year}
                    month={mes.month}
                    hoje={hoje}
                    visitas={visitasDoMes}
                    totalMembros={membrosSalvos.length}
                    semData={semData}
                    onPrev={() => mudarMes(-1)}
                    onNext={() => mudarMes(1)}
                    onDayClick={setDiaAberto}
                    onVerGrupo={() => setAba('grupo')}
                />
            ) : (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <ul className="flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-200 dark:border-slate-800 px-3 py-2 text-xs">
                    {(['umAno', 'seisMeses', 'recente', 'marcada'] as SituacaoVisita[]).map(situacao => (
                        <li key={situacao} className={`font-medium ${COR_DO_NOME[situacao]}`}>
                            {LEGENDA_DO_NOME[situacao]}
                        </li>
                    ))}
                </ul>
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {membros.map(membro => {
                        const nome = membro.nome_civil || membro.nome_completo
                        const situacao = situacaoVisita(membro.ultima_visita, membro.proxima_visita, hoje)
                        const temOverdue = atrasadaSalva(membro.id)
                        const isPopoverOpen = popoverOpen === membro.id

                        return (
                            <div id={`pastoreio-card-${membro.id}`} key={membro.id} className="p-4 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className={`font-medium leading-tight ${COR_DO_NOME[situacao]}`} title={LEGENDA_DO_NOME[situacao]}>{nome}</p>
                                    {temOverdue && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                                </div>

                                <div>
                                    <p className="text-[11px] uppercase font-semibold text-slate-400 mb-1">Última visita</p>
                                    {membro.ultima_visita ? (
                                        <div className="relative inline-block">
                                            <button
                                                type="button"
                                                onClick={() => setPopoverOpen(isPopoverOpen ? null : membro.id)}
                                                className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300"
                                            >
                                                <span>{formatDateBR(membro.ultima_visita)}</span>
                                                <Info className="w-3.5 h-3.5 text-blue-500" />
                                            </button>
                                            {isPopoverOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setPopoverOpen(null)} />
                                                    <div className="absolute z-20 left-0 top-full mt-2 w-64 max-w-[80vw] bg-slate-800 text-white text-xs rounded-lg p-3 shadow-xl">
                                                        {membro.ultima_visita_obs ? (
                                                            <>
                                                                <p className="font-semibold mb-1">Observação:</p>
                                                                <p className="whitespace-pre-wrap">{membro.ultima_visita_obs}</p>
                                                            </>
                                                        ) : (
                                                            <p>Sem observações registradas.</p>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-sm text-slate-400">—</span>
                                    )}
                                </div>

                                <div>
                                    <p className="text-[11px] uppercase font-semibold text-slate-400 mb-1">Próxima visita</p>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="date"
                                            value={membro.proxima_visita || ''}
                                            onChange={e => handleDateChange(membro.id, e.target.value)}
                                            className={`flex-1 min-w-0 text-xs border rounded px-2 py-1.5 ${
                                                temOverdue
                                                    ? 'border-red-400 bg-red-50 text-red-700'
                                                    : 'border-slate-300 bg-white text-slate-800'
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleSaveDate(membro)}
                                            disabled={savingId === membro.id || !membro.proxima_visita}
                                            className="shrink-0 text-xs text-blue-600 font-medium disabled:opacity-50"
                                        >
                                            {savingId === membro.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (membro.proxima_visita ? '✓' : 'Agendar')}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[11px] uppercase font-semibold text-slate-400 mb-1">Observações</p>
                                    <textarea
                                        value={observacoes[membro.id] || ''}
                                        onChange={e =>
                                            setObservacoes(prev => ({
                                                ...prev,
                                                [membro.id]: e.target.value,
                                            }))
                                        }
                                        placeholder="Registre o que foi conversado..."
                                        rows={2}
                                        className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 resize-none text-slate-800 placeholder:text-slate-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleSalvarVisita(membro)}
                                        disabled={savingId === membro.id || !(observacoes[membro.id] || '').trim()}
                                        className="mt-2 w-full text-xs bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {savingId === membro.id ? 'Salvando...' : 'Salvar visita'}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left p-3 font-semibold text-slate-700">Nome</th>
                                <th className="text-left p-3 font-semibold text-slate-700 w-40">Última Visita</th>
                                <th className="text-left p-3 font-semibold text-slate-700 w-40">Próxima Visita</th>
                                <th className="text-left p-3 font-semibold text-slate-700">Observações da Visita</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {membros.map(membro => {
                                const nome = membro.nome_civil || membro.nome_completo
                                const situacao = situacaoVisita(membro.ultima_visita, membro.proxima_visita, hoje)
                                const temOverdue = atrasadaSalva(membro.id)
                                const popoverId = `popover-${membro.id}`
                                const isPopoverOpen = popoverOpen === membro.id

                                return (
                                    <tr id={`pastoreio-row-${membro.id}`} key={membro.id} className="hover:bg-slate-50/50">
                                        {/* Nome */}
                                        <td className="p-3">
                                            <span className={`font-medium ${COR_DO_NOME[situacao]}`} title={LEGENDA_DO_NOME[situacao]}>{nome}</span>
                                        </td>

                                        {/* Última Visita */}
                                        <td className="p-3">
                                            {membro.ultima_visita ? (
                                                <div className="relative inline-block">
                                                    <button
                                                        onClick={() =>
                                                            setPopoverOpen(isPopoverOpen ? null : membro.id)
                                                        }
                                                        className="flex items-center gap-1 text-slate-700 hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400 transition-colors"
                                                    >
                                                        <span>{formatDateBR(membro.ultima_visita)}</span>
                                                        <Info className="w-3.5 h-3.5 text-blue-500" />
                                                    </button>
                                                    {/* Popover */}
                                                    {isPopoverOpen && membro.ultima_visita_obs && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-10"
                                                                onClick={() => setPopoverOpen(null)}
                                                            />
                                                            <div
                                                                id={popoverId}
                                                                className="absolute z-20 left-0 top-full mt-2 w-64 bg-slate-800 text-white text-xs rounded-lg p-3 shadow-xl"
                                                            >
                                                                <p className="font-semibold mb-1">Observação:</p>
                                                                <p className="whitespace-pre-wrap">{membro.ultima_visita_obs}</p>
                                                            </div>
                                                        </>
                                                    )}
                                                    {isPopoverOpen && !membro.ultima_visita_obs && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-10"
                                                                onClick={() => setPopoverOpen(null)}
                                                            />
                                                            <div
                                                                className="absolute z-20 left-0 top-full mt-2 w-48 bg-slate-800 text-white text-xs rounded-lg p-3 shadow-xl"
                                                            >
                                                                <p>Sem observações registradas.</p>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>

                                        {/* Próxima Visita */}
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="date"
                                                    value={membro.proxima_visita || ''}
                                                    onChange={e => handleDateChange(membro.id, e.target.value)}
                                                    className={`text-xs border rounded px-2 py-1 ${
                                                        temOverdue
                                                            ? 'border-red-400 bg-red-50 text-red-700'
                                                            : 'border-slate-300 bg-white text-slate-800'
                                                    }`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveDate(membro)}
                                                    disabled={savingId === membro.id || !membro.proxima_visita}
                                                    className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                                >
                                                    {savingId === membro.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : membro.proxima_visita ? (
                                                        '✓'
                                                    ) : (
                                                        'Agendar'
                                                    )}
                                                </button>
                                                {temOverdue && (
                                                    <>
                                                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                                                        <span className="sr-only">Visita pendente - remarque a data</span>
                                                    </>
                                                )}
                                            </div>
                                        </td>

                                        {/* Observações */}
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <textarea
                                                    value={observacoes[membro.id] || ''}
                                                    onChange={e =>
                                                        setObservacoes(prev => ({
                                                            ...prev,
                                                            [membro.id]: e.target.value,
                                                        }))
                                                    }
                                                    placeholder="Registre o que foi conversado..."
                                                    rows={1}
                                                    className="w-full text-xs border border-slate-300 rounded px-2 py-1 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder:text-slate-400"
                                                />
                                                <button
                                                    onClick={() => handleSalvarVisita(membro)}
                                                    disabled={
                                                        savingId === membro.id ||
                                                        !(observacoes[membro.id] || '').trim()
                                                    }
                                                    className="shrink-0 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                                                >
                                                    {savingId === membro.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        'Salvar'
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {membros.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        Nenhum membro ativo neste grupo.
                    </div>
                )}
            </div>
            )}

            {diaAberto && visitasDoDia.length > 0 && (
                <PastoreioDayModal
                    data={diaAberto}
                    visitas={visitasDoDia}
                    onClose={() => setDiaAberto(null)}
                    onVerNaLista={verNaLista}
                />
            )}
        </div>
    )
}
