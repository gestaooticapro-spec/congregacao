import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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

export function createClient() {
    return createSupabaseClient<Database>(
        supabaseUrl || '',
        supabaseAnonKey || '',
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    )
}

export const supabase = createClient()

