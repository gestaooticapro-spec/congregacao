'use client'

import { useState, useEffect, use } from 'react'
import { getTerritory, toggleVisita, closeTerritory, assignTerritory } from '@/app/actions/territorios.actions'
import MapaInterativo from '@/components/territorios/MapaInterativo'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function TerritorioPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params using React.use()
    const { id } = use(params)

    const [territorio, setTerritorio] = useState<any>(null)
    const [visitas, setVisitas] = useState<number[]>([])
    const [loading, setLoading] = useState(true)
    const [closing, setClosing] = useState(false)
    const [membros, setMembros] = useState<any[]>([])
    const [selectedMember, setSelectedMember] = useState('')
    const [assigning, setAssigning] = useState(false)
    const router = useRouter()

    useEffect(() => {
        loadTerritory()
        loadMembros()
    }, [id])

    const loadMembros = async () => {
        const { data } = await supabase
            .from('membros')
            .select('id, nome_completo')
            .eq('ativo', true)
            .order('nome_completo')
        setMembros(data || [])
    }

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

    const handleAssign = async () => {
        if (!selectedMember) return
        setAssigning(true)
        const res = await assignTerritory(id, selectedMember)
        if (res.error) {
            alert(res.error)
        } else {
            loadTerritory()
        }
        setAssigning(false)
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

    // If no responsible, show assignment screen
    if (!territorio.responsavel_id) {
        return (
            <div className="container mx-auto p-4 max-w-md min-h-screen flex flex-col justify-center">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h1 className="text-2xl font-bold mb-2 text-center">{territorio.nome}</h1>
                    <p className="text-gray-500 text-center mb-6">Quem será o responsável por este território?</p>

                    <div className="space-y-4">
                        <select
                            value={selectedMember}
                            onChange={(e) => setSelectedMember(e.target.value)}
                            className="w-full p-3 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-600"
                        >
                            <option value="">Selecione um irmão...</option>
                            {membros.map(m => (
                                <option key={m.id} value={m.id}>{m.nome_completo}</option>
                            ))}
                        </select>

                        <button
                            onClick={handleAssign}
                            disabled={!selectedMember || assigning}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {assigning ? 'Iniciando...' : 'Iniciar Território 🚀'}
                        </button>

                        <button
                            onClick={() => router.push('/territorios')}
                            className="w-full text-gray-500 py-2 hover:text-gray-700"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const responsavel = membros.find(m => m.id === territorio.responsavel_id)

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
                        <div className="flex flex-col">
                            {territorio.referencia && (
                                <span className="text-sm text-gray-500">{territorio.referencia}</span>
                            )}
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full w-fit mt-1">
                                Resp: {responsavel?.nome_completo || 'Carregando...'}
                            </span>
                        </div>
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
