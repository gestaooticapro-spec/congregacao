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

        // CRITICAL: Explicitly get session on mount
        // onAuthStateChange may not fire reliably on app resume/background
        const initializeAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) {
                    console.error('[AuthProvider] Error getting initial session:', error)
                    if (mounted) setLoading(false)
                    return
                }

                if (mounted) {
                    setSession(session)
                    setUser(session?.user ?? null)

                    if (session?.user) {
                        await fetchRoles(session.user.id)
                    }

                    setLoading(false)
                }
            } catch (error) {
                console.error('[AuthProvider] Exception during init:', error)
                if (mounted) setLoading(false)
            }
        }

        initializeAuth()

        // Also listen for auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return

            // Skip INITIAL_SESSION since we handle it above
            if (event === 'INITIAL_SESSION') return

            setSession(session)
            setUser(session?.user ?? null)

            if (session?.user) {
                await fetchRoles(session.user.id)
            } else {
                setRoles([])
            }
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
    }, [])

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
