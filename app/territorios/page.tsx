'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function TerritoriosPage() {
    const [territories, setTerritories] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadTerritories()
    }, [])

    const loadTerritories = async () => {
        // Fetch territories, count of active visits, and last completion date
        const { data, error } = await supabase
            .from('territorios')
            .select('*, visitas_ativas(count), historico_conclusao(data_fim)')
            .order('nome')
            .order('data_fim', { foreignTable: 'historico_conclusao', ascending: false })
            .limit(1, { foreignTable: 'historico_conclusao' })

        if (error) {
            console.error('Error loading territories:', error)
        } else {
            setTerritories(data || [])
        }
        setLoading(false)
    }

    const filteredTerritories = territories.filter(t => {
        const search = searchTerm.toLowerCase()
        const matchesSearch = t.nome.toLowerCase().includes(search) ||
            (t.referencia && t.referencia.toLowerCase().includes(search))

        // If searching, show all matches
        if (searchTerm) {
            return matchesSearch
        }

        // If not searching, show only active (visits > 0)
        const activeVisitsCount = t.visitas_ativas?.[0]?.count || 0
        return activeVisitsCount > 0
    })

    if (loading) return <div className="container mx-auto p-4">Carregando...</div>

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Territórios</h1>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Buscar por nome ou referência..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTerritories.map((t) => {
                    const lastCompletion = t.historico_conclusao?.[0]?.data_fim

                    return (
                        <Link
                            key={t.id}
                            href={`/territorios/${t.id}`}
                            className="block border rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white"
                        >
                            <div className="aspect-video relative bg-gray-100">
                                <img
                                    src={t.imagem_url}
                                    alt={t.nome}
                                    className="object-cover w-full h-full"
                                />
                            </div>
                            <div className="p-4">
                                <h2 className="font-semibold text-lg">{t.nome}</h2>
                                {t.referencia && (
                                    <p className="text-sm text-gray-600 mb-1">{t.referencia}</p>
                                )}
                                <div className="flex justify-between items-end mt-2">
                                    <p className="text-xs text-gray-500">
                                        {Array.isArray(t.configuracao) ? t.configuracao.length : 0} quadras
                                    </p>
                                    {lastCompletion && (
                                        <p className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                                            Última vez: {new Date(lastCompletion).toLocaleDateString('pt-BR')}
                                        </p>
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
