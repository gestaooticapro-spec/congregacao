
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log('Checking membro_perfis...')
    const { data, error } = await supabase
        .from('membro_perfis')
        .select('membro_id, perfil, membros(nome_completo)')
        .limit(20)

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('Assignments:', JSON.stringify(data, null, 2))
}

check()
