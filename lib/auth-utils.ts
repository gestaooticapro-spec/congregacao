import { supabase } from '@/lib/supabaseClient'

export const BIOMETRIC_KEYS = {
    CREDENTIAL_ID: 'biometric_credential',
    EMAIL: 'biometric_email',
    REFRESH_TOKEN: 'biometric_refresh_token',
    ENROLLED: 'biometric_enrolled'
}

/**
 * Performs a "Soft Logout" if biometrics are enabled.
 * This clears the session from the browser memory/cookies but keeps
 * the refresh token in localStorage to allow biometric re-authentication.
 */
export async function performLogout() {
    const isEnrolled = localStorage.getItem(BIOMETRIC_KEYS.ENROLLED) === 'true'

    if (isEnrolled) {
        // Soft Logout: Clear Supabase session from storage but KEEP biometric keys
        // We manually remove the Supabase token keys
        const supabaseKey = 'sb-' + process.env.NEXT_PUBLIC_SUPABASE_URL?.split('.')[0].split('//')[1] + '-auth-token'

        // Note: Supabase might use a different key format depending on configuration.
        // A safer way is to just let Supabase sign out, but that invalidates the refresh token on the server.
        // So we MUST NOT call supabase.auth.signOut() if we want to reuse the refresh token.

        // Instead, we just clear the local storage items that Supabase uses, 
        // effectively "forgetting" the session on the client.
        // However, we must preserve the BIOMETRIC_KEYS.

        // Iterate and remove non-biometric keys
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && !Object.values(BIOMETRIC_KEYS).includes(key)) {
                keysToRemove.push(key)
            }
        }

        keysToRemove.forEach(key => localStorage.removeItem(key))

        // Force a reload to clear in-memory state
        window.location.href = '/'
    } else {
        // Standard Logout
        await supabase.auth.signOut()
        window.location.href = '/'
    }
}
