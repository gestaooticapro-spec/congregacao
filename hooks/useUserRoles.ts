import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { PerfilAcesso } from '@/types/database.types'

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 2000
const LOADING_TIMEOUT_MS = 10000

export function useUserRoles() {
    const [roles, setRoles] = useState<PerfilAcesso[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const retryCountRef = useRef(0)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    const clearLoadingTimeout = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
    }

    const startLoadingTimeout = () => {
        clearLoadingTimeout()
        timeoutRef.current = setTimeout(() => {
            console.warn('[useUserRoles] Loading timeout reached, forcing loading to false')
            setLoading(false)
            setError('Timeout ao carregar permissoes')
        }, LOADING_TIMEOUT_MS)
    }

    useEffect(() => {
        const loadSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                if (session?.user) {
                    setUserId(session.user.id)
                    fetchRolesWithRetry(session.user.id)
                } else {
                    setRoles([])
                    setLoading(false)
                }
            } catch (err) {
                console.error('[useUserRoles] Error getting session:', err)
                setLoading(false)
                setError('Erro ao obter sessao')
            }
        }

        loadSession()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                if (session.user.id !== userId) {
                    setUserId(session.user.id)
                    retryCountRef.current = 0
                    fetchRolesWithRetry(session.user.id)
                }
            } else {
                setUserId(null)
                setRoles([])
                setLoading(false)
            }
        })

        return () => {
            subscription.unsubscribe()
            clearLoadingTimeout()
        }
    }, [userId])

    const fetchRolesWithRetry = async (uid: string) => {
        setLoading(true)
        setError(null)
        startLoadingTimeout()

        try {
            await fetchRoles(uid)
        } catch (err) {
            console.error('[useUserRoles] Fetch failed, attempt', retryCountRef.current + 1)

            if (retryCountRef.current < MAX_RETRIES) {
                retryCountRef.current++
                console.log(`[useUserRoles] Retrying in ${RETRY_DELAY_MS}ms...`)
                setTimeout(() => fetchRolesWithRetry(uid), RETRY_DELAY_MS)
            } else {
                console.error('[useUserRoles] Max retries reached')
                setError('Erro ao carregar permissoes apos varias tentativas')
                setLoading(false)
                clearLoadingTimeout()
            }
        }
    }

    const fetchRoles = async (uid: string) => {
        const { data: membro, error: membroError } = await supabase
            .from('membros')
            .select('id')
            .eq('user_id', uid)
            .single()

        if (membroError) {
            if (membroError.code === 'PGRST116') {
                console.log('[useUserRoles] User not linked to any member')
                setRoles([])
                setLoading(false)
                clearLoadingTimeout()
                return
            }
            console.error('[useUserRoles] Error fetching member:', membroError)
            throw new Error(membroError.message)
        }

        if (!membro?.id) {
            console.log('[useUserRoles] No member found for user')
            setRoles([])
            setLoading(false)
            clearLoadingTimeout()
            return
        }

        const { data: perfilData, error: perfilError } = await supabase
            .from('membro_perfis')
            .select('perfil')
            .eq('membro_id', membro.id)

        if (perfilError) {
            console.error('[useUserRoles] Error fetching roles:', perfilError)
            throw new Error(perfilError.message)
        }

        const fetchedRoles = perfilData?.map(r => r.perfil) || []
        console.log('[useUserRoles] Roles loaded:', fetchedRoles)
        setRoles(fetchedRoles)
        setLoading(false)
        clearLoadingTimeout()
    }

    const hasRole = (requiredRoles: PerfilAcesso[]) => {
        if (loading) return false
        if (requiredRoles.length === 0) return true
        return requiredRoles.some(role => roles.includes(role))
    }

    return { roles, loading, error, hasRole }
}
