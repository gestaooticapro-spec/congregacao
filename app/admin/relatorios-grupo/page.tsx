'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthProvider'
import { toast } from 'react-hot-toast'
import {
    Users,
    CheckCircle2,
    XCircle,
    Calendar,
    ChevronDown,
    Shield,
    Clock,
    Star
} from 'lucide-react'
import { format, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Database } from '@/types/database.types'

type Membro = Database['public']['Tables']['membros']['Row']
type Relatorio = Database['public']['Tables']['relatorios_servico']['Row']

interface RelatorioView {
    membro: Membro
    relatorio: Relatorio | null
}

const getMonthOptions = () => {
    const now = new Date()
    const currentMonth = startOfMonth(now)
    const prevMonth = startOfMonth(subMonths(now, 1))
    const prevPrevMonth = startOfMonth(subMonths(now, 2))

    return [
        { value: format(prevMonth, 'yyyy-MM-dd'), label: format(prevMonth, 'MMMM yyyy', { locale: ptBR }) },
        { value: format(currentMonth, 'yyyy-MM-dd'), label: format(currentMonth, 'MMMM yyyy', { locale: ptBR }) },
        { value: format(prevPrevMonth, 'yyyy-MM-dd'), label: format(prevPrevMonth, 'MMMM yyyy', { locale: ptBR }) }
    ]
}

export default function RelatoriosGrupoPage() {
    const { user } = useAuth()
    const [isLoading, setIsLoading] = useState(true)
    const [meses] = useState(getMonthOptions())
    const [mes, setMes] = useState(meses[0].value)
    const [membrosGrupo, setMembrosGrupo] = useState<RelatorioView[]>([])
    const [nomeGrupo, setNomeGrupo] = useState('')

    // Estado do Modal
    const [membroEditando, setMembroEditando] = useState<RelatorioView | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [formRelatorio, setFormRelatorio] = useState({
        participou: true,
        estudos: 0,
        horas: 0,
        is_pioneiro_auxiliar: false
    })

    const handleOpenModal = (view: RelatorioView) => {
        setMembroEditando(view)
        setFormRelatorio({
            participou: view.relatorio ? (view.relatorio.trabalhou ?? true) : true,
            estudos: view.relatorio?.estudos || 0,
            horas: view.relatorio?.horas || 0,
            is_pioneiro_auxiliar: view.relatorio?.is_pioneiro_auxiliar || false
        })
    }

    const handleSaveRelatorio = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!membroEditando) return

        setIsSaving(true)
        try {
            const isPioneiroRegular = membroEditando.membro.is_pioneiro
            const isAuxiliar = formRelatorio.is_pioneiro_auxiliar
            const isPioneiro = isPioneiroRegular || isAuxiliar

            const payload = {
                membro_id: membroEditando.membro.id,
                mes: mes,
                trabalhou: formRelatorio.participou,
                estudos: formRelatorio.estudos,
                horas: isPioneiro ? formRelatorio.horas : (formRelatorio.horas > 0 ? formRelatorio.horas : null),
                is_pioneiro_auxiliar: isAuxiliar
            }

            if (membroEditando.relatorio?.id) {
                const { error } = await supabase
                    .from('relatorios_servico')
                    .update(payload)
                    .eq('id', membroEditando.relatorio.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('relatorios_servico')
                    .insert([payload])
                if (error) throw error
            }

            toast.success('Relatório salvo com sucesso!')
            setMembroEditando(null)
            
            // Update local state without reload
            setMembrosGrupo(prev => prev.map(m => {
                if (m.membro.id === membroEditando.membro.id) {
                    return {
                        ...m,
                        relatorio: {
                            ...m.relatorio,
                            ...payload,
                            id: m.relatorio?.id || 'temp-id'
                        } as Relatorio
                    }
                }
                return m
            }))
        } catch (error) {
            console.error(error)
            toast.error('Erro ao salvar o relatório.')
        } finally {
            setIsSaving(false)
        }
    }

    // Se é admin, deve poder escolher o grupo. Por hora vamos fazer pro próprio grupo
    useEffect(() => {
        if (!user) return

        const fetchDados = async () => {
            setIsLoading(true)
            try {
                // Descobre de qual grupo o cara logado é dirigente (superintendente) ou ajudante
                // Por hora, vamos pegar os membros do MESMO grupo_id do usuário logado (Dirigente ou não)
                // O ideal é validar se ele é dirigente, mas para MVP vamos mostrar do próprio grupo_id

                const { data: logadoInfo } = await supabase
                    .from('membros')
                    .select('grupo_id')
                    .eq('user_id', user.id)
                    .single()

                const grupoId = logadoInfo?.grupo_id

                if (!grupoId) {
                    toast.error('Você não pertence a um grupo de serviço.')
                    setIsLoading(false)
                    return
                }

                // 1. Pegar info do Grupo
                const { data: grpData } = await supabase
                    .from('grupos_servico')
                    .select('nome')
                    .eq('id', grupoId)
                    .single()

                if (grpData) setNomeGrupo(grpData.nome)

                // 2. Pegar membros do mesmo grupo (ativos, publicadores/pioneiros)
                const { data: membros, error: erroMembros } = await supabase
                    .from('membros')
                    .select('*')
                    .eq('grupo_id', grupoId)
                    .eq('ativo', true)
                    .order('nome_completo')

                if (erroMembros) throw erroMembros

                // 3. Pegar os relatórios ddesse mês
                const membroIds = membros?.map(m => m.id) || []

                const { data: rels } = await supabase
                    .from('relatorios_servico')
                    .select('*')
                    .in('membro_id', membroIds)
                    .eq('mes', mes)

                const viewData: RelatorioView[] = (membros || []).map(m => ({
                    membro: m,
                    relatorio: rels?.find(r => r.membro_id === m.id) || null
                }))

                setMembrosGrupo(viewData)

            } catch (err) {
                console.error(err)
                toast.error('Erro ao carregar os dados.')
            } finally {
                setIsLoading(false)
            }
        }

        fetchDados()
    }, [user, mes])

    if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>

    const entregues = membrosGrupo.filter(v => v.relatorio).length
    const total = membrosGrupo.length
    const pgs = Math.round((entregues / total) * 100) || 0

    const prEntregues = membrosGrupo.filter(v => v.membro.is_pioneiro && v.relatorio).length
    const paEntregues = membrosGrupo.filter(v => (!v.membro.is_pioneiro) && v.relatorio?.is_pioneiro_auxiliar).length

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <Users className="w-6 h-6 text-blue-600" />
                        Relatórios do {nomeGrupo || 'Grupo'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Acompanhe a entrega dos relatórios do seu grupo de serviço.
                    </p>
                </div>

                <div className="flex bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2 items-center gap-2 shadow-sm">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <select
                        value={mes}
                        onChange={e => setMes(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 dark:text-gray-300 py-1 cursor-pointer capitalize"
                    >
                        {meses.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total do Grupo</p>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{total}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Entregues</p>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{entregues}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 mt-auto">
                        <div className="bg-green-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${pgs}%` }}></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pendentes</p>
                            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{total - entregues}</h3>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600 dark:text-red-400">
                            <XCircle className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pioneiros Relatados</p>
                            <div className="flex gap-4 mt-2">
                                <div className="text-center">
                                    <span className="block text-xl font-bold text-amber-600 dark:text-amber-500">{prEntregues}</span>
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Regulares</span>
                                </div>
                                <div className="text-center">
                                    <span className="block text-xl font-bold text-blue-600 dark:text-blue-500">{paEntregues}</span>
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Auxiliares</span>
                                </div>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <Star className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Lista de Membros */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30">
                                <th className="py-4 px-6 font-medium text-sm text-gray-500 dark:text-gray-400">Publicador</th>
                                <th className="py-4 px-6 font-medium text-sm text-gray-500 dark:text-gray-400 text-center">PIN</th>
                                <th className="py-4 px-6 font-medium text-sm text-gray-500 dark:text-gray-400">Status</th>
                                <th className="py-4 px-6 font-medium text-sm text-gray-500 dark:text-gray-400">Horas</th>
                                <th className="py-4 px-6 font-medium text-sm text-gray-500 dark:text-gray-400">Estudos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {membrosGrupo.map(({ membro, relatorio }) => (
                                <tr 
                                    key={membro.id} 
                                    onClick={() => handleOpenModal({ membro, relatorio })}
                                    className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors cursor-pointer"
                                >
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 text-sm font-medium shadow-sm">
                                                {membro.nome_completo.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{membro.nome_completo}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {membro.is_pioneiro && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                                                            Pioneiro Regular
                                                        </span>
                                                    )}
                                                    {relatorio?.is_pioneiro_auxiliar && (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                                                            Pioneiro Auxiliar
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg border border-blue-100 dark:border-blue-800/50">
                                            {membro.pin || '----'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        {relatorio ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/30">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Entregue
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400">
                                                <Clock className="w-3.5 h-3.5" /> Pendente
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-300">
                                        {relatorio ? (
                                            // Se for normal, ver se trabalhou ou não (se trabalhou vai aparecer check, se não, traço)
                                            (membro.is_pioneiro || relatorio.is_pioneiro_auxiliar)
                                                ? <span className="font-semibold text-gray-900 dark:text-white">{relatorio.horas || 0}</span>
                                                : (relatorio.trabalhou ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : '-')
                                        ) : '-'}
                                    </td>
                                    <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-300">
                                        {relatorio ? (
                                            <span className="font-semibold text-gray-900 dark:text-white">{relatorio.estudos || 0}</span>
                                        ) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {membrosGrupo.length === 0 && (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            Nenhum membro encontrado neste grupo.
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Lançamento Local */}
            {membroEditando && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start p-6 border-b border-gray-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Relatório de {membroEditando.membro.nome_completo}</h3>
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">
                                    Referente a <span className="capitalize">{meses.find(m => m.value === mes)?.label}</span>
                                </p>
                            </div>
                            <button onClick={() => setMembroEditando(null)} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveRelatorio} className="p-6 space-y-4">
                            {!membroEditando.membro.is_pioneiro && (
                                <label className="flex items-center gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 rounded-xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={formRelatorio.is_pioneiro_auxiliar}
                                        onChange={e => setFormRelatorio(prev => ({ ...prev, is_pioneiro_auxiliar: e.target.checked }))}
                                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                                    />
                                    <span className="font-medium text-blue-900 dark:text-blue-300">Pioneiro Auxiliar neste mês</span>
                                </label>
                            )}

                            <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors border border-transparent dark:border-slate-700">
                                <input 
                                    type="checkbox" 
                                    checked={formRelatorio.participou}
                                    onChange={e => setFormRelatorio(prev => ({ ...prev, participou: e.target.checked }))}
                                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-900 border-gray-300 dark:border-slate-600"
                                />
                                <span className="font-medium text-gray-700 dark:text-gray-300">Participou no Ministério</span>
                            </label>

                            {(membroEditando.membro.is_pioneiro || formRelatorio.is_pioneiro_auxiliar) && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Horas</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        required
                                        value={formRelatorio.horas || ''}
                                        onChange={e => setFormRelatorio(prev => ({ ...prev, horas: parseInt(e.target.value) || 0 }))}
                                        className="w-full p-3 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder="Ex: 50"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Diferentes Estudos Bíblicos Dirigidos</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={formRelatorio.estudos || ''}
                                    onChange={e => setFormRelatorio(prev => ({ ...prev, estudos: parseInt(e.target.value) || 0 }))}
                                    className="w-full p-3 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Ex: 2"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all"
                            >
                                {isSaving ? 'Salvando...' : 'Salvar Relatório'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
