
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log('Checking members with user_ids...')
    const { data: membros, error } = await supabase
        .from('membros')
        .select('id, nome_completo, user_id')
        .not('user_id', 'is', null)

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('Members with user_ids:', membros)
}

check()
