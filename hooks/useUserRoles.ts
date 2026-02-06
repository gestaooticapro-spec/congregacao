import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { PerfilAcesso } from '@/types/database.types'

export function useUserRoles() {
    const [roles, setRoles] = useState<PerfilAcesso[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        let mounted = true

        const loadSession = async () => {
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()

                if (sessionError) {
                    throw sessionError
                }

                if (session?.user && mounted) {
                    setUserId(session.user.id)
                } else if (mounted) {
                    setRoles([])
                    setLoading(false)
                }
            } catch (err: any) {
                console.error('[useUserRoles] Error getting session:', err)
                if (mounted) {
                    setLoading(false)
                    setError(err.message || 'Erro ao obter sessao')
                }
            }
        }

        loadSession()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) {
                if (session?.user) {
                    if (session.user.id !== userId) {
                        setUserId(session.user.id)
                    }
                } else {
                    setUserId(null)
                    setRoles([])
                    setLoading(false)
                }
            }
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [userId])

    useEffect(() => {
        let mounted = true

        const fetchRoles = async () => {
            if (!userId) return

            setLoading(true)
            setError(null)

            try {
                const { data: membro, error: membroError } = await supabase
                    .from('membros')
                    .select('id')
                    .eq('user_id', userId)
                    .single()

                if (membroError) {
                    if (membroError.code === 'PGRST116') {
                        // Not found is not an error for us, just no roles
                        if (mounted) {
                            setRoles([])
                            setLoading(false)
                        }
                        return
                    }
                    throw membroError
                }

                if (!membro) {
                    if (mounted) {
                        setRoles([])
                        setLoading(false)
                    }
                    return
                }

                const { data: perfilData, error: perfilError } = await supabase
                    .from('membro_perfis')
                    .select('perfil')
                    .eq('membro_id', membro.id)

                if (perfilError) {
                    throw perfilError
                }

                if (mounted) {
                    const fetchedRoles = perfilData?.map(r => r.perfil) || []
                    setRoles(fetchedRoles)
                    setLoading(false)
                }
            } catch (err: any) {
                console.error('[useUserRoles] Error fetching roles:', err)
                if (mounted) {
                    setError(err.message || 'Erro ao carregar permissões')
                    setLoading(false)
                }
            }
        }

        if (userId) {
            fetchRoles()
        }
    }, [userId])

    const hasRole = (requiredRoles: PerfilAcesso[]) => {
        if (loading) return false
        if (requiredRoles.length === 0) return true
        return requiredRoles.some(role => roles.includes(role))
    }

    return { roles, loading, error, hasRole }
}
