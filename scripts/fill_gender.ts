import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath))
    for (const k in envConfig) {
        process.env[k] = envConfig[k]
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials. Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

async function fillGender() {
    console.log('Fetching members...')
    const { data: membros, error } = await supabase.from('membros').select('*')

    if (error) {
        console.error('Error fetching members:', error)
        return
    }

    console.log(`Found ${membros.length} members. Processing...`)

    let updatedCount = 0

    for (const membro of membros) {
        let genero: 'M' | 'F' | null = null

        // 1. Check Privileges (Strong indicator for Male)
        if (
            membro.is_anciao ||
            membro.is_servo_ministerial ||
            membro.is_presidente ||
            membro.is_leitor_biblia ||
            membro.is_leitor_sentinela ||
            membro.is_som ||
            membro.is_microfone ||
            membro.is_indicador ||
            membro.is_balcao ||
            membro.is_leitor_estudo_biblico ||
            membro.is_dirigente_campo // Usually men lead field service groups? Or just the general "Dirigente de Campo"? In some places sisters can lead if no brother is present, but the "privilege" usually implies a brother. Let's be safe and assume M if unsure, or skip.
            // Actually, let's stick to the sure ones.
        ) {
            genero = 'M'
        }

        // 2. Name Heuristic (If not determined by privilege)
        if (!genero) {
            const firstName = membro.nome_completo.split(' ')[0].toLowerCase()

            // Common endings for Portuguese names
            if (firstName.endsWith('o') || firstName.endsWith('os') || firstName.endsWith('or') || firstName.endsWith('on') || firstName.endsWith('el') || firstName.endsWith('é') || firstName.endsWith('u') || firstName.endsWith('i')) {
                genero = 'M'
            } else if (firstName.endsWith('a') || firstName.endsWith('as') || firstName.endsWith('iz') || firstName.endsWith('e')) {
                // 'e' is tricky (Felipe vs Alice). 'iz' (Luiz vs Beatriz - wait Beatriz ends in z).
                // Let's refine.
                if (firstName.endsWith('a') || firstName.endsWith('as')) {
                    genero = 'F'
                }
            }

            // Common exceptions or specific checks could be added here
            const maleNames = ['lucas', 'mateus', 'marcos', 'davi', 'daniel', 'samuel', 'gabriel', 'rafael', 'miguel', 'arthur', 'felipe', 'guilherme', 'pedro', 'thiago', 'andre', 'luiz', 'alexandre', 'fagner', 'juarez']
            const femaleNames = ['alice', 'beatriz', 'raquel', 'ester', 'rute', 'noemi', 'sarah', 'rebeca', 'isabel', 'miriam', 'kelly', 'sueli', 'marli', 'roseli']

            if (maleNames.includes(firstName)) genero = 'M'
            if (femaleNames.includes(firstName)) genero = 'F'
        }

        if (genero && membro.genero !== genero) {
            console.log(`Updating ${membro.nome_completo} to ${genero}`)
            const { error: updateError } = await supabase
                .from('membros')
                .update({ genero })
                .eq('id', membro.id)

            if (updateError) {
                console.error(`Error updating ${membro.nome_completo}:`, updateError)
            } else {
                updatedCount++
            }
        }
    }

    console.log(`Finished. Updated ${updatedCount} members.`)
}

fillGender()
