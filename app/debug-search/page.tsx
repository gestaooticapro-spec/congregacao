
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'
import { format, parseISO, startOfWeek, endOfWeek, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Membro = Pick<Database['public']['Tables']['membros']['Row'], 'id' | 'nome_completo' | 'nome_civil' | 'grupo_id'>

export default function DebugSearchPage() {
    const [membros, setMembros] = useState<Membro[]>([])
    const [selectedMembro, setSelectedMembro] = useState<Membro | null>(null)
    const [debugInfo, setDebugInfo] = useState<any>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchMembros()
    }, [])

    const fetchMembros = async () => {
        const { data } = await supabase
            .from('membros')
            .select('id, nome_completo, nome_civil, grupo_id')
            .order('nome_completo')
        if (data) setMembros(data)
    }

    const handleSearch = async (membro: Membro) => {
        setSelectedMembro(membro)
        setSearchTerm(membro.nome_completo)
        setLoading(true)
        setDebugInfo(null)

        try {
            const hoje = new Date().toISOString().split('T')[0]

            // 1. Query Locais EXACTLY as in HomeMemberSearch
            const { data: discursosLocais, error: errorLocais } = await supabase
                .from('agenda_discursos_locais')
                .select('data, tema:temas(titulo)')
                .eq('orador_local_id', membro.id)
                .gte('data', hoje)
                .order('data')

            // 2. Query Fora EXACTLY as in HomeMemberSearch
            const { data: discursosFora, error: errorFora } = await supabase
                .from('agenda_discursos_fora')
                .select('data, destino_congregacao, tema:temas(titulo)')
                .eq('orador_id', membro.id)
                .gte('data', hoje)
                .order('data')

            setDebugInfo({
                hoje,
                membroId: membro.id,
                discursosLocais,
                errorLocais,
                discursosFora,
                errorFora
            })

        } catch (error: any) {
            console.error('Erro:', error)
            setDebugInfo({ error: error.message })
        } finally {
            setLoading(false)
        }
    }

    const filteredMembros = searchTerm === ''
        ? []
        : membros.filter(m =>
            m.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.nome_civil && m.nome_civil.toLowerCase().includes(searchTerm.toLowerCase()))
        )

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Debug Search</h1>

            <div className="relative mb-8">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setSelectedMembro(null)
                    }}
                    placeholder="Digite o nome..."
                    className="w-full p-4 border rounded-xl"
                />

                {searchTerm.length > 0 && !selectedMembro && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                        {filteredMembros.map(membro => (
                            <button
                                key={membro.id}
                                onClick={() => handleSearch(membro)}
                                className="w-full text-left px-4 py-3 hover:bg-gray-100 border-b"
                            >
                                {membro.nome_completo}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {loading && <div>Carregando...</div>}

            {debugInfo && (
                <div className="mt-8 p-6 rounded-xl bg-slate-900 text-green-400 overflow-auto shadow-lg border border-slate-700">
                    <h2 className="font-bold mb-4 text-white text-lg border-b border-slate-700 pb-2">Debug Info:</h2>
                    <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                        {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    )
}
