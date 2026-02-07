'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'
import { format, parseISO, startOfWeek, endOfWeek, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'



type Membro = Pick<Database['public']['Tables']['membros']['Row'], 'id' | 'nome_completo' | 'nome_civil' | 'grupo_id' | 'is_anciao'>

type Designacao = {
    tipo: 'REUNIAO' | 'SUPORTE' | 'LIMPEZA' | 'CAMPO' | 'DISCURSO' | 'AGENDA'
    data: string
    descricao: string
    detalhe?: string
}

export default function HomeMemberSearch(): React.ReactNode {
    const [membros, setMembros] = useState<Membro[]>([])
    const [selectedMembro, setSelectedMembro] = useState<Membro | null>(null)
    const [diasDesignacoes, setDiasDesignacoes] = useState<{ data: string, itens: Designacao[] }[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [showResults, setShowResults] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchMembros()
    }, [])

    const fetchMembros = async () => {
        try {
            const { data, error } = await supabase
                .from('membros')
                .select('id, nome_completo, nome_civil, grupo_id, is_anciao')
                .order('nome_completo')

            if (error) throw error
            if (data) setMembros(data)
        } catch (error) {
            console.error('Erro ao carregar membros:', error)
            setMembros([])
        }
    }

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

    const handleSearch = async (membro: Membro) => {
        setSelectedMembro(membro)
        setSearchTerm(membro.nome_completo)
        setShowResults(true)
        setLoading(true)
        setDiasDesignacoes([])
        setError(null)

        try {
            const hoje = new Date().toISOString().split('T')[0]
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
                // 1. Programação Semanal
                supabase
                    .from('programacao_semanal')
                    .select('*')
                    .gte('data_reuniao', hoje)
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
                        .select('*')
                        .eq('grupo_id', membro.grupo_id)
                        .gte('data_inicio', startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString().split('T')[0])
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
                programacoes.forEach(prog => {
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
                        prog.partes.forEach((parte: any) => {
                            if (parte.membro_id === membro.id) {
                                let descricao = parte.nome
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
                                let descricao = parte.nome
                                const estudante = membros.find(m => m.id === parte.membro_id)
                                if (estudante) {
                                    descricao += ` (Ajudante de ${estudante.nome_completo})`
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
                suporte.forEach(sup => {
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
                limpeza.forEach(esc => {
                    const dataInicio = parseISO(esc.data_inicio)

                    // Quarta-feira (Monday + 2 days)
                    const quarta = new Date(dataInicio)
                    quarta.setDate(dataInicio.getDate() + 2)

                    // Sábado (Monday + 5 days)
                    const sabado = new Date(dataInicio)
                    sabado.setDate(dataInicio.getDate() + 5)

                    const quartaStr = quarta.toISOString().split('T')[0]
                    const sabadoStr = sabado.toISOString().split('T')[0]

                    // Add Wednesday if it's today or future
                    if (quartaStr >= hoje) {
                        novasDesignacoes.push({
                            tipo: 'LIMPEZA',
                            data: quartaStr,
                            descricao: 'Limpeza do Salão (Quarta)',
                            detalhe: formatWeekRange(esc.data_inicio)
                        })
                    }

                    // Add Saturday if it's today or future
                    if (sabadoStr >= hoje) {
                        novasDesignacoes.push({
                            tipo: 'LIMPEZA',
                            data: sabadoStr,
                            descricao: 'Limpeza do Salão (Sábado)',
                            detalhe: formatWeekRange(esc.data_inicio)
                        })
                    }
                })
            }

            // Process 4: Campo
            if (campo) {
                campo.forEach(esc => {
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
                lanche.forEach((l: any) => {
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
                discursosLocais.forEach((d: any) => {
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
                discursosFora.forEach((d: any) => {
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
                agendaAnciaos.forEach((ev: any) => {
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
            const hojeData = new Date().toISOString().split('T')[0]

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

    const filteredMembros = searchTerm === ''
        ? []
        : membros.filter(m =>
            m.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.nome_civil && m.nome_civil.toLowerCase().includes(searchTerm.toLowerCase()))
        )

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="relative mb-8">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setShowResults(false)
                        setSelectedMembro(null)
                    }}
                    placeholder="Digite seu nome e veja seus compromissos"
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

            {/* Resultados */}
            {showResults && selectedMembro && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <span>📅</span> Designações para {selectedMembro.nome_completo}
                    </h2>

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
                            <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                                {/* Header do Dia */}
                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 px-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                    <span className="font-bold text-slate-700 dark:text-slate-200 capitalize">
                                        {format(parseISO(dia.data), "EEEE, d 'de' MMMM", { locale: ptBR })}
                                    </span>
                                    {dia.data === new Date().toISOString().split('T')[0] && (
                                        <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                                            HOJE
                                        </span>
                                    )}
                                </div>

                                {/* Lista de Designações do Dia */}
                                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {dia.itens.map((desig, itemIdx) => (
                                        <div
                                            key={itemIdx}
                                            className="p-4 flex gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                        >
                                            {/* Ícone / Indicador Visual */}
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
                                                    <h3 className="font-bold text-slate-900 dark:text-white">
                                                        {desig.descricao}
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
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                        {desig.detalhe}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            <div className="text-4xl mb-2">🎉</div>
                            <p className="text-slate-600 dark:text-slate-400 font-medium">Nenhuma designação encontrada para os próximos dias.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
