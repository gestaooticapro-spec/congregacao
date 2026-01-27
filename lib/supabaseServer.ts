import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

export const createAdminClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined')
    }

    return createClient<Database>(supabaseUrl, supabaseKey)
}
