'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
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
            setRoles(fetchedRoles)
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

        const initSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession()
                if (error) throw error

                if (mounted) {
                    setSession(session)
                    setUser(session?.user ?? null)

                    if (session?.user) {
                        await fetchRoles(session.user.id)
                    } else {
                        setRoles([])
                    }
                }
            } catch (error) {
                console.error('[AuthProvider] Error initializing session:', error)
            } finally {
                if (mounted) setLoading(false)
            }
        }

        initSession()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return

            console.log('[AuthProvider] Auth state change:', event)

            setSession(session)
            setUser(session?.user ?? null)
            setLoading(true)

            if (session?.user) {
                await fetchRoles(session.user.id)
            } else {
                setRoles([])
            }

            setLoading(false)
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

    return (
        <AuthContext.Provider value={{
            user,
            session,
            roles,
            loading,
            hasRole,
            refreshRoles
        }}>
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
