'use client'

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Session, User } from '@supabase/supabase-js'
import { PerfilAcesso } from '@/types/database.types'

type AuthContextType = {
    user: User | null
    session: Session | null
    roles: PerfilAcesso[]
    loading: boolean
    hasRole: (requiredRoles: PerfilAcesso[]) => boolean
    refreshRoles: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [roles, setRoles] = useState<PerfilAcesso[]>([])
    const [loading, setLoading] = useState(true)

    const fetchRoles = async (userId: string) => {
        try {
            const { data: membro, error: membroError } = await supabase
                .from('membros')
                .select('id')
                .eq('user_id', userId)
                .single()

            if (membroError) {
                if (membroError.code === 'PGRST116') {
                    setRoles([])
                    return
                }
                throw membroError
            }

            if (!membro) {
                setRoles([])
                return
            }

            const { data: perfilData, error: perfilError } = await supabase
                .from('membro_perfis')
                .select('perfil')
                .eq('membro_id', membro.id)

            if (perfilError) throw perfilError

            const fetchedRoles = perfilData?.map(r => r.perfil) || []

            // Only update if roles have changed
            setRoles(prev => {
                if (JSON.stringify(prev) === JSON.stringify(fetchedRoles)) return prev
                return fetchedRoles
            })
        } catch (error) {
            console.error('[AuthProvider] Error fetching roles:', error)
            setRoles([])
        }
    }

    const refreshRoles = async () => {
        if (user) {
            await fetchRoles(user.id)
        }
    }

    useEffect(() => {
        let mounted = true

        // Track the current user ID to prevent redundant role fetches
        let lastUserId: string | undefined = undefined

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return

            // Only update session if it actually changed
            // (Supabase sometimes emits multiple events with same session)
            const currentUserId = session?.user?.id

            // Standardize loading state
            setLoading(true)
            setSession(session)
            setUser(session?.user ?? null)

            // If user changed or we have a user but no roles yet, fetch roles
            if (currentUserId && (currentUserId !== lastUserId || roles.length === 0)) {
                lastUserId = currentUserId
                await fetchRoles(currentUserId)
            } else if (!currentUserId) {
                lastUserId = undefined
                setRoles([])
            }

            setLoading(false)
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, []) // Dependencies intentionally empty

    const hasRole = (requiredRoles: PerfilAcesso[]) => {
        if (loading) return false
        if (requiredRoles.length === 0) return true
        return requiredRoles.some(role => roles.includes(role))
    }

    const value = useMemo(() => ({
        user,
        session,
        roles,
        loading,
        hasRole,
        refreshRoles
    }), [user, session, roles, loading])

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
