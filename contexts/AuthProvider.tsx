'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { PerfilAcesso } from '@/types/database.types'

type AuthContextType = {
    user: User | null
    session: Session | null
    roles: PerfilAcesso[]
    loading: boolean
    hasRole: (requiredRoles: PerfilAcesso[]) => boolean
    signOut: () => Promise<void>
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

async function retry<T>(fn: () => Promise<T>, retries = 2, delay = 500): Promise<T> {
    try {
        return await fn()
    } catch (error) {
        if (retries <= 0) throw error
        logAuth('Retrying auth operation', { retriesLeft: retries })
        await new Promise(resolve => setTimeout(resolve, delay))
        return retry(fn, retries - 1, delay * 2)
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [roles, setRoles] = useState<PerfilAcesso[]>([])
    const [loading, setLoading] = useState(true)
    const mountedRef = useRef(false)
    const syncIdRef = useRef(0)
    const rolesRef = useRef<PerfilAcesso[]>([])
    const router = useRouter()

    useEffect(() => {
        rolesRef.current = roles
    }, [roles])

    const fetchRolesForUser = useCallback(async (userId: string, syncId: number): Promise<PerfilAcesso[] | null> => {
        logAuth('Fetching roles', { userId, syncId })

        try {
            return await retry(async () => {
                const { data: member, error: memberError } = await supabase
                    .from('membros')
                    .select('id')
                    .eq('user_id', userId)
                    .maybeSingle()

                if (memberError) throw memberError
                if (!member) {
                    logAuth('No member linked to user', { userId, syncId })
                    return []
                }

                const { data: roleRows, error: rolesError } = await supabase
                    .from('membro_perfis')
                    .select('perfil')
                    .eq('membro_id', member.id)

                if (rolesError) throw rolesError

                return roleRows.map(row => row.perfil as PerfilAcesso)
            })
        } catch (error) {
            logAuth('Failed to fetch roles', {
                userId,
                syncId,
                error: error instanceof Error ? error.message : String(error),
            })
            return null
        }
    }, [])

    const syncFromSession = useCallback(async (nextSession: Session | null, source: string) => {
        const syncId = ++syncIdRef.current
        const nextUser = nextSession?.user ?? null
        const hadRoles = rolesRef.current.length > 0
        const isBackgroundSync = source !== 'initialize' && source !== 'auth:SIGNED_IN'

        logAuth('Sync start', {
            source,
            syncId,
            hasSession: !!nextSession,
            userId: nextUser?.id ?? null,
            hadRoles,
        })

        if (!mountedRef.current) return

        setSession(nextSession)
        setUser(nextUser)

        if (!nextUser) {
            setRoles([])
            setLoading(false)
            logAuth('Sync finished without active session', { source, syncId })
            return
        }

        setLoading(true)

        try {
            const fetchedRoles = await fetchRolesForUser(nextUser.id, syncId)

            if (!mountedRef.current || syncId !== syncIdRef.current) {
                logAuth('Discarding stale sync result', {
                    source,
                    syncId,
                    activeSyncId: syncIdRef.current,
                })
                return
            }

            if (fetchedRoles === null) {
                if (isBackgroundSync && hadRoles) {
                    logAuth('Background sync failed, preserving existing roles', {
                        source,
                        syncId,
                        currentRoleCount: rolesRef.current.length,
                    })
                    return
                }

                setRoles([])
                logAuth('Sync failed before roles could be resolved', { source, syncId })
                return
            }

            setRoles(prevRoles => {
                const current = prevRoles.join('|')
                const next = fetchedRoles.join('|')
                return current === next ? prevRoles : fetchedRoles
            })

            logAuth('Roles applied', {
                source,
                syncId,
                roles: fetchedRoles,
            })
        } finally {
            if (mountedRef.current && syncId === syncIdRef.current) {
                setLoading(false)
                logAuth('Sync end', { source, syncId })
            }
        }
    }, [fetchRolesForUser])

    const signOut = useCallback(async () => {
        logAuth('Sign out requested')
        setSession(null)
        setUser(null)
        setRoles([])
        setLoading(false)

        try {
            const { error: globalError } = await supabase.auth.signOut({ scope: 'global' })
            if (globalError) {
                logAuth('Global sign out failed, retrying locally', { error: globalError.message })
                const { error: localError } = await supabase.auth.signOut({ scope: 'local' })
                if (localError) {
                    logAuth('Local sign out also failed', { error: localError.message })
                }
            }
        } catch (error) {
            logAuth('Unexpected sign out error', {
                error: error instanceof Error ? error.message : String(error),
            })
        }

        router.replace('/login')
        router.refresh()
    }, [router])

    useEffect(() => {
        mountedRef.current = true

        const initialize = async () => {
            logAuth('Initialization start')

            try {
                const { data: { session: initialSession }, error } = await supabase.auth.getSession()
                if (error) {
                    logAuth('Initialization getSession failed', { error: error.message })
                    if (mountedRef.current) setLoading(false)
                    return
                }

                await syncFromSession(initialSession, 'initialize')
            } catch (error) {
                logAuth('Initialization error', {
                    error: error instanceof Error ? error.message : String(error),
                })
                if (mountedRef.current) setLoading(false)
            }
        }

        void initialize()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
            if (!mountedRef.current) return
            if (event === 'INITIAL_SESSION') return

            logAuth('Auth state changed', {
                event,
                hasSession: !!nextSession,
                userId: nextSession?.user?.id ?? null,
            })

            if (event === 'SIGNED_OUT') {
                setSession(null)
                setUser(null)
                setRoles([])
                setLoading(false)
                return
            }

            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                void syncFromSession(nextSession, `auth:${event}`)
            }
        })

        const handleFocus = async () => {
            if (!mountedRef.current) return
            logAuth('Window focus, validating session')

            try {
                const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
                if (userError) {
                    logAuth('Focus validation failed', { error: userError.message })
                    return
                }

                if (!currentUser) return

                const { data: { session: focusedSession }, error: sessionError } = await supabase.auth.getSession()
                if (sessionError) {
                    logAuth('Focus getSession failed', { error: sessionError.message })
                    return
                }

                await syncFromSession(focusedSession, 'window-focus')
            } catch (error) {
                logAuth('Unexpected focus sync error', {
                    error: error instanceof Error ? error.message : String(error),
                })
            }
        }

        const handleVisibilityChange = async () => {
            if (document.visibilityState !== 'visible' || !mountedRef.current) return

            try {
                const { data: { session: visibleSession }, error } = await supabase.auth.getSession()
                if (error) {
                    logAuth('Visibility getSession failed', { error: error.message })
                    return
                }

                await syncFromSession(visibleSession, 'visibility-visible')
            } catch (error) {
                logAuth('Unexpected visibility sync error', {
                    error: error instanceof Error ? error.message : String(error),
                })
            }
        }

        window.addEventListener('focus', handleFocus)
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            mountedRef.current = false
            subscription.unsubscribe()
            window.removeEventListener('focus', handleFocus)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [syncFromSession])

    const hasRole = useCallback((requiredRoles: PerfilAcesso[]) => {
        if (loading && roles.length === 0) return false
        if (!requiredRoles || requiredRoles.length === 0) return true
        return requiredRoles.some(role => roles.includes(role))
    }, [loading, roles])

    const value = useMemo(() => ({
        user,
        session,
        roles,
        loading,
        hasRole,
        signOut,
    }), [user, session, roles, loading, hasRole, signOut])

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
