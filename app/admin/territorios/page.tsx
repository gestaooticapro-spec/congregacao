'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminTerritoriosPage() {
    const [territories, setTerritories] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        loadTerritories()
    }, [])

    const loadTerritories = async () => {
        const { data, error } = await supabase
            .from('territorios')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error loading territories:', error)
            alert('Erro ao carregar territórios')
        } else {
            setTerritories(data || [])
        }
        setLoading(false)
    }

    const filteredTerritories = territories.filter(t => {
        const search = searchTerm.toLowerCase()
        return (
            t.nome.toLowerCase().includes(search) ||
            (t.referencia && t.referencia.toLowerCase().includes(search))
        )
    })

    // If searching, show all matches. If not, show only top 5.
    const displayedTerritories = searchTerm ? filteredTerritories : filteredTerritories.slice(0, 5)

    if (loading) return <div className="p-8 text-center">Carregando...</div>

    return (
        <div className="container mx-auto p-4 max-w-6xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h1 className="text-2xl font-bold">Gerenciar Territórios</h1>
                <div className="flex gap-2">
                    <Link
                        href="/admin/territorios/relatorio"
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors border"
                    >
                        📄 Relatório
                    </Link>
                    <Link
                        href="/admin/territorios/novo"
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                        + Novo Território
                    </Link>
                </div>
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

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedTerritories.map((t) => (
                    <div
                        key={t.id}
                        className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col"
                    >
                        <div className="aspect-video relative bg-gray-100">
                            <img
                                src={t.imagem_url}
                                alt={t.nome}
                                className="object-cover w-full h-full"
                            />
                            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                {Array.isArray(t.configuracao) ? t.configuracao.length : 0} quadras
                            </div>
                        </div>

                        <div className="p-4 flex-grow">
                            <h2 className="font-semibold text-lg mb-1">{t.nome}</h2>
                            {t.referencia && (
                                <p className="text-sm text-gray-600 mb-2">{t.referencia}</p>
                            )}
                        </div>

                        <div className="p-4 pt-0 mt-auto border-t bg-gray-50 flex justify-between items-center">
                            <div className="flex justify-end w-full">
                                <Link
                                    href={`/admin/territorios/${t.id}/editar`}
                                    className="text-sm bg-white border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 text-gray-700 font-medium"
                                >
                                    ✏️ Editar
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}

                {displayedTerritories.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                        {searchTerm ? 'Nenhum território encontrado para sua busca.' : 'Nenhum território cadastrado.'}
                    </div>
                )}
            </div>
        </div>
    )
}
