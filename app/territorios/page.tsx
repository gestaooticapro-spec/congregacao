'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function TerritoriosPage() {
    const [territories, setTerritories] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadTerritories()
    }, [])

    const loadTerritories = async () => {
        setError(null)

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout: A consulta demorou muito.')), 15000)
        )

        try {
            // Race between the actual query and the timeout
            const queryPromise = supabase
                .from('territorios')
                .select('*, visitas_ativas(count), historico_conclusao(data_fim), responsavel:membros(nome_completo)')
                .order('nome')
                .order('data_fim', { foreignTable: 'historico_conclusao', ascending: false })
                .limit(1, { foreignTable: 'historico_conclusao' })

            const result = await Promise.race([queryPromise, timeoutPromise]) as any

            if (result.error) {
                console.error('Error loading territories:', result.error)
                setError(`Erro ao carregar territórios: ${result.error.message}`)
            } else {
                setTerritories(result.data || [])
            }
        } catch (err: any) {
            console.error('Exception loading territories:', err)
            setError(err.message || 'Erro desconhecido ao carregar territórios.')
        } finally {
            setLoading(false)
        }
    }

    const filteredTerritories = territories.filter(t => {
        const search = searchTerm.toLowerCase()
        const matchesSearch = t.nome.toLowerCase().includes(search) ||
            (t.referencia && t.referencia.toLowerCase().includes(search)) ||
            (t.responsavel?.nome_completo && t.responsavel.nome_completo.toLowerCase().includes(search))

        // If searching, show all matches
        if (searchTerm) {
            return matchesSearch
        }

        // If not searching, show active (visits > 0) OR assigned to someone
        const activeVisitsCount = t.visitas_ativas?.[0]?.count || 0
        const isAssigned = !!t.responsavel
        return activeVisitsCount > 0 || isAssigned
    })

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
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Territórios</h1>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Buscar por nome, referência ou responsável..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTerritories.map((t) => {
                    const lastCompletion = t.historico_conclusao?.[0]?.data_fim

                    // Calculate how many territories are "older" (more overdue)
                    // Logic: Compare lastCompletion of this territory with all others.
                    // Older = date is BEFORE this date (smaller string/timestamp)
                    // If a territory has NO completion, it's considered "Infinite Old" (first priority), essentially < any date.
                    const overdueCount = territories.filter(other => {
                        if (other.id === t.id) return false // Don't compare with self

                        const otherDate = other.historico_conclusao?.[0]?.data_fim

                        // If current has no date (it's new/never worked), it is priority 0. 
                        // Nothing is older than it except other never-worked ones.
                        if (!lastCompletion) {
                            // If other also has no date, treat as equal (not older). 
                            // If other HAS date, it is newer (not older).
                            return false;
                        }

                        // If current HAS date:
                        // If other has no date, it is OLDER (never worked).
                        if (!otherDate) return true;

                        // Compare dates: Is otherDate < thisDate?
                        return new Date(otherDate) < new Date(lastCompletion)
                    }).length

                    return (
                        <Link
                            key={t.id}
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
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">Com:</span>
                                            <span className="text-sm font-medium text-blue-800 truncate">
                                                {t.responsavel.nome_completo}
                                            </span>
                                        </div>
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
                            : 'Nenhum território em andamento. Use a busca para encontrar um novo.'}
                    </div>
                )}
            </div>
        </div>
    )
}
