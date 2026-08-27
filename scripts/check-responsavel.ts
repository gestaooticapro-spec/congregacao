
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

async function checkTerritories() {
    const { data, error } = await supabase
        .from('territorios')
        .select('id, nome, responsavel_id, responsavel:membros(nome_completo)')
        .not('responsavel_id', 'is', null)

    if (error) {
        console.error('Error:', error)
    } else {
        console.log('Territories with responsible:', JSON.stringify(data, null, 2))

        // Also check count of all territories
        const { count } = await supabase.from('territorios').select('*', { count: 'exact', head: true })
        console.log('Total territories:', count)
    }
}

checkTerritories()
