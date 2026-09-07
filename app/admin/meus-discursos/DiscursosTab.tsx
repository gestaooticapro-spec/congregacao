'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabaseClient'
import { checkConflicts, conflictMessage } from '@/lib/conflictCheck'
import { getCongregationDate } from '@/lib/dateUtils'
import { compareTemas, temaCodigo, temaLinha } from '@/lib/temaLabel'

type Tema = { id: string; numero: number | null; titulo: string; tipo?: string; ano?: number | null; is_paused?: boolean }

type MeuDiscurso = {
    id: string
    tipo: 'LOCAL' | 'FORA'
    data: string
    horario?: string | null
    tema_id: string
    tema: { numero: number | null; titulo: string; tipo?: string; ano?: number | null }
    cantico?: number | null
    tem_midia?: boolean
    destino_congregacao?: string
    destino_cidade?: string
}

type Filtro = 'proximos' | 'tudo'

type TemaResumo = { id?: string; numero: number | null; titulo: string; tipo?: string; ano?: number | null }

function formatHorario(horario?: string | null) {
    if (!horario) return ''
    return horario.slice(0, 5)
}

function unwrapTema(tema: TemaResumo | TemaResumo[] | null | undefined): TemaResumo | null {
    if (!tema) return null
    return Array.isArray(tema) ? tema[0] ?? null : tema
}

function errorMessage(error: unknown, fallback: string) {
    if (typeof error === 'object' && error && 'message' in error) {
        const message = (error as { message: unknown }).message
        if (typeof message === 'string' && message) return message
    }
    return fallback
}

export default function DiscursosTab({ membroId, membroNome }: { membroId: string; membroNome: string }) {
    const [loading, setLoading] = useState(true)
    const [discursos, setDiscursos] = useState<MeuDiscurso[]>([])
    const [filtro, setFiltro] = useState<Filtro>('proximos')
    const [congregacaoLocal, setCongregacaoLocal] = useState('esta congregação')
    const [cidadeLocal, setCidadeLocal] = useState('')

    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [tipo, setTipo] = useState<'LOCAL' | 'FORA'>('LOCAL')
    const [data, setData] = useState('')
    const [horario, setHorario] = useState('')
    const [temaId, setTemaId] = useState('')
    const [cantico, setCantico] = useState('')
    const [temMidia, setTemMidia] = useState(false)
    const [cidade, setCidade] = useState('')
    const [congregacao, setCongregacao] = useState('')
    const [temasPreparados, setTemasPreparados] = useState<Tema[]>([])

    const hoje = getCongregationDate()
    const discursosVisiveis = filtro === 'tudo'
        ? discursos
        : discursos.filter(d => d.data >= hoje)

    const fetchDiscursos = useCallback(async () => {
        setLoading(true)
        try {
            const [locaisRes, foraRes, dadosRes] = await Promise.all([
                supabase
                    .from('agenda_discursos_locais')
                    .select('id, data, tema_id, cantico, tem_midia, tema:temas(numero, titulo, tipo, ano)')
                    .eq('orador_local_id', membroId)
                    .order('data', { ascending: true }),
                supabase
                    .from('agenda_discursos_fora')
                    .select('id, data, horario, tema_id, destino_cidade, destino_congregacao, tema:temas(numero, titulo, tipo, ano)')
                    .eq('orador_id', membroId)
                    .order('data', { ascending: true }),
                supabase
                    .from('dados_congregacao')
                    .select('nome, cidade')
                    .eq('id', true)
                    .maybeSingle(),
            ])

            if (locaisRes.error) throw locaisRes.error
            if (foraRes.error) throw foraRes.error

            if (dadosRes.data?.nome) setCongregacaoLocal(dadosRes.data.nome)
            if (dadosRes.data?.cidade) setCidadeLocal(dadosRes.data.cidade)

            const locais: MeuDiscurso[] = (locaisRes.data || []).flatMap(item => {
                const tema = unwrapTema(item.tema)
                if (!tema) return []
                return [{
                    id: item.id,
                    tipo: 'LOCAL' as const,
                    data: item.data,
                    tema_id: item.tema_id,
                    tema: { numero: tema.numero, titulo: tema.titulo, tipo: tema.tipo, ano: tema.ano },
                    cantico: item.cantico,
                    tem_midia: item.tem_midia,
                }]
            })

            const fora: MeuDiscurso[] = (foraRes.data || []).flatMap(item => {
                const tema = unwrapTema(item.tema)
                if (!tema) return []
                return [{
                    id: item.id,
                    tipo: 'FORA' as const,
                    data: item.data,
                    horario: item.horario,
                    tema_id: item.tema_id,
                    tema: { numero: tema.numero, titulo: tema.titulo, tipo: tema.tipo, ano: tema.ano },
                    destino_cidade: item.destino_cidade,
                    destino_congregacao: item.destino_congregacao,
                }]
            })

            setDiscursos(
                [...locais, ...fora].sort((a, b) => a.data.localeCompare(b.data) || (a.horario || '').localeCompare(b.horario || ''))
            )
        } catch (error) {
            console.error('Erro ao buscar discursos:', error)
            alert('Erro ao carregar seus discursos')
        } finally {
            setLoading(false)
        }
    }, [membroId])

    const fetchTemasPreparados = useCallback(async () => {
        const { data: rows } = await supabase
            .from('membros_temas')
            .select('is_paused, tema:temas(id, numero, titulo, tipo, ano)')
            .eq('membro_id', membroId)

        const temas: Tema[] = []
        for (const item of rows || []) {
            const tema = unwrapTema(item.tema)
            if (!tema?.id) continue
            if (item.is_paused && tema.id !== temaId) continue
            temas.push({ id: tema.id, numero: tema.numero, titulo: tema.titulo, tipo: tema.tipo, ano: tema.ano })
        }
        temas.sort(compareTemas)
        setTemasPreparados(temas)
    }, [membroId, temaId])

    useEffect(() => {
        fetchDiscursos()
    }, [fetchDiscursos])

    useEffect(() => {
        if (showModal) fetchTemasPreparados()
    }, [showModal, fetchTemasPreparados])

    const resetForm = () => {
        setEditingId(null)
        setTipo('LOCAL')
        setData('')
        setHorario('')
        setTemaId('')
        setCantico('')
        setTemMidia(false)
        setCidade('')
        setCongregacao('')
    }

    const openNew = () => {
        resetForm()
        setShowModal(true)
    }

    const handleEdit = (discurso: MeuDiscurso) => {
        setEditingId(discurso.id)
        setTipo(discurso.tipo)
        setData(discurso.data)
        setHorario(formatHorario(discurso.horario))
        setTemaId(discurso.tema_id)
        setCantico(discurso.cantico?.toString() || '')
        setTemMidia(discurso.tem_midia || false)
        setCidade(discurso.destino_cidade || '')
        setCongregacao(discurso.destino_congregacao || '')
        setShowModal(true)
    }

    const handleDelete = async (discurso: MeuDiscurso) => {
        if (!confirm('Tem certeza que deseja excluir este agendamento?')) return

        try {
            const table = discurso.tipo === 'LOCAL' ? 'agenda_discursos_locais' : 'agenda_discursos_fora'
            const ownerColumn = discurso.tipo === 'LOCAL' ? 'orador_local_id' : 'orador_id'
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', discurso.id)
                .eq(ownerColumn, membroId)

            if (error) throw error
            fetchDiscursos()
        } catch (error) {
            console.error(error)
            alert('Erro ao excluir')
        }
    }

    const handleSave = async () => {
        if (!data || !temaId) {
            alert('Preencha a data e o tema')
            return
        }
        if (tipo === 'FORA' && (!horario || !cidade.trim() || !congregacao.trim())) {
            alert('Para discurso em outra congregação, preencha horário, cidade e congregação')
            return
        }

        try {
            const conflicts = await checkConflicts(data, membroId, {
                ignoreLocalTalkId: tipo === 'LOCAL' ? editingId : null,
                ignoreAwayTalkId: tipo === 'FORA' ? editingId : null,
            })
            if (conflicts.length > 0) {
                alert(conflictMessage(membroNome, conflicts))
                return
            }
        } catch (error) {
            alert(errorMessage(error, 'Não foi possível verificar os conflitos desta data.'))
            return
        }

        if (tipo === 'LOCAL') {
            const { data: existingList, error: existingError } = await supabase
                .from('agenda_discursos_locais')
                .select('id')
                .eq('data', data)

            if (existingError) {
                alert('Não foi possível conferir se já existe discurso nesta data.')
                return
            }
            if ((existingList || []).some(item => item.id !== editingId)) {
                alert('Já existe um discurso público agendado nesta data na congregação.')
                return
            }
        }

        setSaving(true)
        try {
            if (tipo === 'LOCAL') {
                const payload = {
                    data,
                    orador_local_id: membroId,
                    orador_visitante_id: null,
                    tema_id: temaId,
                    cantico: cantico ? parseInt(cantico, 10) : null,
                    tem_midia: temMidia,
                }

                if (editingId) {
                    const { error } = await supabase
                        .from('agenda_discursos_locais')
                        .update(payload)
                        .eq('id', editingId)
                        .eq('orador_local_id', membroId)
                    if (error) throw error
                } else {
                    const { error } = await supabase.from('agenda_discursos_locais').insert(payload)
                    if (error) throw error
                }
            } else {
                const payload = {
                    data,
                    horario,
                    orador_id: membroId,
                    tema_id: temaId,
                    destino_cidade: cidade.trim(),
                    destino_congregacao: congregacao.trim(),
                }

                if (editingId) {
                    const { error } = await supabase
                        .from('agenda_discursos_fora')
                        .update(payload)
                        .eq('id', editingId)
                        .eq('orador_id', membroId)
                    if (error) throw error
                } else {
                    const { error } = await supabase.from('agenda_discursos_fora').insert(payload)
                    if (error) throw error
                }
            }

            setShowModal(false)
            resetForm()
            fetchDiscursos()
        } catch (error) {
            console.error(error)
            alert('Erro ao salvar: ' + errorMessage(error, 'tente novamente'))
        } finally {
            setSaving(false)
        }
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
                        onClick={openNew}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto"
                    >
                        + Novo Discurso
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

            <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {loading ? (
                    <div className="text-center py-12 text-slate-500">Carregando...</div>
                ) : (
                    <>
                        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                            {discursosVisiveis.map(d => (
                                <div key={`${d.tipo}-${d.id}`} className="p-4 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                {format(new Date(d.data + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                                            </p>
                                            {d.tipo === 'FORA' && d.horario ? (
                                                <p className="text-xs text-slate-500">{formatHorario(d.horario)}</p>
                                            ) : null}
                                        </div>
                                        <div className="flex items-center shrink-0">
                                            <button type="button" onClick={() => handleEdit(d)} className="p-2" title="Editar">✏️</button>
                                            <button type="button" onClick={() => handleDelete(d)} className="p-2" title="Excluir">🗑️</button>
                                        </div>
                                    </div>
                                    {d.tipo === 'LOCAL' ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                                            🏠 {congregacaoLocal}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                                            ✈️ {d.destino_congregacao}{d.destino_cidade ? ` · ${d.destino_cidade}` : ''}
                                        </span>
                                    )}
                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                                        <span className="font-bold text-primary">{temaCodigo(d.tema)}</span>{' '}
                                        {d.tema.titulo}
                                    </p>
                                </div>
                            ))}
                            {discursosVisiveis.length === 0 && (
                                <div className="p-8 text-center text-slate-500">
                                    {filtro === 'proximos'
                                        ? 'Nenhum discurso futuro. Use “Mostrar Tudo” para ver o histórico.'
                                        : 'Nenhum discurso agendado.'}
                                </div>
                            )}
                        </div>

                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-slate-500 dark:text-slate-400 text-sm border-b border-slate-100 dark:border-slate-800">
                                        <th className="py-3 px-4 font-bold">Data</th>
                                        <th className="py-3 px-4 font-bold">Onde</th>
                                        <th className="py-3 px-4 font-bold">Tema</th>
                                        <th className="py-3 px-4 font-bold text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {discursosVisiveis.map(d => (
                                        <tr key={`${d.tipo}-${d.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="py-3 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                <div className="font-medium">{format(new Date(d.data + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</div>
                                                {d.tipo === 'FORA' && d.horario ? (
                                                    <div className="text-xs text-slate-500">{formatHorario(d.horario)}</div>
                                                ) : null}
                                            </td>
                                            <td className="py-3 px-4">
                                                {d.tipo === 'LOCAL' ? (
                                                    <>
                                                        <div className="font-semibold text-slate-900 dark:text-white">🏠 {congregacaoLocal}</div>
                                                        {cidadeLocal ? <div className="text-xs text-slate-500">{cidadeLocal}</div> : null}
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="font-semibold text-slate-900 dark:text-white">✈️ {d.destino_congregacao}</div>
                                                        <div className="text-xs text-slate-500">{d.destino_cidade}</div>
                                                    </>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-primary">{temaCodigo(d.tema)}</span>
                                                    <span className="text-sm text-slate-600 dark:text-slate-400 break-words">{d.tema.titulo}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <button onClick={() => handleEdit(d)} className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-lg transition-colors">✏️</button>
                                                <button onClick={() => handleDelete(d)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors">🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {discursosVisiveis.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-slate-500">
                                                {filtro === 'proximos'
                                                    ? 'Nenhum discurso futuro. Use “Mostrar Tudo” para ver o histórico.'
                                                    : 'Nenhum discurso agendado.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
                        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
                            {editingId ? 'Editar Discurso' : 'Novo Discurso'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Onde você vai falar?</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            checked={tipo === 'LOCAL'}
                                            disabled={!!editingId}
                                            onChange={() => setTipo('LOCAL')}
                                        />
                                        Na congregação
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            checked={tipo === 'FORA'}
                                            disabled={!!editingId}
                                            onChange={() => setTipo('FORA')}
                                        />
                                        Em outra congregação
                                    </label>
                                </div>
                            </div>

                            <div className={tipo === 'FORA' ? 'flex gap-4' : ''}>
                                <div className="flex-1">
                                    <label className="block text-sm font-bold mb-1">Data</label>
                                    <input
                                        type="date"
                                        value={data}
                                        onChange={e => setData(e.target.value)}
                                        className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                    />
                                </div>
                                {tipo === 'FORA' && (
                                    <div className="w-32">
                                        <label className="block text-sm font-bold mb-1">Horário</label>
                                        <input
                                            type="time"
                                            value={horario}
                                            onChange={e => setHorario(e.target.value)}
                                            className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1">Tema</label>
                                <select
                                    value={temaId}
                                    onChange={e => setTemaId(e.target.value)}
                                    className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                >
                                    <option value="">Selecione...</option>
                                    {temasPreparados.map(t => (
                                        <option key={t.id} value={t.id}>{temaLinha(t)}</option>
                                    ))}
                                </select>
                                {temasPreparados.length === 0 && (
                                    <p className="text-xs text-slate-500 mt-1">Cadastre um tema na aba Temas antes de agendar.</p>
                                )}
                            </div>

                            {tipo === 'LOCAL' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-bold mb-1">Cântico</label>
                                        <input
                                            type="number"
                                            value={cantico}
                                            onChange={e => setCantico(e.target.value)}
                                            className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                        />
                                    </div>
                                    <label className="flex items-center space-x-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={temMidia}
                                            onChange={e => setTemMidia(e.target.checked)}
                                            className="h-5 w-5 text-primary border-slate-300 rounded-md"
                                        />
                                        <span className="text-slate-700 dark:text-slate-300 font-medium">Tem imagens ou vídeos?</span>
                                    </label>
                                </>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold mb-1">Cidade</label>
                                        <input
                                            type="text"
                                            value={cidade}
                                            onChange={e => setCidade(e.target.value)}
                                            className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1">Congregação</label>
                                        <input
                                            type="text"
                                            value={congregacao}
                                            onChange={e => setCongregacao(e.target.value)}
                                            className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => { setShowModal(false); resetForm() }}
                                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                            >
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
