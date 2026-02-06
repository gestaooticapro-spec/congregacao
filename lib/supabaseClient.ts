import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const DEFAULT_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_SUPABASE_TIMEOUT_MS || '15000')

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('AVISO: As chaves do Supabase nao foram encontradas. Isso pode causar erros em tempo de execucao.')
}

const fetchWithTimeout: typeof fetch = async (input, init = {}) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
    const signal = init?.signal

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

export const supabase = createBrowserClient<Database>(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder',
    {
        global: {
            fetch: fetchWithTimeout,
        },
    }
)
