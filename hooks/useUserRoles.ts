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

    useEffect(() => {
        // Safety timeout: if loading takes too long, force it to false
        timeoutRef.current = setTimeout(() => {
            if (loading) {
                console.warn('[useUserRoles] Loading timeout reached, forcing loading to false')
                setLoading(false)
                setError('Timeout ao carregar permissões')
            }
        }, LOADING_TIMEOUT_MS)

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUserId(session.user.id)
                fetchRolesWithRetry(session.user.id)
            } else {
                setRoles([])
                setLoading(false)
            }
        }).catch(err => {
            console.error('[useUserRoles] Error getting session:', err)
            setLoading(false)
            setError('Erro ao obter sessão')
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                if (session.user.id !== userId) {
                    setUserId(session.user.id)
                    retryCountRef.current = 0 // Reset retries on new user
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
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [userId])

    const fetchRolesWithRetry = async (uid: string) => {
        setLoading(true)
        setError(null)

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
                setError('Erro ao carregar permissões após várias tentativas')
                setLoading(false)
            }
        }
    }

    const fetchRoles = async (uid: string) => {
        // Step 1: Get member ID from user ID
        const { data: membro, error: membroError } = await supabase
            .from('membros')
            .select('id')
            .eq('user_id', uid)
            .single()

        if (membroError) {
            // PGRST116 = no rows found, which is valid (user not linked to member)
            if (membroError.code === 'PGRST116') {
                console.log('[useUserRoles] User not linked to any member')
                setRoles([])
                setLoading(false)
                return
            }
            console.error('[useUserRoles] Error fetching member:', membroError)
            throw new Error(membroError.message)
        }

        if (!membro?.id) {
            console.log('[useUserRoles] No member found for user')
            setRoles([])
            setLoading(false)
            return
        }

        // Step 2: Get roles for the member
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

        // Clear timeout since we succeeded
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
    }

    const hasRole = (requiredRoles: PerfilAcesso[]) => {
        if (loading) return false
        if (requiredRoles.length === 0) return true
        return requiredRoles.some(role => roles.includes(role))
    }

    return { roles, loading, error, hasRole }
}
