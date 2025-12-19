import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('❌ ERRO CRÍTICO: As chaves do Supabase não foram encontradas. Verifique o arquivo .env.local')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)