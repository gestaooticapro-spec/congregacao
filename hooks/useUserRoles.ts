import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { PerfilAcesso } from '@/types/database.types'

export function useUserRoles() {
    const [roles, setRoles] = useState<PerfilAcesso[]>([])
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUserId(session.user.id)
                fetchRoles(session.user.id)
            } else {
                setRoles([])
                setLoading(false)
            }
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                if (session.user.id !== userId) {
                    setUserId(session.user.id)
                    fetchRoles(session.user.id)
                }
            } else {
                setUserId(null)
                setRoles([])
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [userId])

    const fetchRoles = async (uid: string) => {
        try {
            const { data, error } = await supabase
                .from('membro_perfis')
                .select('perfil')
                .eq('membro_id', (
                    // We need to get the member ID from the user ID first
                    // Or join directly if possible. Let's do a two-step or join.
                    // Since membro_perfis links to membros, and membros links to auth.users
                    // We can query membros first.
                    await supabase
                        .from('membros')
                        .select('id')
                        .eq('user_id', uid)
                        .single()
                ).data?.id || '')

            if (error) {
                console.error('Error fetching roles:', error)
                setRoles([])
            } else {
                setRoles(data.map(r => r.perfil))
            }
        } catch (err) {
            console.error('Unexpected error fetching roles:', err)
            setRoles([])
        } finally {
            setLoading(false)
        }
    }

    const hasRole = (requiredRoles: PerfilAcesso[]) => {
        if (loading) return false
        if (requiredRoles.length === 0) return true
        return requiredRoles.some(role => roles.includes(role))
    }

    return { roles, loading, hasRole }
}
