'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'
import { format, isAfter, parseISO, startOfDay, startOfWeek, endOfWeek, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Membro = Pick<Database['public']['Tables']['membros']['Row'], 'id' | 'nome_completo' | 'grupo_id'>

type Designacao = {
    tipo: 'REUNIAO' | 'SUPORTE' | 'LIMPEZA' | 'CAMPO'
    data: string
    descricao: string
    detalhe?: string
}

export default function HomeMemberSearch() {
    const [membros, setMembros] = useState<Membro[]>([])
    const [selectedMembro, setSelectedMembro] = useState<Membro | null>(null)
    const [designacoes, setDesignacoes] = useState<Designacao[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [showResults, setShowResults] = useState(false)

    useEffect(() => {
        fetchMembros()
    }, [])

    const fetchMembros = async () => {
        const { data } = await supabase
            .from('membros')
            .select('id, nome_completo, grupo_id')
            .order('nome_completo')

        if (data) setMembros(data)
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
        setDesignacoes([])

        try {
            const hoje = new Date().toISOString().split('T')[0]
            const novasDesignacoes: Designacao[] = []

            // 1. Buscar Programação Semanal (Reuniões)
            const { data: programacoes } = await supabase
                .from('programacao_semanal')
                .select('*')
                .gte('data_reuniao', hoje)
                .order('data_reuniao')

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
                            if (parte.membro_id === membro.id || parte.ajudante_id === membro.id) {
                                novasDesignacoes.push({
                                    tipo: 'REUNIAO',
                                    data: prog.data_reuniao,
                                    descricao: parte.nome,
                                    detalhe: weekRange
                                })
                            }
                        })
                    }
                })
            }

            // 2. Buscar Designações de Suporte
            const { data: suporte } = await supabase
                .from('designacoes_suporte')
                .select('*')
                .eq('membro_id', membro.id)
                .gte('data', hoje)
                .order('data')

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

            // 3. Buscar Escala de Limpeza
            if (membro.grupo_id) {
                const { data: limpeza } = await supabase
                    .from('escala_limpeza')
                    .select('*')
                    .eq('grupo_id', membro.grupo_id)
                    .gte('data_inicio', hoje)
                    .order('data_inicio')

                if (limpeza) {
                    limpeza.forEach(esc => {
                        novasDesignacoes.push({
                            tipo: 'LIMPEZA',
                            data: esc.data_inicio,
                            descricao: 'Limpeza do Salão',
                            detalhe: formatWeekRange(esc.data_inicio)
                        })
                    })
                }
            }

            // 4. Buscar Escalas de Campo (Dirigente)
            const { data: campo } = await supabase
                .from('escalas_campo')
                .select('*')
                .eq('dirigente_id', membro.id)
                .gte('data', hoje)
                .order('data')

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

            // 5. Buscar Hospitalidade (Lanche)
            const { data: lanche } = await supabase
                .from('agenda_discursos_locais')
                .select('data, tema:temas(titulo), orador_visitante:oradores_visitantes(nome)')
                .eq('hospitalidade_id', membro.id)
                .gte('data', hoje)
                .order('data')

            if (lanche) {
                lanche.forEach((l: any) => {
                    novasDesignacoes.push({
                        tipo: 'SUPORTE', // Reuse SUPORTE style or create new one
                        data: l.data,
                        descricao: 'Hospedagem/Lanche',
                        detalhe: formatWeekRange(l.data)
                    })
                })
            }

            // Ordenar todas por data
            novasDesignacoes.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
            setDesignacoes(novasDesignacoes)

        } catch (error) {
            console.error('Erro ao buscar designações:', error)
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
            m.nome_completo.toLowerCase().includes(searchTerm.toLowerCase())
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
                    placeholder="Quais as minhas próximas partes?"
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
                                    <span className="font-medium text-slate-700 dark:text-slate-200">{membro.nome_completo}</span>
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
                        <div className="text-center py-8 text-slate-500">Carregando designações...</div>
                    ) : designacoes.length > 0 ? (
                        designacoes.map((desig, idx) => (
                            <div
                                key={idx}
                                className={`p-4 rounded-xl border-l-4 shadow-sm bg-white dark:bg-slate-800 transition-transform hover:scale-[1.01] ${desig.tipo === 'LIMPEZA' ? 'border-green-500' :
                                    desig.tipo === 'SUPORTE' ? 'border-orange-500' :
                                        desig.tipo === 'CAMPO' ? 'border-purple-500' : 'border-blue-500'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="text-left">
                                        <div className="font-bold text-slate-900 dark:text-white text-lg">
                                            {desig.descricao}
                                        </div>
                                        <div className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                            {desig.detalhe}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-slate-700 dark:text-slate-300">
                                            {format(parseISO(desig.data), "dd 'de' MMMM", { locale: ptBR })}
                                        </div>
                                        <div className="text-xs font-bold uppercase tracking-wider mt-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 inline-block text-slate-600 dark:text-slate-400">
                                            {format(parseISO(desig.data), "EEEE", { locale: ptBR })}
                                        </div>
                                    </div>
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
