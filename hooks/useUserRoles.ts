import { useAuth } from '@/contexts/AuthProvider'

export function useUserRoles() {
    const { roles, loading, hasRole } = useAuth()

    // Maintain interface compatibility for existing components
    return {
        roles,
        loading,
        error: null, // Error handling is now internal to AuthProvider
        hasRole
    }
}
