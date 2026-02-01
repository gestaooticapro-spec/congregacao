
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
    const searchName = 'Luiz'

    console.log(`Searching for member: ${searchName}...`)

    // 1. Find the member
    const { data: members, error: searchError } = await supabase
        .from('membros')
        .select('*')
        .ilike('nome_completo', `%${searchName}%`)

    if (searchError) {
        console.error('Error searching member:', searchError)
        return
    }

    if (!members || members.length === 0) {
        console.error('Member not found.')
        return
    }

    if (members.length > 1) {
        console.error('Found multiple members. Please be more specific:', members.map(m => m.nome_completo))
        return
    }

    const member = members[0]
    console.log(`Found member: ${member.nome_completo} (ID: ${member.id})`)

    // 2. Check existing roles
    const { data: roles, error: rolesError } = await supabase
        .from('membro_perfis')
        .select('*')
        .eq('membro_id', member.id)

    if (rolesError) {
        console.error('Error fetching roles:', rolesError)
        return
    }

    const currentRoles = roles.map(r => r.perfil)
    console.log('Current roles:', currentRoles)

    if (currentRoles.includes('RT')) {
        console.log('Member already has RT role. Nothing to do.')
        return
    }

    // 3. Add RT role
    console.log('Adding RT role...')
    const { error: insertError } = await supabase
        .from('membro_perfis')
        .insert({
            membro_id: member.id,
            perfil: 'RT'
        })

    if (insertError) {
        console.error('Error adding role:', insertError)
        return
    }

    console.log('Success! RT role added to', member.nome_completo)
}

main().catch(console.error)
