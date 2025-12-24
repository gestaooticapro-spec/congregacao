
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMembrosAccess() {
    console.log('Attempting to fetch membros as anon...')
    const { data, error } = await supabase
        .from('membros')
        .select('nome_completo')
        .limit(5)

    if (error) {
        console.error('Error fetching membros:', error)
    } else {
        console.log('Successfully fetched membros:', data)
    }
}

checkMembrosAccess()
