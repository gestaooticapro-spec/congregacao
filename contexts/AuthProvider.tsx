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
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            attempts++;
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
                    logAuth(`Attempt ${attempts}: User has no linked member record yet`, { userId, syncId })
                    if (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
                        continue;
                    }
                    return []
                }

                const { data: perfilData, error: perfilError } = await supabase
                    .from('membro_perfis')
                    .select('perfil')
                    .eq('membro_id', membro.id)

                if (perfilError) throw perfilError

                // If roles found, return them. 
                // If roles empty but member found, it might be RLS or just no roles assigned.
                // We'll trust the result if member found, but maybe retry if empty?
                // Let's retry if empty just in case RLS lags slightly (unlikely but safe).
                if (!perfilData || perfilData.length === 0) {
                    logAuth(`Attempt ${attempts}: Member found but roles empty`, { userId, syncId })
                    if (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        continue;
                    }
                }

                return perfilData?.map(r => r.perfil) || []
            } catch (error) {
                logAuth(`Error fetching roles (Attempt ${attempts})`, {
                    userId,
                    syncId,
                    error: error instanceof Error ? error.message : String(error),
                })
                if (attempts === maxAttempts) throw error
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        return [];
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

            // CRITICAL FIX: Do not wipe roles on transient background sync failures
            // If the user already has roles, and a re-sync fails (e.g. network blip on focus),
            // we should KEEP the old roles rather than downgrading them to public.
            if (source === 'window-focus' || source === 'visibility-visible' || source.startsWith('auth:')) {
                logAuth('Background sync failed - preserving existing roles', {
                    source,
                    syncId,
                    error: error instanceof Error ? error.message : String(error),
                    currentRolesCount: roles.length
                })
                // Do NOT setRoles([]) here.
            } else {
                setRoles([])
                logAuth('Sync failed, roles cleared', {
                    source,
                    syncId,
                    error: error instanceof Error ? error.message : String(error),
                })
            }
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
            logAuth('Window focus: validating session with server')

            // FIX PWA: getSession() is too lazy (reads from localStorage).
            // getUser() forces a network call to Supabase. If token is invalid, it triggers auto-refresh.
            const { data: { user }, error } = await supabase.auth.getUser()

            if (error) {
                logAuth('Window focus validation failed', { error: error.message })
                // If getUser fails (401), Supabase client usually triggers event 'SIGNED_OUT'
                // We let the event listener handle the cleanup.
                return
            }

            if (user) {
                // Now that we know token is valid (or refreshed), get the session object
                const { data: { session } } = await supabase.auth.getSession()
                await syncFromSession(session, 'window-focus')
            }
        }

        const handleVisibilityChange = async () => {
            // AGGRESSIVE LOGOUT STRATEGY:
            // If the app goes to background (hidden), we force a logout.
            // This ensures that when the user returns, they must log in again,
            // guaranteeing a fresh connection and avoiding "frozen" states.
            if (document.visibilityState === 'hidden' && mountedRef.current) {
                logAuth('App went to background: forcing aggressive logout')
                await supabase.auth.signOut()
                setSession(null)
                setUser(null)
                setRoles([])
                return
            }
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
        // FIX: If we already have roles, don't hide the menu just because a background refresh is loading.
        // Only block if we are loading AND have no roles yet (initial state).
        if (loading && roles.length === 0) return false
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
