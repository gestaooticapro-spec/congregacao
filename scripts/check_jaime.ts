
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    console.log('Checking with Anon Key...')

    // Try to select just one row with nome_civil to see if column exists
    const { data, error } = await supabase
        .from('membros')
        .select('nome_civil')
        .limit(1)

    if (error) {
        console.error('Error selecting nome_civil:', error)
        if (error.message.includes('does not exist')) {
            console.log('CONCLUSION: Column nome_civil likely does not exist.')
        }
    } else {
        console.log('Column nome_civil exists. Data sample:', data)
    }

    // Also check if we can search for Jaime
    const { data: searchData, error: searchError } = await supabase
        .from('membros')
        .select('nome_completo')
        .ilike('nome_completo', '%Jaime%')

    if (searchError) {
        console.error('Search error:', searchError)
    } else {
        console.log('Search result for Jaime (simple):', searchData)
    }
}

check()
