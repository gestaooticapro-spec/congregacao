'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database, Json } from '@/types/database.types'
import { addDays, format, parseISO, startOfWeek, endOfWeek, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { getCongregationDate } from '@/lib/dateUtils'


type Membro = Pick<Database['public']['Tables']['membros']['Row'], 'id' | 'nome_completo' | 'nome_civil' | 'grupo_id' | 'is_anciao' | 'is_pioneiro'>

type Designacao = {
    tipo: 'REUNIAO' | 'SUPORTE' | 'LIMPEZA' | 'CAMPO' | 'DISCURSO' | 'AGENDA'
    data: string
    descricao: string
    detalhe?: string
}

function formatarDescricaoCompromisso(desig: Designacao): string {
    if (desig.tipo !== 'REUNIAO') return desig.descricao
    const match = desig.descricao.match(/^(PARTE|AJUDANTE|LEITOR)\s*-\s*(\d+)/i)
    if (!match) return desig.descricao
    return `${match[1].toUpperCase()} - ${match[2]}`
}

type EscalaLimpezaComGrupo = Pick<Database['public']['Tables']['escala_limpeza']['Row'], 'id' | 'data_inicio' | 'grupo_id'> & {
    grupos_servico?: { nome: string | null } | null
}

type MembroSessao = {
    id: string
    nome?: string
    pin?: string
}

type ParteProgramacao = {
    membro_id?: string | null
    ajudante_id?: string | null
    nome: string
    tipo?: string | null
}

type LancheAgenda = {
    data: string
}

type DiscursoLocalAgenda = {
    data: string
    tema?: {
        titulo?: string | null
    } | null
}

type DiscursoForaAgenda = {
    data: string
    destino_congregacao: string
    tema?: {
        titulo?: string | null
    } | null
}

type EventoAgendaAnciaos = Pick<Database['public']['Tables']['agenda_anciaos']['Row'], 'data_inicio' | 'titulo'>

export default function HomeMemberSearch(): React.ReactNode {
    const router = useRouter()
    const [membros, setMembros] = useState<Membro[]>([])
    const [selectedMembro, setSelectedMembro] = useState<Membro | null>(null)
    const [diasDesignacoes, setDiasDesignacoes] = useState<{ data: string, itens: Designacao[] }[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [showResults, setShowResults] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isSessaoMembroAtiva, setIsSessaoMembroAtiva] = useState(false)
    const [nomeSessao, setNomeSessao] = useState<string | null>(null)
    const [autoSessaoProcessada, setAutoSessaoProcessada] = useState(false)
    const [membroAguardandoPin, setMembroAguardandoPin] = useState<Membro | null>(null)
    const [pin, setPin] = useState('')
    const [pinError, setPinError] = useState<string | null>(null)
    const [validandoPin, setValidandoPin] = useState(false)
    const handleSearchRef = useRef<(membro: Membro) => Promise<void>>(async () => { })

    useEffect(() => {
        fetchMembros()
    }, [])

    const fetchMembros = async () => {
        try {
            const { data, error } = await supabase.rpc('listar_membros_publicos')

            if (error) throw error
            if (data) setMembros(data)
        } catch (error) {
            console.error('Erro ao carregar membros:', error)
            setMembros([])
        }
    }

    useEffect(() => {
        if (autoSessaoProcessada || membros.length === 0) return

        setAutoSessaoProcessada(true)

        const stored = localStorage.getItem('membro_sessao')
        if (!stored) return

        const restoreSession = async () => {
          try {
            const parsed = JSON.parse(stored) as MembroSessao
            if (!parsed?.id) return

            const membroDaSessao = membros.find(membro => membro.id === parsed.id)
            if (!membroDaSessao) return

            if (membroDaSessao.is_pioneiro) {
                if (!parsed.pin) return
                const { data, error } = await supabase.rpc('verificar_pin', { p_pin: parsed.pin })
                if (error || !data?.some((row: { id: string }) => row.id === membroDaSessao.id)) return
            }

            setIsSessaoMembroAtiva(true)
            setNomeSessao(membroDaSessao.nome_completo)
            setSelectedMembro(membroDaSessao)
            setSearchTerm(membroDaSessao.nome_completo)
            setShowResults(true)
            void carregarDesignacoes(membroDaSessao, parsed.pin)
          } catch (err) {
              console.warn('Falha ao restaurar membro_sessao na home:', err)
          }
        }

        void restoreSession()
    }, [autoSessaoProcessada, membros])

    const formatWeekRange = (dateString: string) => {
        const date = parseISO(dateString)
        const start = startOfWeek(date, { weekStartsOn: 1 }) // Monday
        const end = endOfWeek(date, { weekStartsOn: 1 }) // Sunday

        if (isSameMonth(start, end)) {
            return `${format(start, 'd')} - ${format(end, 'd')} de ${format(end, 'MMMM', { locale: ptBR })}`
        } else {
            return `${format(start, "d 'de' MMMM", { locale: ptBR })} - ${format(end, "d 'de' MMMM", { locale: ptBR })}`
        }
    }

    const carregarDesignacoes = async (membro: Membro, pinAutenticado?: string) => {
        setSelectedMembro(membro)
        setSearchTerm(membro.nome_completo)
        setShowResults(true)
        setLoading(true)
        setDiasDesignacoes([])
        setError(null)

        // A sessão é gravada ao selecionar o membro. Para pioneiros, isto só
        // acontece após o PIN ser validado.
        try {
            localStorage.setItem('membro_sessao', JSON.stringify({
                id: membro.id,
                nome: membro.nome_completo,
                grupo_id: membro.grupo_id,
                is_pioneiro: membro.is_pioneiro,
                pin: pinAutenticado || '',
                timestamp: Date.now()
            }))
            window.dispatchEvent(new Event('membro-sessao-atualizada'))
            
            // Activate session state immediately
            setIsSessaoMembroAtiva(true)
            setNomeSessao(membro.nome_completo)
        } catch (err) {
            console.error('Erro ao salvar sessão automática:', err)
        }

        try {
            const { data: designacoesPublicas, error: designacoesError } = await supabase.rpc('obter_designacoes_publicas_membro', {
                p_membro_id: membro.id,
            })
            if (designacoesError) throw designacoesError

            const itens = Array.isArray(designacoesPublicas) ? designacoesPublicas as Designacao[] : []
            const diasPublicosMap = new Map<string, Designacao[]>()
            itens.forEach((designacao) => {
                const dia = diasPublicosMap.get(designacao.data) || []
                dia.push(designacao)
                diasPublicosMap.set(designacao.data, dia)
            })
            setDiasDesignacoes(
                Array.from(diasPublicosMap.entries())
                    .sort(([primeiraData], [segundaData]) => primeiraData.localeCompare(segundaData))
                    .map(([data, itensDoDia]) => ({ data, itens: itensDoDia }))
            )
            return

            const hoje = format(new Date(), 'yyyy-MM-dd')
            const dataInicioSemanaLocal = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
            const limiteLimpeza = format(endOfWeek(addDays(new Date(), 21), { weekStartsOn: 1 }), 'yyyy-MM-dd')
            const limiteProgramacao = format(addDays(new Date(), 21), 'yyyy-MM-dd')
            const novasDesignacoes: Designacao[] = []

            // Parallelize all requests
            const [
                { data: programacoes },
                { data: suporte },
                { data: limpeza },
                { data: campo },
                { data: lanche },
                { data: discursosLocais },
                { data: discursosFora },
                { data: agendaAnciaos }
            ] = await Promise.all([
                // 1. Programação Semanal (limitada às 3 próximas semanas)
                supabase
                    .from('programacao_semanal')
                    .select('*')
                    .gte('data_reuniao', hoje)
                    .lte('data_reuniao', limiteProgramacao)
                    .order('data_reuniao'),

                // 2. Designações de Suporte
                supabase
                    .from('designacoes_suporte')
                    .select('*')
                    .eq('membro_id', membro.id)
                    .gte('data', hoje)
                    .order('data'),

                // 3. Escala de Limpeza
                membro.grupo_id
                    ? supabase
                        .from('escala_limpeza')
                        .select('id, data_inicio, grupo_id, grupos_servico(nome)')
                        .eq('grupo_id', membro.grupo_id!)
                        .gte('data_inicio', dataInicioSemanaLocal)
                        .lte('data_inicio', limiteLimpeza)
                        .order('data_inicio')
                    : Promise.resolve({ data: [] }),

                // 4. Escalas de Campo
                supabase
                    .from('escalas_campo')
                    .select('*')
                    .eq('dirigente_id', membro.id)
                    .gte('data', hoje)
                    .order('data'),

                // 5. Hospitalidade
                supabase
                    .from('agenda_discursos_locais')
                    .select('data, tema:temas(titulo), orador_visitante:oradores_visitantes(nome)')
                    .eq('hospitalidade_id', membro.id)
                    .gte('data', hoje)
                    .order('data'),

                // 6. Discursos Locais
                supabase
                    .from('agenda_discursos_locais')
                    .select('data, tema:temas(titulo)')
                    .eq('orador_local_id', membro.id)
                    .gte('data', hoje)
                    .order('data'),

                // 7. Discursos Fora
                supabase
                    .from('agenda_discursos_fora')
                    .select('data, destino_congregacao, tema:temas(titulo)')
                    .eq('orador_id', membro.id)
                    .gte('data', hoje)
                    .order('data'),

                // 8. Agenda Anciãos (Somente se for Ancião)
                membro.is_anciao
                    ? supabase
                        .from('agenda_anciaos')
                        .select('*')
                        .gte('data_inicio', hoje)
                        .order('data_inicio')
                    : Promise.resolve({ data: [] })
            ])

            // Process 1: Programação Semanal
            if (programacoes) {
                programacoes?.forEach(prog => {
                    const weekRange = formatWeekRange(prog.data_reuniao)

                    // Presidente
                    if (prog.presidente_id === membro.id) {
                        novasDesignacoes.push({
                            tipo: 'REUNIAO',
                            data: prog.data_reuniao,
                            descricao: 'Presidente da Reunião',
                            detalhe: weekRange
                        })
                    }
                    // Oração Inicial
                    if (prog.oracao_inicial_id === membro.id) {
                        novasDesignacoes.push({
                            tipo: 'REUNIAO',
                            data: prog.data_reuniao,
                            descricao: 'Oração Inicial',
                            detalhe: weekRange
                        })
                    }
                    // Oração Final
                    if (prog.oracao_final_id === membro.id) {
                        novasDesignacoes.push({
                            tipo: 'REUNIAO',
                            data: prog.data_reuniao,
                            descricao: 'Oração Final',
                            detalhe: weekRange
                        })
                    }
                    // Partes (JSON)
                    if (prog.partes && Array.isArray(prog.partes)) {
                        ; (prog.partes as Json[]).forEach((parteJson) => {
                            const parte = parteJson as ParteProgramacao
                            if (parte.membro_id === membro.id) {
                                let descricao = `PARTE - ${parte.nome}`
                                if (parte.ajudante_id) {
                                    const ajudante = membros.find(m => m.id === parte.ajudante_id)
                                    if (ajudante) {
                                        descricao += ` (com ${ajudante.nome_completo})`
                                    }
                                }
                                novasDesignacoes.push({
                                    tipo: 'REUNIAO',
                                    data: prog.data_reuniao,
                                    descricao: descricao,
                                    detalhe: weekRange
                                })
                            } else if (parte.ajudante_id === membro.id) {
                                const isLeitor = (parte.tipo === 'VIDA_CRISTA' && parte.nome.toLowerCase().includes('estudo bíblico'))
                                let descricao = `${isLeitor ? 'LEITOR' : 'AJUDANTE'} - ${parte.nome}`
                                const estudante = membros.find(m => m.id === parte.membro_id)
                                if (estudante) {
                                    descricao += ` (${isLeitor ? 'Leitor' : 'Ajudante'} de ${estudante.nome_completo})`
                                }
                                novasDesignacoes.push({
                                    tipo: 'REUNIAO',
                                    data: prog.data_reuniao,
                                    descricao: descricao,
                                    detalhe: weekRange
                                })
                            }
                        })
                    }
                })
            }

            // Process 2: Suporte
            if (suporte) {
                suporte?.forEach(sup => {
                    novasDesignacoes.push({
                        tipo: 'SUPORTE',
                        data: sup.data,
                        descricao: formatarFuncaoSuporte(sup.funcao),
                        detalhe: formatWeekRange(sup.data)
                    })
                })
            }

            // Process 3: Limpeza
            if (limpeza) {
                const escalasDoGrupo = (limpeza as EscalaLimpezaComGrupo[])
                    .filter(esc => esc.grupo_id === membro.grupo_id)

                escalasDoGrupo.forEach(esc => {
                    const dataInicio = parseISO(esc.data_inicio)
                    const detalheLimpeza = esc.grupos_servico?.nome
                        ? `${esc.grupos_servico.nome} - ${formatWeekRange(esc.data_inicio)}`
                        : formatWeekRange(esc.data_inicio)

                    // Quarta-feira (Monday + 2 days)
                    const quarta = new Date(dataInicio)
                    quarta.setDate(dataInicio.getDate() + 2)

                    // Sábado (Monday + 5 days)
                    const sabado = new Date(dataInicio)
                    sabado.setDate(dataInicio.getDate() + 5)

                    const quartaStr = format(quarta, 'yyyy-MM-dd')
                    const sabadoStr = format(sabado, 'yyyy-MM-dd')

                    // Add Wednesday if it's today or future
                    if (quartaStr >= hoje) {
                        novasDesignacoes.push({
                            tipo: 'LIMPEZA',
                            data: quartaStr,
                            descricao: 'Limpeza do Salão (Quarta)',
                            detalhe: detalheLimpeza
                        })
                    }

                    // Add Saturday if it's today or future
                    if (sabadoStr >= hoje) {
                        novasDesignacoes.push({
                            tipo: 'LIMPEZA',
                            data: sabadoStr,
                            descricao: 'Limpeza do Salão (Sábado)',
                            detalhe: detalheLimpeza
                        })
                    }
                })
            }

            // Process 4: Campo
            if (campo) {
                campo?.forEach(esc => {
                    novasDesignacoes.push({
                        tipo: 'CAMPO',
                        data: esc.data,
                        descricao: 'Dirigente de Campo',
                        detalhe: formatWeekRange(esc.data)
                    })
                })
            }

            // Process 5: Lanche
            if (lanche) {
                lanche?.forEach((l: LancheAgenda) => {
                    novasDesignacoes.push({
                        tipo: 'SUPORTE',
                        data: l.data,
                        descricao: 'Hospedagem/Lanche',
                        detalhe: formatWeekRange(l.data)
                    })
                })
            }

            // Process 6: Discursos Locais
            if (discursosLocais) {
                discursosLocais?.forEach((d: DiscursoLocalAgenda) => {
                    novasDesignacoes.push({
                        tipo: 'DISCURSO',
                        data: d.data,
                        descricao: `Discurso Público: ${d.tema?.titulo || 'Tema a definir'}`,
                        detalhe: 'Na Congregação Local'
                    })
                })
            }

            // Process 7: Discursos Fora
            if (discursosFora) {
                discursosFora?.forEach((d: DiscursoForaAgenda) => {
                    novasDesignacoes.push({
                        tipo: 'DISCURSO',
                        data: d.data,
                        descricao: `Discurso Fora: ${d.tema?.titulo || 'Tema a definir'}`,
                        detalhe: `Na Congregação ${d.destino_congregacao}`
                    })
                })
            }

            // Process 8: Agenda Anciãos
            if (agendaAnciaos) {
                agendaAnciaos?.forEach((ev: EventoAgendaAnciaos) => {
                    novasDesignacoes.push({
                        tipo: 'AGENDA',
                        data: ev.data_inicio,
                        descricao: ev.titulo,
                        detalhe: 'Compromisso do Corpo de Anciãos'
                    })
                })
            }

            // Agrupar por data
            const diasMap = new Map<string, Designacao[]>()
            const hojeData = format(new Date(), 'yyyy-MM-dd')

            novasDesignacoes.forEach(desig => {
                // Remove past dates if any slipped through
                if (desig.data < hojeData) return

                const itens = diasMap.get(desig.data) || []
                itens.push(desig)
                diasMap.set(desig.data, itens)
            })

            // Sort dates
            const diasOrdenados = Array.from(diasMap.entries())
                .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
                .map(([data, itens]) => ({ data, itens }))

            setDiasDesignacoes(diasOrdenados)
        } catch (error) {
            console.error('Erro ao buscar designações:', error)
            setError('Falha ao carregar designações. Verifique sua conexão.')
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = async (membro: Membro) => {
        if (membro.is_pioneiro) {
            setSelectedMembro(membro)
            setSearchTerm(membro.nome_completo)
            setShowResults(true)
            setPin('')
            setPinError(null)
            setMembroAguardandoPin(membro)
            return
        }

        await carregarDesignacoes(membro)
    }

    const handlePinSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        if (!membroAguardandoPin || pin.length !== 4 || validandoPin) return

        setValidandoPin(true)
        setPinError(null)
        try {
            const { data, error: rpcError } = await supabase.rpc('verificar_pin', { p_pin: pin })
            if (rpcError) throw rpcError

            const membroAutenticado = data?.[0]
            if (!membroAutenticado || membroAutenticado.id !== membroAguardandoPin.id) {
                setPinError('PIN inválido para este membro.')
                setPin('')
                return
            }

            const membro = membroAguardandoPin
            setMembroAguardandoPin(null)
            await carregarDesignacoes(membro, pin)
        } catch (err) {
            console.error('Erro ao validar PIN do pioneiro:', err)
            setPinError('Não foi possível validar o PIN. Tente novamente.')
            setPin('')
        } finally {
            setValidandoPin(false)
        }
    }

    const cancelarPin = () => {
        setMembroAguardandoPin(null)
        setPin('')
        setPinError(null)
        setSelectedMembro(null)
        setSearchTerm('')
        setShowResults(false)
    }

    const adicionarDigitoPin = (digito: string) => {
        if (!validandoPin && pin.length < 4) {
            setPin(prev => prev + digito)
            setPinError(null)
        }
    }

    const apagarDigitoPin = () => {
        if (!validandoPin) {
            setPin(prev => prev.slice(0, -1))
            setPinError(null)
        }
    }

    handleSearchRef.current = handleSearch

    const formatarFuncaoSuporte = (funcao: string) => {
        const mapa: Record<string, string> = {
            'SOM': 'Operador de Som',
            'MICROFONE_1': 'Microfone (Volante 1)',
            'MICROFONE_2': 'Microfone (Volante 2)',
            'INDICADOR_ENTRADA': 'Indicador (Entrada)',
            'INDICADOR_AUDITORIO': 'Indicador (Auditório)',
            'VIDEO': 'Operador de Vídeo',
            'PRESIDENTE': 'Presidente'
        }
        return mapa[funcao] || funcao
    }

    const handleLogout = () => {
        localStorage.removeItem('membro_sessao')
        window.dispatchEvent(new Event('membro-sessao-atualizada'))
        setIsSessaoMembroAtiva(false)
        setNomeSessao(null)
        setSelectedMembro(null)
        setSearchTerm('')
        setShowResults(false)
        setDiasDesignacoes([])
    }

    const primeiroNome = (nome: string | null | undefined) => {
        if (!nome) return ''
        return nome.trim().split(' ')[0] || ''
    }

    const filteredMembros = searchTerm === ''
        ? []
        : membros.filter(m =>
            m.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.nome_civil && m.nome_civil.toLowerCase().includes(searchTerm.toLowerCase()))
        )

    return (
        <div className="w-full max-w-2xl mx-auto">
            {membroAguardandoPin && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                    <form
                        onSubmit={handlePinSubmit}
                        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"
                    >
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Confirme seu acesso</h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            {membroAguardandoPin.nome_completo}, digite seu PIN de 4 dígitos.
                        </p>
                        <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
                            Use o teclado abaixo para informar o PIN.
                        </p>
                        {pinError && <p className="mt-3 text-center text-sm text-red-600 dark:text-red-400">{pinError}</p>}
                        <div className="mt-5 grid grid-cols-3 gap-3">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digito => (
                                <button
                                    key={digito}
                                    type="button"
                                    onClick={() => adicionarDigitoPin(String(digito))}
                                    disabled={validandoPin || pin.length === 4}
                                    className="h-12 rounded-xl bg-slate-100 text-xl font-semibold text-slate-800 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                                >
                                    {digito}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={apagarDigitoPin}
                                disabled={validandoPin || pin.length === 0}
                                className="h-12 rounded-xl bg-red-50 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                                aria-label="Apagar último dígito"
                            >
                                Apagar
                            </button>
                            <button
                                type="button"
                                onClick={() => adicionarDigitoPin('0')}
                                disabled={validandoPin || pin.length === 4}
                                className="h-12 rounded-xl bg-slate-100 text-xl font-semibold text-slate-800 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                            >
                                0
                            </button>
                            <button
                                type="button"
                                onClick={() => setPin('')}
                                disabled={validandoPin || pin.length === 0}
                                className="h-12 rounded-xl bg-slate-100 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                Limpar
                            </button>
                        </div>
                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={cancelarPin}
                                disabled={validandoPin}
                                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={validandoPin || pin.length !== 4}
                                className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {validandoPin ? 'Validando...' : 'Entrar'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {!isSessaoMembroAtiva && (
                <div className="relative mb-8">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setShowResults(false)
                        setSelectedMembro(null)
                    }}
                    placeholder="Digite seu nome para LOGAR"
                    className="w-full p-4 text-lg border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-lg focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400"
                />

                {/* Dropdown de Sugestões */}
                {!showResults && searchTerm.length > 0 && !selectedMembro && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 max-h-60 overflow-y-auto">
                        {filteredMembros.length > 0 ? (
                            filteredMembros.map(membro => (
                                <button
                                    key={membro.id}
                                    onClick={() => handleSearch(membro)}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0"
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-700 dark:text-slate-200">{membro.nome_completo}</span>
                                        {membro.nome_civil && membro.nome_civil !== membro.nome_completo && (
                                            <span className="text-xs text-slate-500 dark:text-slate-400">{membro.nome_civil}</span>
                                        )}
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="p-4 text-slate-500 text-center">Nenhum membro encontrado</div>
                        )}
                    </div>
                )}
                </div>
            )}

            {/* Resultados */}
            {showResults && selectedMembro && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {isSessaoMembroAtiva ? (
                        <div className="mb-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50 px-5 py-4 text-left shadow-sm dark:border-blue-900/30 dark:from-blue-950/40 dark:to-slate-900">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
                                        Olá, {primeiroNome(nomeSessao || selectedMembro.nome_completo)}
                                    </p>
                                    <h2 className="mt-1 text-xl font-bold text-slate-800 dark:text-white">
                                        Seus próximos compromissos
                                    </h2>
                                </div>
                                <button 
                                    onClick={handleLogout}
                                    className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wider"
                                >
                                    Esse não sou eu
                                </button>
                            </div>
                        </div>
                    ) : (
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <span>📅</span> Designações para {selectedMembro.nome_completo}
                        </h2>
                    )}
                    {loading ? (
                        <div className="text-center py-8 text-slate-500">
                            <div className="animate-pulse">Carregando designações...</div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
                            <button
                                onClick={() => selectedMembro && handleSearch(selectedMembro)}
                                className="text-sm font-medium text-red-600 hover:text-red-800 dark:hover:text-red-300 underline"
                            >
                                Tentar novamente
                            </button>
                        </div>
                    ) : diasDesignacoes.length > 0 ? (
                        diasDesignacoes.map((dia, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden text-left">
                                {/* Header do Dia */}
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 px-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                    <span className="font-bold text-slate-700 dark:text-slate-200 capitalize">
                                        {format(parseISO(dia.data), "EEEE, d 'de' MMMM", { locale: ptBR })}
                                    </span>
                                    {dia.data === getCongregationDate() && (
                                        <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                                            HOJE
                                        </span>
                                    )}
                                </div>

                                {/* Lista de Designações do Dia */}
                                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {dia.itens.map((desig, itemIdx) => {
                                        let destination = ''
                                        if (desig.tipo === 'SUPORTE') {
                                            destination = `/relatorios/mecanicas?data=${desig.data}`
                                        } else if (desig.tipo === 'AGENDA') {
                                            destination = '/admin/agenda'
                                        } else if (desig.tipo === 'REUNIAO') {
                                            const dateObj = parseISO(desig.data)
                                            const dayOfWeek = dateObj.getDay()
                                            if (dayOfWeek === 3 || dayOfWeek === 4) {
                                                destination = `/relatorios/reuniao-meio-semana?data=${desig.data}`
                                            }
                                        }

                                        return (
                                            <div
                                                key={itemIdx}
                                                onClick={() => destination && router.push(destination)}
                                                className={`
                                                    p-4 flex gap-4 transition-colors
                                                    ${destination ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''}
                                                `}
                                                role={destination ? 'button' : undefined}
                                            >
                                                <div className={`
                                                w-1 rounded-full self-stretch
                                                ${desig.tipo === 'LIMPEZA' ? 'bg-green-500' :
                                                        desig.tipo === 'SUPORTE' ? 'bg-orange-500' :
                                                            desig.tipo === 'CAMPO' ? 'bg-purple-500' :
                                                                desig.tipo === 'DISCURSO' ? 'bg-teal-500' :
                                                                    desig.tipo === 'AGENDA' ? 'bg-pink-500' : 'bg-blue-500'}
                                            `} />

                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h3 className="font-bold text-slate-900 dark:text-white text-left">
                                                            <span className="md:hidden">{formatarDescricaoCompromisso(desig)}</span>
                                                            <span className="hidden md:inline">{desig.descricao}</span>
                                                        </h3>
                                                        <span className={`
                                                        text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider
                                                        ${desig.tipo === 'LIMPEZA' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                                desig.tipo === 'SUPORTE' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                                    desig.tipo === 'CAMPO' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                                        desig.tipo === 'DISCURSO' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' :
                                                                            desig.tipo === 'AGENDA' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' :
                                                                                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}
                                                    `}>
                                                            {desig.tipo}
                                                        </span>
                                                    </div>
                                                    {desig.detalhe && (
                                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-left">
                                                            {desig.detalhe}
                                                        </p>
                                                    )}
                                                </div>
                                                {destination && (
                                                    <div className="flex items-center text-slate-300 dark:text-slate-600">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            <p className="text-slate-600 dark:text-slate-400 font-medium">Nenhuma designação encontrada para os próximos dias.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
