import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Range configuration
const RANGE_START = 1
const RANGE_END = 500

function generatePIN(num: number): string {
    return num.toString().padStart(4, '0')
}

async function reassignPins() {
    console.log(`--- Re-assigning PINs in range ${generatePIN(RANGE_START)} - ${generatePIN(RANGE_END)} ---`)

    // 1. Fetch all active members
    const { data: members, error: fetchError } = await supabase
        .from('membros')
        .select('id, nome_completo, pin')
        .eq('ativo', true)

    if (fetchError) {
        console.error('Error fetching members:', fetchError)
        return
    }

    console.log(`Found ${members.length} active members.`)

    if (members.length > (RANGE_END - RANGE_START + 1)) {
        console.error('Error: Range is too small for the number of members!')
        return
    }

    // 2. Generate unique PINs
    const availablePins: number[] = []
    for (let i = RANGE_START; i <= RANGE_END; i++) {
        availablePins.push(i)
    }

    // Shuffle available pins (Fisher-Yates)
    for (let i = availablePins.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availablePins[i], availablePins[j]] = [availablePins[j], availablePins[i]]
    }

    console.log('Updating members...')

    for (let i = 0; i < members.length; i++) {
        const member = members[i]
        const newPin = generatePIN(availablePins[i])

        const { error: updateError } = await supabase
            .from('membros')
            .update({ pin: newPin })
            .eq('id', member.id)

        if (updateError) {
            console.error(`Error updating member ${member.nome_completo}:`, updateError)
        } else {
            console.log(`[${i + 1}/${members.length}] Updated ${member.nome_completo}: ${member.pin || 'NEW'} -> ${newPin}`)
        }
    }

    console.log('\n✅ All PINs re-assigned successfully!')
}

reassignPins()
