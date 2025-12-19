'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Membro = Database['public']['Tables']['membros']['Row']

export default function MembrosPage() {
    const [membros, setMembros] = useState<Membro[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        fetchMembros()
    }, [])

    const fetchMembros = async () => {
        try {
            const { data, error } = await supabase
                .from('membros')
                .select('*')
                .order('nome_completo')

            if (error) throw error
            setMembros(data || [])
        } catch (error) {
            console.error('Erro ao buscar membros:', error)
            alert('Erro ao carregar membros')
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

    if (loading) return <div className="p-8">Carregando...</div>

    return (
        <div className="max-w-6xl mx-auto p-8">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Gerenciamento de Membros</h1>
                <div className="h-1 w-20 bg-primary mx-auto rounded-full"></div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 mb-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex-1 w-full">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                🔍
                            </span>
                            <input
                                type="text"
                                placeholder="Buscar por nome..."
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button className="flex-1 md:flex-none px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                            Buscar
                        </button>
                        <button className="flex-1 md:flex-none px-6 py-2 bg-secondary text-white rounded-lg font-semibold hover:bg-slate-700 transition-colors shadow-sm">
                            Limpar Pesquisa
                        </button>
                    </div>
                </div>
                <div className="mt-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
                    Mostrando {membros.length} de {membros.length} membros
                </div>
            </div>

            <div className="flex justify-end mb-6">
                <Link
                    href="/admin/membros/novo"
                    className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2"
                >
                    <span>+</span> Novo Membro
                </Link>
            </div>

            <div className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nome</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Qualificações</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {membros.map((membro) => (
                            <tr key={membro.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-white">
                                    {membro.nome_completo}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">
                                    <div className="flex gap-2 flex-wrap">
                                        {getBadges(membro).map((badge, idx) => (
                                            <span key={idx} className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${badge.color}`}>
                                                {badge.label}
                                            </span>
                                        ))}
                                        {getBadges(membro).length === 0 && <span className="text-slate-400">-</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Link
                                        href={`/admin/membros/${membro.id}`}
                                        className="text-primary hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-bold"
                                    >
                                        Editar
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {membros.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-4xl">👥</span>
                                        <p>Nenhum membro cadastrado.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
