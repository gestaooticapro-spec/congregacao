'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import { List, Map as MapIcon } from 'lucide-react'
import MapaVisaoTerritorios from '@/components/territorios/MapaVisaoTerritorios'

export default function TerritoriosPage() {
    const [territories, setTerritories] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState<'todos' | 'reservados' | 'disponiveis'>('reservados')
    const [showOverviewMap, setShowOverviewMap] = useState(false)
    const [mapFilteredTerritoryId, setMapFilteredTerritoryId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadTerritories()
    }, [])

    const loadTerritories = async () => {
        setError(null)

        try {
            // Race between the actual query and the timeout
            const { data, error } = await supabase
                .from('territorios')
                .select('*, visitas_ativas(count), historico_conclusao(data_fim), responsavel:membros(nome_completo)')
                .order('nome')
                .order('data_fim', { foreignTable: 'historico_conclusao', ascending: false })
                .limit(1, { foreignTable: 'historico_conclusao' })

            if (error) {
                console.error('Error loading territories:', error)
                setError(`Erro ao carregar territórios: ${error.message}`)
            } else {
                setTerritories(data || [])
            }
        } catch (err: any) {
            console.error('Exception loading territories:', err)
            setError(err.message || 'Erro desconhecido ao carregar territórios.')
        } finally {
            setLoading(false)
        }
    }

    const filteredTerritories = useMemo(() => {
        const search = searchTerm.toLowerCase()

        const matchesSearch = (t: any) =>
            t.nome.toLowerCase().includes(search) ||
            (t.referencia && t.referencia.toLowerCase().includes(search)) ||
            (t.responsavel?.nome_completo && t.responsavel.nome_completo.toLowerCase().includes(search))

        let list = territories.filter(matchesSearch)

        if (mapFilteredTerritoryId) {
            list = list.filter((territory) => territory.id === mapFilteredTerritoryId)
        }

        // A busca é global, então uma aba selecionada não esconde resultados.
        if (search.trim()) return list

        if (activeTab === 'reservados') {
            // Show territories with active visits OR assigned to someone
            list = list.filter(t => {
                const activeVisitsCount = t.visitas_ativas?.[0]?.count || 0
                const isAssigned = !!t.responsavel
                return activeVisitsCount > 0 || isAssigned
            })
        } else if (activeTab === 'disponiveis') {
            // Show available territories: no responsible AND no active visits
            list = list.filter(t => {
                const activeVisitsCount = t.visitas_ativas?.[0]?.count || 0
                return !t.responsavel && activeVisitsCount === 0
            })
            // Sort: never worked first, then oldest last completion first
            list = [...list].sort((a, b) => {
                const dateA = a.historico_conclusao?.[0]?.data_fim
                const dateB = b.historico_conclusao?.[0]?.data_fim

                if (!dateA && !dateB) return 0
                if (!dateA) return -1
                if (!dateB) return 1
                return new Date(dateA).getTime() - new Date(dateB).getTime()
            })
        }

        return list
    }, [territories, searchTerm, activeTab, mapFilteredTerritoryId])

    const mappedTerritories = useMemo(
        () => territories.filter((territory) => (territory.mapa_config?.limite?.length ?? 0) >= 3),
        [territories],
    )

    const handleOverviewTerritorySelect = useCallback((territoryId: string) => {
        const territory = territories.find((item) => item.id === territoryId)
        if (!territory) return
        const activeVisitsCount = territory.visitas_ativas?.[0]?.count || 0
        const isReserved = Boolean(territory.responsavel) || activeVisitsCount > 0
        setActiveTab(isReserved ? 'reservados' : 'disponiveis')
        setSearchTerm('')
        setMapFilteredTerritoryId(territoryId)
        setShowOverviewMap(false)
        window.setTimeout(() => {
            document.getElementById(`territory-card-${territoryId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
    }, [territories])

    if (loading) return <div className="container mx-auto p-4">Carregando...</div>

    if (error) return (
        <div className="container mx-auto p-4">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p className="font-medium">Erro ao carregar</p>
                <p className="text-sm mt-1">{error}</p>
                <button
                    onClick={() => { setLoading(true); loadTerritories(); }}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                    Tentar novamente
                </button>
            </div>
        </div>
    )

    return (
        <div className="container mx-auto p-4">
            <PageHeader title="Territórios" />

            {/* Search Bar */}
            <div className="mb-4 flex gap-2">
                <input
                    type="text"
                    placeholder="Buscar por nome, referência ou responsável..."
                    value={searchTerm}
                    onChange={(e) => {
                        const value = e.target.value
                        setSearchTerm(value)
                        if (value.trim()) {
                            setShowOverviewMap(false)
                            setMapFilteredTerritoryId(null)
                        }
                        setActiveTab(value.trim() ? 'todos' : (activeTab === 'todos' ? 'reservados' : activeTab))
                    }}
                    className="min-w-0 flex-1 p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <button
                    type="button"
                    onClick={() => setShowOverviewMap((current) => !current)}
                    aria-label={showOverviewMap ? 'Voltar à lista de territórios' : 'Ver territórios no mapa'}
                    title={showOverviewMap ? 'Voltar à lista' : 'Ver territórios no mapa'}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60"
                >
                    {showOverviewMap ? <List size={21} /> : <MapIcon size={21} />}
                    <span className="hidden sm:inline">{showOverviewMap ? 'Lista' : 'Mapa'}</span>
                </button>
            </div>

            {!showOverviewMap && mapFilteredTerritoryId && (
                <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
                    <span>Filtro do mapa: {territories.find((territory) => territory.id === mapFilteredTerritoryId)?.nome}</span>
                    <button type="button" onClick={() => setMapFilteredTerritoryId(null)} className="shrink-0 font-semibold underline underline-offset-2">
                        Limpar filtro
                    </button>
                </div>
            )}

            {showOverviewMap ? (
                <MapaVisaoTerritorios
                    territorios={mappedTerritories}
                    onSelecionar={handleOverviewTerritorySelect}
                />
            ) : <>
            {/* Tabs */}
            <div className="flex justify-center mb-6">
                <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl inline-flex">
                    {searchTerm.trim() && (
                        <button
                            onClick={() => setActiveTab('todos')}
                            className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'todos'
                                ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                        >
                            Todos
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('reservados')}
                        className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'reservados'
                            ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        📌 Reservados
                    </button>
                    <button
                        onClick={() => setActiveTab('disponiveis')}
                        className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'disponiveis'
                            ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                    >
                        🗺️ Disponíveis
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTerritories.map((t) => {
                    const lastCompletion = t.historico_conclusao?.[0]?.data_fim

                    // Calculate how many territories are "older" (more overdue)
                    const overdueCount = territories.filter(other => {
                        if (other.id === t.id) return false

                        const otherDate = other.historico_conclusao?.[0]?.data_fim

                        if (!lastCompletion) return false
                        if (!otherDate) return true

                        return new Date(otherDate) < new Date(lastCompletion)
                    }).length

                    return (
                        <Link
                            key={t.id}
                            id={`territory-card-${t.id}`}
                            href={`/territorios/${t.id}`}
                            className="block border rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white flex flex-col h-full"
                        >
                            <div className="aspect-video relative bg-gray-100">
                                <img
                                    src={t.imagem_url}
                                    alt={t.nome}
                                    className="object-cover w-full h-full"
                                />
                                {lastCompletion && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/75 text-white px-3 py-2 backdrop-blur-sm flex flex-col gap-0.5">
                                        <p className="text-xs font-semibold">
                                            Última vez: {new Date(lastCompletion).toLocaleDateString('pt-BR')}
                                        </p>
                                        {overdueCount > 0 && (
                                            <p className="text-[10px] text-amber-300 font-medium">
                                                ⚠️ {overdueCount} territórios mais antigos
                                            </p>
                                        )}
                                    </div>
                                )}
                                {!lastCompletion && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-orange-600/90 text-white px-3 py-2 backdrop-blur-sm">
                                        <p className="text-xs font-semibold">
                                            🆕 Nenhum registro de atividade nesse território
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 flex-grow flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h2 className="font-semibold text-lg text-gray-900 leading-tight">{t.nome}</h2>
                                    <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full whitespace-nowrap ml-2">
                                        {Array.isArray(t.configuracao) ? t.configuracao.length : 0} quadras
                                    </div>
                                </div>

                                {t.referencia && (
                                    <p className="text-sm text-gray-600 mb-2">{t.referencia}</p>
                                )}

                                <div className="mt-auto pt-3 border-t border-gray-50">
                                    {t.responsavel?.nome_completo ? (
                                        <>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs font-bold px-2 py-1 rounded self-start ${t.territorio_pessoal
                                                    ? 'border border-purple-300 bg-purple-200 text-purple-950'
                                                    : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                                    }`}>
                                                    {t.territorio_pessoal ? '🟣 Território Pessoal' : '🔵 Sendo trabalhado pela Congregação'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">Com:</span>
                                                <span className="text-sm font-medium text-blue-800 truncate">
                                                    {t.responsavel.nome_completo}
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded self-start">
                                            Disponível
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    )
                })}

                {filteredTerritories.length === 0 && (
                    <div className="col-span-full text-center py-10 text-gray-500">
                        {searchTerm
                            ? 'Nenhum território encontrado.'
                            : activeTab === 'reservados'
                                ? 'Nenhum território reservado no momento.'
                                : 'Nenhum território disponível no momento.'}
                    </div>
                )}
            </div>
            </>}
        </div>
    )
}
