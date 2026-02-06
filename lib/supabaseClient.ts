import { createBrowserClient } from '@supabase/ssr'
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
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'defined' : 'MISSING')
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'defined' : 'MISSING')
}

export function createClient() {
    return createBrowserClient<Database>(
        supabaseUrl || '',
        supabaseAnonKey || ''
    )
}

export const supabase = createClient()
