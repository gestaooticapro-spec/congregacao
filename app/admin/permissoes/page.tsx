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
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Gerenciar Permissões</h1>

            {/* Search Input */}
            <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Buscar Membro
                </label>
                <input
                    type="text"
                    className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Digite o nome do irmão..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                />
            </div>

            {/* Results */}
            {loading && <p className="text-gray-500 dark:text-gray-400">Carregando...</p>}

            <div className="space-y-4">
                {members.map((member) => (
                    <div
                        key={member.id}
                        className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    >
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{member.nome_completo}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {member.membro_perfis?.map((mp) => (
                                    <span
                                        key={mp.id}
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                    >
                                        {mp.perfil}
                                        <button
                                            onClick={() => removeRole(member.id, mp.perfil)}
                                            className="ml-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100 focus:outline-none"
                                        >
                                            &times;
                                        </button>
                                    </span>
                                ))}
                                {member.membro_perfis?.length === 0 && (
                                    <span className="text-sm text-gray-500 dark:text-gray-400 italic">Sem perfis</span>
                                )}
                            </div>
                        </div>

                        {/* Add Role Action */}
                        <div className="flex items-center gap-2">
                            <select
                                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                Adicionar
                            </button>
                        </div>
                    </div>
                ))}

                {!loading && searchQuery.length >= 2 && members.length === 0 && (
                    <p className="text-gray-500 dark:text-gray-400">Nenhum membro encontrado.</p>
                )}
            </div>
        </div>
    )
}
