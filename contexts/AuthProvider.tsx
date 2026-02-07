'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react'
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

const logAuth = (message: string, details?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString()
    if (details) {
        console.log(`[AuthProvider][${timestamp}] ${message}`, details)
        return
    }
    console.log(`[AuthProvider][${timestamp}] ${message}`)
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [roles, setRoles] = useState<PerfilAcesso[]>([])
    const [loading, setLoading] = useState(true)
    const mountedRef = useRef(false)
    const syncIdRef = useRef(0)

    const fetchRolesForUser = useCallback(async (userId: string, syncId: number) => {
        logAuth('Fetching roles', { userId, syncId })
        try {
            const { data: membro, error: membroError } = await supabase
                .from('membros')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle()

            if (membroError) {
                throw membroError
            }

            if (!membro) {
                logAuth('User has no linked member record', { userId, syncId })
                return []
            }

            const { data: perfilData, error: perfilError } = await supabase
                .from('membro_perfis')
                .select('perfil')
                .eq('membro_id', membro.id)

            if (perfilError) throw perfilError

            return perfilData?.map(r => r.perfil) || []
        } catch (error) {
            logAuth('Error fetching roles', {
                userId,
                syncId,
                error: error instanceof Error ? error.message : String(error),
            })
            throw error
        }
    }, [])

    const syncFromSession = useCallback(async (nextSession: Session | null, source: string) => {
        const syncId = ++syncIdRef.current
        const nextUserId = nextSession?.user?.id ?? null

        logAuth('Sync start', {
            source,
            syncId,
            hasSession: !!nextSession,
            userId: nextUserId,
        })

        if (!mountedRef.current) return

        setSession(nextSession)
        setUser(nextSession?.user ?? null)

        if (!nextSession?.user) {
            setRoles([])
            setLoading(false)
            logAuth('Sync completed without active session', { source, syncId })
            return
        }

        setLoading(true)

        try {
            const fetchedRoles = await fetchRolesForUser(nextSession.user.id, syncId)

            if (!mountedRef.current || syncId !== syncIdRef.current) {
                logAuth('Discarding stale sync result', {
                    source,
                    syncId,
                    activeSyncId: syncIdRef.current,
                })
                return
            }

            setRoles(prev => {
                if (JSON.stringify(prev) === JSON.stringify(fetchedRoles)) return prev
                return fetchedRoles
            })

            logAuth('Roles applied', {
                source,
                syncId,
                roleCount: fetchedRoles.length,
                roles: fetchedRoles,
            })
        } catch (error) {
            if (!mountedRef.current || syncId !== syncIdRef.current) return
            setRoles([])
            logAuth('Sync failed, roles cleared', {
                source,
                syncId,
                error: error instanceof Error ? error.message : String(error),
            })
        } finally {
            if (mountedRef.current && syncId === syncIdRef.current) {
                setLoading(false)
                logAuth('Sync end', { source, syncId })
            }
        }
    }, [fetchRolesForUser])

    const refreshRoles = useCallback(async () => {
        await syncFromSession(session, 'manual-refresh')
    }, [session, syncFromSession])

    useEffect(() => {
        mountedRef.current = true

        // CRITICAL: Explicitly get session on mount
        // onAuthStateChange may not fire reliably on app resume/background
        const initializeAuth = async () => {
            logAuth('Initialization start')
            setLoading(true)

            try {
                const { data: { session }, error } = await supabase.auth.getSession()
                logAuth('getSession result', {
                    hasSession: !!session,
                    userId: session?.user?.id ?? null,
                    error: error?.message ?? null,
                })

                if (error) {
                    if (mountedRef.current) setLoading(false)
                    return
                }

                await syncFromSession(session, 'initialize')
            } catch (error) {
                logAuth('Initialization error', {
                    error: error instanceof Error ? error.message : String(error),
                })
                if (mountedRef.current) setLoading(false)
            }
        }

        void initializeAuth()

        // Also listen for auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mountedRef.current) return

            // Skip INITIAL_SESSION since we handle it above
            if (event === 'INITIAL_SESSION') {
                logAuth('Skipping INITIAL_SESSION event')
                return
            }

            logAuth('Auth state change', {
                event,
                hasSession: !!session,
                userId: session?.user?.id ?? null,
            })
            await syncFromSession(session, `auth:${event}`)
        })

        const handleFocus = async () => {
            if (!mountedRef.current) return
            logAuth('Window focus: resyncing session')
            const { data: { session }, error } = await supabase.auth.getSession()
            if (error) {
                logAuth('Window focus getSession error', { error: error.message })
                return
            }
            await syncFromSession(session, 'window-focus')
        }

        const handleVisibilityChange = async () => {
            if (document.visibilityState !== 'visible' || !mountedRef.current) return
            logAuth('Visibility visible: resyncing session')
            const { data: { session }, error } = await supabase.auth.getSession()
            if (error) {
                logAuth('Visibility getSession error', { error: error.message })
                return
            }
            await syncFromSession(session, 'visibility-visible')
        }

        const onWindowFocus = () => {
            void handleFocus()
        }
        const onVisibilityChange = () => {
            void handleVisibilityChange()
        }

        window.addEventListener('focus', onWindowFocus)
        document.addEventListener('visibilitychange', onVisibilityChange)

        return () => {
            mountedRef.current = false
            subscription.unsubscribe()

            window.removeEventListener('focus', onWindowFocus)
            document.removeEventListener('visibilitychange', onVisibilityChange)
        }
    }, [syncFromSession])

    const hasRole = useCallback((requiredRoles: PerfilAcesso[]) => {
        if (loading) return false
        if (requiredRoles.length === 0) return true
        return requiredRoles.some(role => roles.includes(role))
    }, [loading, roles])

    const value = useMemo(() => ({
        user,
        session,
        roles,
        loading,
        hasRole,
        refreshRoles
    }), [user, session, roles, loading, hasRole, refreshRoles])

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
