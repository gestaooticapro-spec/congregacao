'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { PerfilAcesso } from '@/types/database.types'

// Improved retry helper
async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
        return await fn()
    } catch (error) {
        if (retries > 0) {
            console.warn(`[AuthBackport] Retrying operation... (${retries} left)`)
            await new Promise(r => setTimeout(r, delay))
            return retry(fn, retries - 1, delay * 1.5) // Exponential backoff
        }
        throw error
    }
}

// Hard timeout wrapper
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            console.warn(`[AuthBackport] Operation timed out after ${ms}ms`)
            resolve(null)
        }, ms)
        promise.then(
            (val) => { clearTimeout(timer); resolve(val) },
            (err) => { clearTimeout(timer); console.warn('[AuthBackport] Promise rejected:', err); resolve(null) }
        )
    })
}

type AuthContextType = {
    user: User | null
    session: Session | null
    roles: PerfilAcesso[]
    loading: boolean
    hasRole: (requiredRoles: PerfilAcesso[]) => boolean
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    roles: [],
    loading: true,
    hasRole: () => false,
    signOut: async () => { },
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [roles, setRoles] = useState<PerfilAcesso[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const syncingRef = useRef(false)

    const fetchRoles = useCallback(async (userId: string): Promise<PerfilAcesso[]> => {
        const fetchLogic = async () => {
            // 1. Get Membro ID
            const memberResult = await supabase
                .from('membros')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle()

            if (memberResult.error) throw memberResult.error
            if (!memberResult.data) return []

            // 2. Get Roles
            const rolesResult = await supabase
                .from('membro_perfis')
                .select('perfil')
                .eq('membro_id', memberResult.data.id)

            if (rolesResult.error) throw rolesResult.error
            return rolesResult.data.map((p: any) => p.perfil) as PerfilAcesso[]
        }

        try {
            // Wrap in Retry AND Timeout (Total 10s seems safe)
            const data = await withTimeout(
                retry(fetchLogic, 3, 1000),
                10000
            )
            return data || []
        } catch (e) {
            console.error('[AuthBackport] Error fetching roles after retries:', e)
            return []
        }
    }, [])

    const syncAuth = useCallback(async (newSession: Session | null) => {
        if (syncingRef.current) return
        syncingRef.current = true

        try {
            console.log('[AuthBackport] syncAuth', { hasSession: !!newSession, email: newSession?.user?.email })
            setSession(newSession)
            setUser(newSession?.user ?? null)

            if (newSession?.user) {
                // Only update roles if fetching succeeds. If it returns [], implies no roles or persistent error.
                // We cannot distinguish easily, but with retries, it's safer.
                const userRoles = await fetchRoles(newSession.user.id)
                console.log('[AuthBackport] Roles:', userRoles)
                setRoles(userRoles)
            } else {
                setRoles([])
            }
        } finally {
            setLoading(false)
            syncingRef.current = false
        }
    }, [fetchRoles])

    useEffect(() => {
        let mounted = true

        const initialize = async () => {
            try {
                const result = await withTimeout(supabase.auth.getSession(), 8000) // Increased init timeout
                if (mounted && result) {
                    await syncAuth(result.data.session)
                } else if (mounted) {
                    console.warn('[AuthBackport] Initial getSession timed out')
                    setLoading(false)
                }
            } catch (e) {
                console.error('[AuthBackport] Init error:', e)
                if (mounted) setLoading(false)
            }
        }
        initialize()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`[AuthBackport] onAuthStateChange: ${event}`)
            if (!mounted) return

            if (event === 'SIGNED_OUT') {
                setSession(null)
                setUser(null)
                setRoles([])
                setLoading(false)
            } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                await syncAuth(session)
            }
        })

        // Gentle re-sync on focus with debounce AND timeout
        let focusTimeout: NodeJS.Timeout | null = null
        const handleFocus = () => {
            if (focusTimeout) clearTimeout(focusTimeout)
            focusTimeout = setTimeout(async () => {
                if (!mounted) return
                console.log('[AuthBackport] Focus re-sync (debounced)')
                try {
                    // Use a simpler check or short timeout
                    const result = await withTimeout(supabase.auth.getSession(), 5000)
                    if (mounted && result) {
                        await syncAuth(result.data.session)
                    }
                } catch (e) {
                    console.warn('[AuthBackport] Focus sync failed (keeping current state)')
                }
            }, 2000)
        }
        window.addEventListener('focus', handleFocus)

        return () => {
            mounted = false
            subscription.unsubscribe()
            window.removeEventListener('focus', handleFocus)
            if (focusTimeout) clearTimeout(focusTimeout)
        }
    }, [syncAuth])

    const hasRole = useCallback((requiredRoles: PerfilAcesso[]) => {
        if (!requiredRoles || requiredRoles.length === 0) return true
        return requiredRoles.some(role => roles.includes(role))
    }, [roles])

    const signOut = useCallback(async () => {
        console.log('[AuthBackport] signOut')
        setSession(null)
        setUser(null)
        setRoles([])
        try { await supabase.auth.signOut() } catch { }
        router.push('/login')
        router.refresh()
    }, [router])

    const value = useMemo(() => ({
        user, session, roles, loading, hasRole, signOut
    }), [user, session, roles, loading, hasRole, signOut])

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
