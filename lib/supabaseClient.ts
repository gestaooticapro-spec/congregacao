import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const DEFAULT_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_SUPABASE_TIMEOUT_MS || '15000')

// Log environment status on module load
if (typeof window !== 'undefined') {
    console.log('[SupabaseClient] Environment check:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey,
        urlPrefix: supabaseUrl?.substring(0, 30) + '...'
    })
}

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[SupabaseClient] Missing environment variables!')
}

const fetchWithTimeout: typeof fetch = async (input, init = {}) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
    const signal = init.signal

    if (signal) {
        if (signal.aborted) {
            controller.abort()
        } else {
            signal.addEventListener('abort', () => controller.abort(), { once: true })
        }
    }

    try {
        return await fetch(input, { ...init, signal: controller.signal })
    } finally {
        clearTimeout(timeoutId)
    }
}

export function createClient() {
    return createBrowserClient<Database>(
        supabaseUrl || '',
        supabaseAnonKey || '',
        {
            global: {
                fetch: fetchWithTimeout,
            },
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    )
}

export const supabase = createClient()

