'use client'

import { useState, useEffect, use } from 'react'
import { getTerritory, toggleVisita, closeTerritory } from '@/app/actions/territorios.actions'
import MapaInterativo from '@/components/territorios/MapaInterativo'
import { useRouter } from 'next/navigation'

export default function TerritorioPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params using React.use()
    const { id } = use(params)

    const [territorio, setTerritorio] = useState<any>(null)
    const [visitas, setVisitas] = useState<number[]>([])
    const [loading, setLoading] = useState(true)
    const [closing, setClosing] = useState(false)
    const router = useRouter()

    useEffect(() => {
        loadTerritory()
    }, [id])

    const loadTerritory = async () => {
        const res = await getTerritory(id)
        if (res.error) {
            alert(res.error)
            return
        }
        setTerritorio(res.territorio)
        setVisitas(res.visitas || [])
        setLoading(false)
    }

    const handleQuadraClick = async (quadraId: number) => {
        // Optimistic update
        const isVisited = visitas.includes(quadraId)
        const newVisitas = isVisited
            ? visitas.filter((v) => v !== quadraId)
            : [...visitas, quadraId]

        setVisitas(newVisitas)

        const res = await toggleVisita(id, quadraId)
        if (res.error) {
            // Revert on error
            setVisitas(visitas)
            alert(res.error)
        }
    }

    const handleCloseTerritory = async () => {
        if (!confirm('Tem certeza que deseja fechar este território? Isso limpará todas as marcações.')) return

        setClosing(true)
        const res = await closeTerritory(id)
        if (res.error) {
            alert(res.error)
            setClosing(false)
        } else {
            alert('Território fechado com sucesso!')
            router.push('/territorios')
        }
    }

    if (loading) return <div className="p-4">Carregando...</div>
    if (!territorio) return <div className="p-4">Território não encontrado.</div>

    const totalQuadras = Array.isArray(territorio.configuracao) ? territorio.configuracao.length : 0
    const isComplete = visitas.length === totalQuadras && totalQuadras > 0

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.push('/territorios')}
                        className="text-gray-600 hover:text-gray-900"
                    >
                        ←
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">{territorio.nome}</h1>
                        {territorio.referencia && (
                            <p className="text-sm text-gray-500">{territorio.referencia}</p>
                        )}
                    </div>
                </div>
                <div className="text-sm font-medium">
                    {visitas.length} / {totalQuadras}
                </div>
            </div>

            <div className="mb-6">
                <MapaInterativo
                    imageUrl={territorio.imagem_url}
                    configuracao={territorio.configuracao}
                    mode="user"
                    visitas={visitas}
                    onQuadraClick={handleQuadraClick}
                />
            </div>

            {isComplete && (
                <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center">
                    <button
                        onClick={handleCloseTerritory}
                        disabled={closing}
                        className="bg-green-600 text-white px-8 py-3 rounded-full shadow-xl font-bold text-lg animate-pulse hover:bg-green-700 disabled:opacity-50"
                    >
                        {closing ? 'Fechando...' : 'Fechar Território 🎉'}
                    </button>
                </div>
            )}
        </div>
    )
}
