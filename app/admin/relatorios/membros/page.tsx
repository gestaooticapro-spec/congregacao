'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'
import { useRouter } from 'next/navigation'

type Membro = Database['public']['Tables']['membros']['Row'] & {
    grupos_servico: { nome: string } | null
}

type Grupo = Database['public']['Tables']['grupos_servico']['Row']

export default function RelatorioMembrosPage() {
    const router = useRouter()
    const [membros, setMembros] = useState<Membro[]>([])
    const [grupos, setGrupos] = useState<Grupo[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [filterGrupo, setFilterGrupo] = useState<string>('ALL')
    const [filterQualificacao, setFilterQualificacao] = useState<string>('ALL')
    const [sortField, setSortField] = useState<'nome_completo' | 'nome_civil' | 'grupo'>('nome_civil')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            // Fetch Members with Group Name
            const { data: membrosData, error: membrosError } = await supabase
                .from('membros')
                .select(`
                    *,
                    grupos_servico:grupos_servico!membros_grupo_id_fkey (
                        nome
                    )
                `)
                .eq('ativo', true)
                .neq('nome_completo', 'Admin do Sistema')
                .order('nome_civil')

            if (membrosError) throw membrosError

            // Fetch Groups for Filter
            const { data: gruposData, error: gruposError } = await supabase
                .from('grupos_servico')
                .select('*')
                .order('nome')

            if (gruposError) throw gruposError

            setMembros(membrosData as any)
            setGrupos(gruposData)
        } catch (error) {
            console.error('Erro ao carregar dados:', error)
            console.error('Detalhes do erro:', JSON.stringify(error, null, 2))
            alert('Erro ao carregar relatório. Verifique o console para mais detalhes.')
        } finally {
            setLoading(false)
        }
    }

    const getQualificacao = (membro: Membro) => {
        if (membro.is_anciao) return 'Ancião'
        if (membro.is_servo_ministerial) return 'Servo Ministerial'
        if (membro.is_pioneiro) return 'Pioneiro Regular'
        if (membro.is_publicador) return 'Publicador'
        return 'Não Publicador'
    }

    const filteredMembros = membros.filter(membro => {
        // Filter by Group
        if (filterGrupo !== 'ALL' && membro.grupo_id !== filterGrupo) return false

        // Filter by Qualification
        if (filterQualificacao !== 'ALL') {
            if (filterQualificacao === 'ANCIAO' && !membro.is_anciao) return false
            if (filterQualificacao === 'SERVO' && !membro.is_servo_ministerial) return false
            if (filterQualificacao === 'PIONEIRO' && !membro.is_pioneiro) return false
            if (filterQualificacao === 'PUBLICADOR' && !membro.is_publicador) return false
        }

        return true
    }).sort((a, b) => {
        let valA = ''
        let valB = ''

        if (sortField === 'nome_completo') {
            valA = a.nome_completo || ''
            valB = b.nome_completo || ''
        } else if (sortField === 'nome_civil') {
            valA = a.nome_civil || a.nome_completo || ''
            valB = b.nome_civil || b.nome_completo || ''
        } else if (sortField === 'grupo') {
            valA = a.grupos_servico?.nome || 'Sem Grupo'
            valB = b.grupos_servico?.nome || 'Sem Grupo'
        }

        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    })

    const handlePrint = () => {
        window.print()
    }

    if (loading) return <div className="p-8 text-center" suppressHydrationWarning>Carregando relatório...</div>

    return (
        <div className="p-8 max-w-[210mm] mx-auto min-h-screen bg-white text-slate-900">
            {/* Header / Controls (Hidden on Print) */}
            <div className="mb-8 print:hidden">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Relatório de Membros</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => router.back()}
                            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Voltar
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-2"
                        >
                            <span>🖨️</span> Imprimir
                        </button>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Grupo</label>
                        <select
                            value={filterGrupo}
                            onChange={(e) => setFilterGrupo(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded bg-white text-sm"
                        >
                            <option value="ALL">Todos os Grupos</option>
                            {grupos.map(g => (
                                <option key={g.id} value={g.id}>{g.nome}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Qualificação</label>
                        <select
                            value={filterQualificacao}
                            onChange={(e) => setFilterQualificacao(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded bg-white text-sm"
                        >
                            <option value="ALL">Todas</option>
                            <option value="ANCIAO">Ancião</option>
                            <option value="SERVO">Servo Ministerial</option>
                            <option value="PIONEIRO">Pioneiro Regular</option>
                            <option value="PUBLICADOR">Publicador</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Ordenar Por</label>
                        <select
                            value={sortField}
                            onChange={(e) => setSortField(e.target.value as any)}
                            className="w-full p-2 border border-slate-300 rounded bg-white text-sm"
                        >
                            <option value="nome_civil">Nome Civil</option>
                            <option value="nome_completo">Nome Usual</option>
                            <option value="grupo">Grupo</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Ordem</label>
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as any)}
                            className="w-full p-2 border border-slate-300 rounded bg-white text-sm"
                        >
                            <option value="asc">Crescente (A-Z)</option>
                            <option value="desc">Decrescente (Z-A)</option>
                        </select>
                    </div>
                </div>
                <div className="mt-2 text-sm text-slate-500">
                    {filteredMembros.length} registros encontrados
                </div>
            </div>

            {/* Report Content */}
            <div className="print-content">
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold uppercase">Lista de Membros</h2>
                    <p className="text-sm text-slate-500">
                        {new Date().toLocaleDateString('pt-BR')}
                    </p>
                </div>

                <table className="w-full text-sm border-collapse border border-slate-300">
                    <thead>
                        <tr className="bg-slate-100">
                            <th className="border border-slate-300 p-2 text-left w-1/4">Nome Civil</th>
                            <th className="border border-slate-300 p-2 text-left w-1/4">Nome Usual</th>
                            <th className="border border-slate-300 p-2 text-left w-1/4">Grupo</th>
                            <th className="border border-slate-300 p-2 text-left w-1/4">Qualificação</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredMembros.map((membro) => (
                            <tr key={membro.id} className="break-inside-avoid">
                                <td className="border border-slate-300 p-2 font-medium">
                                    {membro.contato ? (
                                        <a
                                            href={`https://wa.me/${membro.contato.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline print:no-underline print:text-inherit"
                                            title={`WhatsApp: ${membro.contato}`}
                                        >
                                            {membro.nome_civil || '-'}
                                        </a>
                                    ) : (
                                        membro.nome_civil || '-'
                                    )}
                                </td>
                                <td className="border border-slate-300 p-2">
                                    {membro.nome_completo}
                                </td>
                                <td className="border border-slate-300 p-2">
                                    {membro.grupos_servico?.nome || '-'}
                                </td>
                                <td className="border border-slate-300 p-2">
                                    {getQualificacao(membro)}
                                </td>
                            </tr>
                        ))}
                        {filteredMembros.length === 0 && (
                            <tr>
                                <td colSpan={4} className="border border-slate-300 p-8 text-center text-slate-500 italic">
                                    Nenhum membro encontrado com os filtros selecionados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 15mm;
                    }
                    body {
                        background: white;
                        -webkit-print-color-adjust: exact;
                    }
                    nav, aside, header, footer, .no-print {
                        display: none !important;
                    }
                    .print-content {
                        width: 100%;
                    }
                }
            `}</style>
        </div >
    )
}
