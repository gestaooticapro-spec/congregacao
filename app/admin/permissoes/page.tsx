'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database, PerfilAcesso } from '@/types/database.types'
import PageHeader from '@/components/PageHeader'
import { Plus, X } from 'lucide-react'
import { getPerfilLabel } from '@/lib/perfis'

// Helper to get enum values
const PERFIS: PerfilAcesso[] = [
    'ADMIN',
    'COORDENADOR',
    'SECRETARIO',
    'SUPERINTENDENTE_SERVICO',
    'RESP_QUINTA',
    'RESP_SABADO',
    'RQA',
    'RT',
    'IRMAO'
]

type MembroWithRoles = Database['public']['Tables']['membros']['Row'] & {
    membro_perfis: { id: string; perfil: PerfilAcesso }[]
}

export default function ManagePermissionsPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [members, setMembers] = useState<MembroWithRoles[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedRole, setSelectedRole] = useState<PerfilAcesso>('IRMAO')
    const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null)

    useEffect(() => {
        void loadMembers()
    }, [])

    const loadMembers = async (query = '') => {
        setLoading(true)
        try {
            const isSearch = query.length >= 2
            let request = isSearch
                ? supabase
                    .from('membros')
                    .select('*, membro_perfis(id, perfil)')
                    .ilike('nome_completo', `%${query}%`)
                    .order('nome_completo')
                    .limit(50)
                : supabase
                    .from('membros')
                    .select('*, membro_perfis!inner(id, perfil)')
                    .neq('membro_perfis.perfil', 'IRMAO')
                    .not('nome_completo', 'ilike', '%admin%')
                    .order('nome_completo')
                    .limit(50)

            const { data, error } = await request
            if (error) throw error

            const results = data as MembroWithRoles[] || []
            const filteredResults = isSearch ? results : results.filter(member => {
                const nome = member.nome_completo.toLowerCase()
                const possuiPerfilGerenciavel = member.membro_perfis?.some(mp => mp.perfil !== 'IRMAO')

                return !nome.includes('admin') && possuiPerfilGerenciavel
            })

            setMembers(filteredResults)
        } catch (error) {
            console.error('Error fetching members:', error)
            setMembers([])
        } finally {
            setLoading(false)
        }
    }

    // Search members
    const handleSearch = async (query: string) => {
        setSearchQuery(query)
        if (query.length < 2) {
            void loadMembers()
            return
        }
        void loadMembers(query)
    }

    // Add role
    const addRole = async (membroId: string, role: PerfilAcesso) => {
        const { error } = await supabase
            .from('membro_perfis')
            .insert({ membro_id: membroId, perfil: role })

        if (error) {
            alert(`Erro ao adicionar perfil: ${error.message}`)
        } else {
            // Refresh list
            handleSearch(searchQuery)
        }
    }

    // Remove role
    const removeRole = async (membroId: string, perfil: PerfilAcesso) => {
        if (!confirm(`Tem certeza que deseja remover o perfil ${perfil}?`)) return

        const { error } = await supabase
            .from('membro_perfis')
            .delete()
            .match({ membro_id: membroId, perfil: perfil })

        if (error) {
            alert(`Erro ao remover perfil: ${error.message}`)
        } else {
            // Refresh list
            handleSearch(searchQuery)
        }
    }

    return (
        <div className="w-full min-w-0 pb-24 print:max-w-none print:p-0">
            <PageHeader
                className="mb-12"
                title="Gerenciar Permissões"
                backHref="/responsabilidades"
                backLabel="Responsabilidades"
            />

            {/* Search Card */}
            <div className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-8 mb-8">
                <div className="max-w-2xl mx-auto">
                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 text-center">
                        Buscar Membro
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white shadow-inner"
                            placeholder="Digite o nome do irmão..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
                    </div>
                </div>
            </div>

            {/* Results */}
            {loading && (
                <div className="text-center py-8">
                    <div className="animate-spin inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-2"></div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Buscando...</p>
                </div>
            )}

            <div className="space-y-6">
                {members.map((member) => (
                    <div
                        key={member.id}
                        className="group bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-primary/30 transition-all"
                    >
                        <div className="flex-1">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <h3 className="min-w-0 text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors break-words">
                                    {member.nome_completo}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setExpandedMemberId(current => current === member.id ? null : member.id)}
                                    className="shrink-0 p-2 text-primary hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                    title={expandedMemberId === member.id ? 'Fechar adição de perfil' : 'Adicionar perfil'}
                                    aria-label={expandedMemberId === member.id ? 'Fechar adição de perfil' : `Adicionar perfil para ${member.nome_completo}`}
                                >
                                    {expandedMemberId === member.id ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                </button>
                            </div>
                            {member.nome_civil && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                                    {member.nome_civil}
                                </p>
                            )}
                            <div className="flex flex-wrap gap-2">
                                {member.membro_perfis?.map((mp) => (
                                    <span
                                        key={mp.id}
                                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                                    >
                                        {getPerfilLabel(mp.perfil)}
                                        <button
                                            type="button"
                                            onClick={() => removeRole(member.id, mp.perfil)}
                                            aria-label={`Remover perfil ${mp.perfil}`}
                                            className="ml-2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                                        >
                                            &times;
                                        </button>
                                    </span>
                                ))}
                                {member.membro_perfis?.length === 0 && (
                                    <span className="text-sm text-slate-400 dark:text-slate-500 italic">Nenhum perfil atribuído</span>
                                )}
                            </div>
                        </div>

                        {expandedMemberId === member.id && (
                            <div className="w-full mt-2 flex flex-col gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                <select
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none dark:text-white"
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value as PerfilAcesso)}
                                >
                                    {PERFIS.map((p) => (
                                        <option key={p} value={p}>
                                            {getPerfilLabel(p)}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => addRole(member.id, selectedRole)}
                                    className="w-full px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-primary/20"
                                >
                                    Adicionar
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {!loading && searchQuery.length >= 2 && members.length === 0 && (
                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhum membro encontrado.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
