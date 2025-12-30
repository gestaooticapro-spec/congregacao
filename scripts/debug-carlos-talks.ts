
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugCarlos() {
    console.log('--- Searching for members named "Carlos" ---')
    const { data: members, error: memberError } = await supabase
        .from('membros')
        .select('id, nome_completo')
        .ilike('nome_completo', '%Carlos%')

    if (memberError) {
        console.error('Error fetching members:', memberError)
        return
    }

    console.log(`Found ${members.length} members:`)
    members.forEach(m => console.log(`- [${m.id}] ${m.nome_completo}`))

    for (const member of members) {
        console.log(`\nChecking talks for ${member.nome_completo} (${member.id})...`)

        // 1. Local Talks
        const { data: localTalks, error: localError } = await supabase
            .from('agenda_discursos_locais')
            .select('id, data, orador_local_id, orador_visitante_id, tema_id')
            .or(`orador_local_id.eq.${member.id},orador_visitante_id.eq.${member.id}`)

        if (localError) console.error('Error fetching local talks:', localError)
        else {
            if (localTalks.length > 0) {
                console.log('  Local Talks:')
                localTalks.forEach(t => console.log(`    - Date: ${t.data} | Local ID: ${t.orador_local_id} | Visitor ID: ${t.orador_visitante_id} | Tema ID: ${t.tema_id}`))
            } else {
                console.log('  No local talks found.')
            }
        }

        // 2. Away Talks
        const { data: awayTalks, error: awayError } = await supabase
            .from('agenda_discursos_fora')
            .select('id, data, orador_id, tema_id')
            .eq('orador_id', member.id)

        if (awayError) console.error('Error fetching away talks:', awayError)
        else {
            if (awayTalks.length > 0) {
                console.log('  Away Talks:')
                awayTalks.forEach(t => console.log(`    - Date: ${t.data} | Orador ID: ${t.orador_id} | Tema ID: ${t.tema_id}`))
            } else {
                console.log('  No away talks found.')
            }
        }

        // 3. Simulate HomeMemberSearch Query
        const hoje = new Date().toISOString().split('T')[0]
        console.log('Hoje (UTC):', hoje)

        const { data: simulatedLocais, error: simError } = await supabase
            .from('agenda_discursos_locais')
            .select('data, tema:temas(titulo)')
            .eq('orador_local_id', member.id)
            .gte('data', hoje)
            .order('data')

        if (simError) console.error('Error simulating query:', simError)
        else {
            console.log('Simulated Query Result:', JSON.stringify(simulatedLocais, null, 2))
        }

        // 4. Check Programacao Semanal
        console.log('\nChecking Programacao Semanal for 2026-01-10...')
        const { data: prog, error: progError } = await supabase
            .from('programacao_semanal')
            .select('*')
            .eq('data_reuniao', '2026-01-10')

        if (progError) console.error('Error fetching programacao:', progError)
        else {
            console.log('Programacao:', JSON.stringify(prog, null, 2))
        }
    }
}

debugCarlos()
