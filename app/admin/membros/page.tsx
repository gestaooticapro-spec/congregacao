'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Membro = Database['public']['Tables']['membros']['Row']

export default function MembrosPage() {
    const [membros, setMembros] = useState<Membro[]>([])
    const [colaboradores, setColaboradores] = useState<Database['public']['Tables']['colaboradores_externos']['Row'][]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    const [filter, setFilter] = useState('ALL')
    const [search, setSearch] = useState('')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [membrosResponse, colaboradoresResponse] = await Promise.all([
                supabase.from('membros').select('*').order('nome_civil'),
                supabase.from('colaboradores_externos').select('*')
            ])

            if (membrosResponse.error) throw membrosResponse.error
            if (colaboradoresResponse.error) throw colaboradoresResponse.error

            setMembros(membrosResponse.data || [])
            setColaboradores(colaboradoresResponse.data || [])
        } catch (error) {
            console.error('Erro ao buscar dados:', error)
            alert('Erro ao carregar dados')
        } finally {
            setLoading(false)
        }
    }

    const getBadges = (membro: Membro) => {
        const badges = []
        if (membro.is_anciao) badges.push({ label: 'Ancião', color: 'bg-blue-100 text-blue-800' })
        if (membro.is_servo_ministerial) badges.push({ label: 'Servo', color: 'bg-green-100 text-green-800' })
        if (membro.is_pioneiro) badges.push({ label: 'Pioneiro', color: 'bg-yellow-100 text-yellow-800' })
        return badges
    }

    const filteredMembros = membros.filter(membro => {
        // Exclude Admin
        if (membro.nome_completo === 'Admin do Sistema') return false

        const nomeDisplay = membro.nome_civil || membro.nome_completo
        const matchesSearch = nomeDisplay.toLowerCase().includes(search.toLowerCase())

        if (!matchesSearch) return false

        // Handle Inactive Filter
        if (filter === 'INACTIVE') return membro.ativo === false

        // For all other filters, only show active members
        if (membro.ativo === false) return false

        if (filter === 'ALL') return true
        if (filter === 'ANCIAO') return membro.is_anciao
        if (filter === 'SERVO') return membro.is_servo_ministerial
        if (filter === 'PIONEIRO') return membro.is_pioneiro
        if (filter === 'PUBLICADOR') return membro.is_publicador

        return true
    })

    const superintendente = colaboradores.find(c =>
        c.funcao.toLowerCase().includes('superintendente') ||
        c.funcao.toLowerCase().includes('circuito')
    )

    const handlePrint = () => {
        window.print()
    }

    if (loading) return <div className="p-8">Carregando...</div>

    return (
        <div className="max-w-6xl mx-auto p-8 print:p-0 print:max-w-none">
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 0;
                    }
                    
                    body {
                        background: white;
                        -webkit-print-color-adjust: exact;
                    }

                    nav, aside, header, footer, .no-print {
                        display: none !important;
                    }

                    body > main, 
                    body > main > div {
                        padding: 0 !important;
                        margin: 0 !important;
                        max-width: none !important;
                    }

                    .print-content {
                        display: block !important;
                        width: 100%;
                        padding: 20mm !important; /* Restores Top (Page 1), Side, and Bottom (Last Page) margins */
                    }

                    thead {
                        display: table-header-group;
                    }
                    
                    tfoot {
                        display: table-footer-group;
                    }

                    tr {
                        break-inside: avoid;
                    }

                    /* Spacer strategy for "No Margin" printers */
                    .print-spacer {
                        height: 20mm;
                        border: none !important;
                    }
                    .print-spacer td {
                        border: none !important;
                        padding: 0 !important;
                    }
                }
            `}</style>

            <div className="text-center mb-12 no-print">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Gerenciamento de Membros</h1>
                <div className="h-1 w-20 bg-primary mx-auto rounded-full"></div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/50 p-4 md:p-6 rounded-xl border border-slate-200 dark:border-slate-700 mb-8 no-print">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                🔍
                            </span>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por nome..."
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>
                    <div className="w-full md:w-64">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                        >
                            <option value="ALL">Todos os Membros (Ativos)</option>
                            <option value="INACTIVE">Membros Inativos</option>
                            <option value="ANCIAO">Anciãos</option>
                            <option value="SERVO">Servos Ministeriais</option>
                            <option value="PIONEIRO">Pioneiros</option>
                            <option value="PUBLICADOR">Publicadores</option>
                        </select>
                    </div>
                </div>
                <div className="mt-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
                    Mostrando {filteredMembros.length} de {membros.length} membros
                </div>
            </div>

            <div className="flex justify-end mb-6 gap-3 no-print">
                <button
                    onClick={handlePrint}
                    className="px-6 py-2 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors shadow-md flex items-center gap-2"
                >
                    <span>🖨️</span> Imprimir Lista
                </button>
                <Link
                    href="/admin/membros/novo"
                    className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2"
                >
                    <span>+</span> Novo Membro
                </Link>
            </div>

            {/* Screen View Table */}
            <div className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden no-print">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nome</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {filteredMembros.map((membro) => (
                            <tr
                                key={membro.id}
                                onClick={() => router.push(`/admin/membros/${membro.id}`)}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-1">
                                            {getBadges(membro).map((badge, idx) => (
                                                <span key={idx} className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-bold rounded-full ${badge.color}`}>
                                                    {badge.label}
                                                </span>
                                            ))}
                                        </div>
                                        <span>{membro.nome_civil || membro.nome_completo}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredMembros.length === 0 && (
                            <tr>
                                <td colSpan={2} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-4xl">👥</span>
                                        <p>Nenhum membro encontrado.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Print View Table */}
            <div className="hidden print:block print-content">
                <h2 className="text-2xl font-bold mb-4 text-center">Lista de Membros</h2>
                <table className="w-full text-sm border-collapse border border-slate-300">
                    <thead>
                        {/* Spacer for Top Margin on every page */}
                        <tr className="print-spacer"><td colSpan={6}></td></tr>
                        <tr className="bg-slate-100">
                            <th className="border border-slate-300 p-2 text-left">Nome Completo</th>
                            <th className="border border-slate-300 p-2 text-left">Nascimento</th>
                            <th className="border border-slate-300 p-2 text-left">Batismo</th>
                            <th className="border border-slate-300 p-2 text-left">Contato</th>
                            <th className="border border-slate-300 p-2 text-left">Emergência</th>
                            <th className="border border-slate-300 p-2 text-left">Endereço</th>
                        </tr>
                    </thead>
                    {/* Spacer for Bottom Margin on every page */}
                    <tfoot>
                        <tr className="print-spacer"><td colSpan={6}></td></tr>
                    </tfoot>
                    <tbody>
                        {superintendente && (
                            <tr className="break-inside-avoid bg-slate-50 font-bold">
                                <td className="border border-slate-300 p-2">{superintendente.nome} ({superintendente.funcao})</td>
                                <td className="border border-slate-300 p-2 text-center">-</td>
                                <td className="border border-slate-300 p-2 text-center">-</td>
                                <td className="border border-slate-300 p-2">{superintendente.contato || '-'}</td>
                                <td className="border border-slate-300 p-2 text-center">-</td>
                                <td className="border border-slate-300 p-2 text-center">-</td>
                            </tr>
                        )}
                        {filteredMembros.map((membro) => (
                            <tr key={membro.id} className="break-inside-avoid">
                                <td className="border border-slate-300 p-2 font-medium">{membro.nome_civil || membro.nome_completo}</td>
                                <td className="border border-slate-300 p-2">
                                    {membro.data_nascimento ? new Date(membro.data_nascimento).toLocaleDateString('pt-BR') : '-'}
                                </td>
                                <td className="border border-slate-300 p-2">
                                    {membro.data_batismo ? new Date(membro.data_batismo).toLocaleDateString('pt-BR') : '-'}
                                </td>
                                <td className="border border-slate-300 p-2">{membro.contato || '-'}</td>
                                <td className="border border-slate-300 p-2">{membro.contato_emergencia || '-'}</td>
                                <td className="border border-slate-300 p-2">{membro.endereco || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
