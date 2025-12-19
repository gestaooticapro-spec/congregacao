'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database, PerfilAcesso } from '@/types/database.types'

// Helper to get enum values
const PERFIS: PerfilAcesso[] = [
    'ADMIN',
    'SECRETARIO',
    'SUPERINTENDENTE_SERVICO',
    'RESP_QUINTA',
    'RESP_SABADO',
    'RQA',
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

    // Search members
    const handleSearch = async (query: string) => {
        setSearchQuery(query)
        if (query.length < 2) {
            setMembers([])
            return
        }

        setLoading(true)
        const { data, error } = await supabase
            .from('membros')
            .select('*, membro_perfis(id, perfil)')
            .ilike('nome_completo', `%${query}%`)
            .limit(10)

        if (error) {
            console.error('Error fetching members:', error)
        } else {
            setMembers(data as any) // Type assertion needed for joined query
        }
        setLoading(false)
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
        <div className="max-w-4xl mx-auto p-8">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Gerenciar Permissões</h1>
                <div className="h-1 w-20 bg-primary mx-auto rounded-full"></div>
            </div>

            {/* Search Card */}
            <div className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-2xl border border-slate-200 dark:border-slate-800 p-8 mb-8">
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
                        className="group bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-primary/30 transition-all"
                    >
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-primary transition-colors">
                                {member.nome_completo}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {member.membro_perfis?.map((mp) => (
                                    <span
                                        key={mp.id}
                                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                                    >
                                        {mp.perfil}
                                        <button
                                            onClick={() => removeRole(member.id, mp.perfil)}
                                            className="ml-2 w-4 h-4 flex items-center justify-center rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
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

                        {/* Add Role Action */}
                        <div className="flex items-center gap-3 w-full md:w-auto bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                            <select
                                className="flex-1 md:w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none dark:text-white"
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value as PerfilAcesso)}
                            >
                                {PERFIS.map((p) => (
                                    <option key={p} value={p}>
                                        {p}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => addRole(member.id, selectedRole)}
                                className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-primary/20"
                            >
                                Adicionar
                            </button>
                        </div>
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
